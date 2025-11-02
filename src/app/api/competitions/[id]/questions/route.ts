import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Competition from "@/models/Competition";
import Question from "@/models/Question";
import mongoose from "mongoose";

// GET /api/competitions/[id]/questions?type=mcq&phase=league&count=6
// Returns up to `count` questions of `type` and `phase` that have not been used in this competition yet.
// Also marks the returned questions as used for this competition, and records them in the competition.usedQuestions list.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Correct type definition
): Promise<NextResponse> {
  try {
    await dbConnect();

    const {id} = await params

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const phase = searchParams.get("phase");
    const countParam = searchParams.get("count");
    const count = Math.max(
      1,
      Math.min(20, parseInt(countParam || "6", 10) || 6)
    );

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Query param "type" is required' },
        { status: 400 }
      );
    }

    if (!phase) {
      return NextResponse.json(
        { success: false, error: 'Query param "phase" is required' },
        { status: 400 }
      );
    }

    const competitionId = id;
    if (!mongoose.Types.ObjectId.isValid(competitionId)) {
      return NextResponse.json(
        { success: false, error: "Invalid competition id" },
        { status: 400 }
      );
    }

    const competition = await Competition.findById(competitionId).select('_id').lean();
    if (!competition) {
      return NextResponse.json(
        { success: false, error: "Competition not found" },
        { status: 404 }
      );
    }

    // Find questions by type and phase that have NOT been used globally
    // Priority: 1) Globally unused 2) Not used in this competition 3) Used but need more questions
    // Special handling for tie_breaker: load buzzer questions from any phase
    const baseQuery: any = { type };
    
    // For tie_breaker phase, we load questions from any phase (don't filter by phase)
    // For regular phases, filter by the specified phase
    if (phase !== 'tie_breaker') {
      baseQuery.phase = phase;
    }
    
    // Try to get globally unused questions first
    let available = await Question.aggregate([
      { 
        $match: { 
          ...baseQuery,
          isUsed: false,
          usedInCompetitions: {
            $ne: new mongoose.Types.ObjectId(competitionId),
          },
        } 
      },
      { $sample: { size: count } },
    ]);
    
    // If not enough globally unused, get questions not used in this competition
    if (available.length < count) {
      const remaining = count - available.length;
      const additionalQuestions = await Question.aggregate([
        { 
          $match: { 
            ...baseQuery,
            usedInCompetitions: {
              $ne: new mongoose.Types.ObjectId(competitionId),
            },
            _id: { $nin: available.map(q => q._id) } // Exclude already selected
          } 
        },
        { $sample: { size: remaining } },
      ]);
      available = [...available, ...additionalQuestions];
    }

    console.log(`Found ${available.length} questions for type: ${type}, phase: ${phase}`);
    
    if (!available || available.length === 0) {
      // Try without competition filter to see if questions exist at all
      const allQuestions = await Question.find({ type, phase })
        .select('question type options correctAnswer mediaUrl mediaType imageUrls difficulty category points phase')
        .limit(count)
        .lean();
      console.log(`Total questions in DB for type ${type}, phase ${phase}:`, allQuestions.length);
      
      if (allQuestions.length > 0) {
        console.log('Questions exist but all are marked as used for this competition');
        // Return some questions anyway for testing
        return NextResponse.json({ success: true, data: allQuestions });
      }
      
      return NextResponse.json({ success: true, data: [] });
    }

    const questionIds = available.map((q: any) => q._id);

    // Update competition.usedQuestions (avoid duplicates)
    await Competition.updateOne(
      { _id: competitionId },
      { $addToSet: { usedQuestions: { $each: questionIds } } }
    );

    // Mark questions as used for this competition AND set global isUsed flag
    await Question.updateMany(
      { _id: { $in: questionIds } },
      {
        $set: { isUsed: true },
        $addToSet: {
          usedInCompetitions: new mongoose.Types.ObjectId(competitionId),
        },
      }
    );

    return NextResponse.json({ success: true, data: available });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch questions for competition" },
      { status: 500 }
    );
  }
}

// POST /api/competitions/[id]/questions
// Body: { type?: 'mcq' | 'media' | 'rapid_fire' }
// Clears usage flags for this competition: pulls competitionId from Question.usedInCompetitions
// and removes those questionIds from Competition.usedQuestions. If type is provided, only for that type.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid competition id' },
        { status: 400 }
      );
    }

    const competitionId = new mongoose.Types.ObjectId(id);
    const body = await request.json().catch(() => ({}));
    const type = body?.type as 'mcq' | 'media' | 'rapid_fire' | undefined;

    // Find affected questions first (those that currently mark this competition as used)
    const questionFilter: any = {
      usedInCompetitions: competitionId,
    };
    if (type) questionFilter.type = type;

    const affected = await Question.find(questionFilter).select('_id').lean();
    const affectedIds = affected.map((q) => q._id);

    if (affectedIds.length === 0) {
      return NextResponse.json({ success: true, data: { updated: 0, removed: 0 } });
    }

    // Pull competition from questions
    await Question.updateMany(
      { _id: { $in: affectedIds } },
      { $pull: { usedInCompetitions: competitionId } }
    );

    // Remove those ids from competition.usedQuestions
    await Competition.updateOne(
      { _id: competitionId },
      { $pull: { usedQuestions: { $in: affectedIds } } }
    );

    return NextResponse.json({ success: true, data: { updated: affectedIds.length, removed: affectedIds.length } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to reset question usage' },
      { status: 500 }
    );
  }
}
