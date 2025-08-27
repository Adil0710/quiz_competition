import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Competition from '@/models/Competition';
import Team from '@/models/Team';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    // Find the competition and populate teams
    const competition = await Competition.findById(id).populate({
      path: 'groups.teams',
      model: 'Team'
    });

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    if (competition.currentStage !== 'semi_final') {
      return NextResponse.json({ error: 'Competition must be in semi-final stage' }, { status: 400 });
    }

    // Get all teams from semifinal groups
    const allTeams = competition.groups.reduce((teams: any[], group: any) => {
      return teams.concat(group.teams);
    }, []);

    if (allTeams.length < 3) {
      return NextResponse.json({ error: 'Need at least 3 teams for final' }, { status: 400 });
    }

    // Sort teams by totalScore and get top 3
    const topTeams = allTeams
      .sort((a: any, b: any) => (b.totalScore || 0) - (a.totalScore || 0))
      .slice(0, 3);

    // Reset scores for final phase
    await Team.updateMany(
      { _id: { $in: topTeams.map((t: any) => t._id) } },
      { $set: { totalScore: 0 } }
    );

    // Create final group with top 3 teams
    const finalGroup = {
      name: "Final Group",
      teams: topTeams.map((t: any) => t._id)
    };

    // Update competition
    competition.groups = [finalGroup];
    competition.currentStage = 'final';
    competition.currentPhase = 'final';
    await competition.save();

    return NextResponse.json({
      success: true,
      topTeams: topTeams.map((t: any) => ({
        _id: t._id,
        name: t.name,
        school: t.school,
        totalScore: 0
      })),
      finalGroup
    });

  } catch (error) {
    console.error('Error advancing to final:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
