import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Competition from '@/models/Competition';
import mongoose from 'mongoose';

// POST /api/competitions/[id]/scores
// Body: { teamId: string, delta: number }

// DELETE /api/competitions/[id]/scores
// Resets competition-scoped scores for all teams in this competition
export async function DELETE(
  _request: NextRequest,
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

    const competition = await Competition.findById(id);
    if (!competition) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Reset the competition-scoped teamScores
    competition.teamScores = [] as any;
    await competition.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to reset competition scores' },
      { status: 500 }
    );
  }
}
// Increments (or initializes) the competition-scoped score for a team.
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

    const body = await request.json();
    const { teamId, delta } = body || {};

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid team id' },
        { status: 400 }
      );
    }

    const inc = Number(delta) || 0;

    // Ensure competition exists
    const competition = await Competition.findById(id);
    if (!competition) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Find existing entry
    const existing = competition.teamScores?.find((ts: any) => ts.team.toString() === teamId);
    if (existing) {
      existing.score = (existing.score || 0) + inc;
    } else {
      competition.teamScores = competition.teamScores || [] as any;
      (competition.teamScores as any).push({ team: new mongoose.Types.ObjectId(teamId), score: inc });
    }

    await competition.save();

    const updated = competition.teamScores?.find((ts: any) => ts.team.toString() === teamId);

    return NextResponse.json({
      success: true,
      data: { teamId, score: updated?.score || 0 }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update competition score' },
      { status: 500 }
    );
  }
}
