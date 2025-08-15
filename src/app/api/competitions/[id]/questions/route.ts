import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Competition from "@/models/Competition";
import Question from "@/models/Question";
import mongoose from "mongoose";

// GET /api/competitions/[id]/questions?type=mcq&count=6
// Returns up to `count` questions of `type` that have not been used in this competition yet.
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

    const competitionId = id;
    if (!mongoose.Types.ObjectId.isValid(competitionId)) {
      return NextResponse.json(
        { success: false, error: "Invalid competition id" },
        { status: 400 }
      );
    }

    const competition = await Competition.findById(competitionId);
    if (!competition) {
      return NextResponse.json(
        { success: false, error: "Competition not found" },
        { status: 404 }
      );
    }

    // Find questions by type that have NOT been used in this competition
    // We prioritize per-competition non-reuse using usedInCompetitions, rather than global isUsed.
    const available = await Question.aggregate([
      {
        $match: {
          type,
          usedInCompetitions: {
            $ne: new mongoose.Types.ObjectId(competitionId),
          },
        },
      },
      { $sample: { size: count } },
    ]);

    if (!available || available.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const questionIds = available.map((q: any) => q._id);

    // Update competition.usedQuestions (avoid duplicates)
    await Competition.updateOne(
      { _id: competitionId },
      { $addToSet: { usedQuestions: { $each: questionIds } } }
    );

    // Mark questions as used for this competition (do NOT set isUsed globally)
    await Question.updateMany(
      { _id: { $in: questionIds } },
      {
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
