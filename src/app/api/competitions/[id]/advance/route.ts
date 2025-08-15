import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Competition from '@/models/Competition';
import Group from '@/models/Group';
import Team from '@/models/Team';
import mongoose from 'mongoose';

export async function POST(
request: Request,
{ params }: { params: Promise<{ id: string }> } // Correct type definition
): Promise<NextResponse> {
  try {
     const {id} = await params
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid competition ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { stage, winningTeams } = body; // stage: 'semi_final' or 'final'

    const competition = await Competition.findById(id);
    if (!competition) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    if (stage === 'semi_final') {
      // Advance from group stage to semi-final
      if (winningTeams.length !== 6) {
        return NextResponse.json(
          { success: false, error: 'Must have exactly 6 winning teams for semi-final' },
          { status: 400 }
        );
      }

      // Create 2 semi-final groups with 3 teams each
      const shuffledWinners = [...winningTeams].sort(() => Math.random() - 0.5);
      
      // Delete existing semi-final groups
      await Group.deleteMany({ competition: id, stage: 'semi_final' });

      const semiGroups = [];
      for (let i = 0; i < 2; i++) {
        const groupTeams = shuffledWinners.slice(i * 3, (i + 1) * 3);
        const group = await Group.create({
          name: `Semi-Final ${i + 1}`,
          stage: 'semi_final',
          teams: groupTeams,
          competition: id,
          maxRounds: 3
        });
        semiGroups.push(group);

        // Update teams
        await Team.updateMany(
          { _id: { $in: groupTeams } },
          { currentStage: 'semi_final', groupId: group._id }
        );
      }

      // Mark eliminated teams
      const eliminatedTeams = competition.teams.filter(
        (teamId: any) => !winningTeams.includes(teamId.toString())
      );
      await Team.updateMany(
        { _id: { $in: eliminatedTeams } },
        { currentStage: 'eliminated' }
      );

      // Update competition
      await Competition.findByIdAndUpdate(id, {
        currentStage: 'semi_final',
        $push: { groups: { $each: semiGroups.map(g => g._id) } }
      });

      return NextResponse.json({
        success: true,
        message: 'Teams advanced to semi-final stage',
        data: { stage: 'semi_final', groups: semiGroups.length }
      });

    } else if (stage === 'final') {
      // Advance from semi-final to final
      if (winningTeams.length !== 2) {
        return NextResponse.json(
          { success: false, error: 'Must have exactly 2 winning teams for final' },
          { status: 400 }
        );
      }

      // Delete existing final group
      await Group.deleteMany({ competition: id, stage: 'final' });

      const finalGroup = await Group.create({
        name: 'Final',
        stage: 'final',
        teams: winningTeams,
        competition: id,
        maxRounds: 4 // Final can have 4 rounds
      });

      // Update teams
      await Team.updateMany(
        { _id: { $in: winningTeams } },
        { currentStage: 'final', groupId: finalGroup._id }
      );

      // Mark eliminated teams from semi-final
      const semiTeams = await Team.find({ currentStage: 'semi_final' });
      const eliminatedFromSemi = semiTeams.filter(
        (team: any) => !winningTeams.includes(team._id.toString())
      );
      await Team.updateMany(
        { _id: { $in: eliminatedFromSemi.map(t => t._id) } },
        { currentStage: 'eliminated' }
      );

      // Update competition
      await Competition.findByIdAndUpdate(id, {
        currentStage: 'final',
        $push: { groups: finalGroup._id }
      });

      return NextResponse.json({
        success: true,
        message: 'Teams advanced to final stage',
        data: { stage: 'final', finalTeams: winningTeams.length }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid stage' },
      { status: 400 }
    );

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to advance teams' },
      { status: 500 }
    );
  }
}
