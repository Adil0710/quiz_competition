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

    const competition = await Competition.findById(id).populate({
      path: 'groups',
      populate: {
        path: 'teams',
        model: 'Team'
      }
    });
    if (!competition) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Import Team model
    const Team = (await import('@/models/Team')).default;

    // Get all team IDs from all groups in the competition
    const allTeamIds: string[] = [];
    
    if (competition.groups && competition.groups.length > 0) {
      competition.groups.forEach((group: any) => {
        if (group.teams && group.teams.length > 0) {
          group.teams.forEach((team: any) => {
            const teamId = team._id ? team._id.toString() : team.toString();
            allTeamIds.push(teamId);
          });
        }
      });
    }

    console.log('Found team IDs to reset:', allTeamIds);

    // Reset totalScore to 0 for all teams in this competition
    if (allTeamIds.length > 0) {
      const result = await Team.updateMany(
        { _id: { $in: allTeamIds } },
        { $set: { totalScore: 0 } }
      );
      console.log('Reset result:', result);
    }

    // Also reset the competition-scoped teamScores for backward compatibility
    competition.teamScores = [] as any;
    await competition.save();

    return NextResponse.json({ 
      success: true, 
      message: `Reset scores for ${allTeamIds.length} teams` 
    });
  } catch (error) {
    console.error('Error resetting scores:', error);
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
