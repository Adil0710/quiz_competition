import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Competition from '@/models/Competition';
import Group from '@/models/Group';
import Team from '@/models/Team';
import mongoose from 'mongoose';

// POST /api/competitions/[id]/reset
// Resets a competition back to group stage:
// - Deletes all groups for this competition
// - Resets totalScore to 0 for all competition teams and clears groupId
// - Sets team.currentStage to 'group'
// - Clears competition.rounds, teamScores, usedQuestions
// - Sets competition.currentStage to 'group' and keeps status as 'ongoing'
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Collect team IDs from competition.teams plus any teams currently in groups
    const groups = await Group.find({ competition: id }).select('teams');
    const teamIdSet = new Set<string>();

    (competition.teams || []).forEach((t: any) => {
      teamIdSet.add(t.toString());
    });
    (groups || []).forEach((g: any) => {
      (g.teams || []).forEach((t: any) => teamIdSet.add(t.toString()));
    });
    const teamIds = Array.from(teamIdSet);

    // Delete all groups for this competition
    await Group.deleteMany({ competition: id });

    // Reset team scores and stage, clear groupId
    if (teamIds.length > 0) {
      await Team.updateMany(
        { _id: { $in: teamIds } },
        { $set: { totalScore: 0, currentStage: 'group' }, $unset: { groupId: '' } }
      );
    }

    // Reset competition fields
    competition.groups = [] as any;
    competition.teamScores = [] as any;
    competition.usedQuestions = [] as any;
    competition.rounds = [] as any;
    competition.currentStage = 'group';
    // Set to 'draft' so UI allows (re)creating groups
    competition.status = 'draft';
    await competition.save();

    return NextResponse.json({
      success: true,
      message: 'Competition reset to group stage. Scores cleared and groups deleted.',
      data: { competitionId: id, teamCountReset: teamIds.length }
    });
  } catch (error) {
    console.error('Error resetting competition:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset competition' },
      { status: 500 }
    );
  }
}
