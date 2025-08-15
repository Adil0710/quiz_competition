import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Competition from '@/models/Competition';
import Group from '@/models/Group';
import Team from '@/models/Team';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
     const {id} = await params
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid competition ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { mode, customGroups } = body; // mode: 'auto' or 'manual'

    const competition = await Competition.findById(params.id).populate('teams');
    if (!competition) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    if (competition.teams.length !== 18) {
      return NextResponse.json(
        { success: false, error: 'Competition must have exactly 18 teams' },
        { status: 400 }
      );
    }

    // Delete existing groups if any
    await Group.deleteMany({ competition: params.id });

    let groups;
    if (mode === 'auto') {
      // Automatic group creation - shuffle teams and create 6 groups of 3
      const shuffledTeams = [...competition.teams].sort(() => Math.random() - 0.5);
      groups = [];

      for (let i = 0; i < 6; i++) {
        const groupTeams = shuffledTeams.slice(i * 3, (i + 1) * 3);
        const group = await Group.create({
          name: `Group ${String.fromCharCode(65 + i)}`, // A, B, C, D, E, F
          stage: 'group',
          teams: groupTeams.map((team: any) => team._id),
          competition: params.id,
          maxRounds: 3
        });
        groups.push(group);

        // Update teams with group assignment
        await Team.updateMany(
          { _id: { $in: groupTeams.map((team: any) => team._id) } },
          { groupId: group._id }
        );
      }
    } else if (mode === 'manual' && customGroups) {
      // Manual group creation
      groups = [];
      for (let i = 0; i < customGroups.length; i++) {
        const groupData = customGroups[i];
        if (groupData.teams.length !== 3) {
          return NextResponse.json(
            { success: false, error: `Group ${i + 1} must have exactly 3 teams` },
            { status: 400 }
          );
        }

        const group = await Group.create({
          name: groupData.name || `Group ${String.fromCharCode(65 + i)}`,
          stage: 'group',
          teams: groupData.teams,
          competition: params.id,
          maxRounds: 3
        });
        groups.push(group);

        // Update teams with group assignment
        await Team.updateMany(
          { _id: { $in: groupData.teams } },
          { groupId: group._id }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid mode or missing custom groups data' },
        { status: 400 }
      );
    }

    // Update competition with groups
    await Competition.findByIdAndUpdate(params.id, {
      groups: groups.map(group => group._id),
      status: 'ongoing'
    });

    const populatedGroups = await Group.find({ competition: params.id })
      .populate({
        path: 'teams',
        populate: {
          path: 'college',
          select: 'name code'
        }
      });

    return NextResponse.json({ 
      success: true, 
      data: populatedGroups,
      message: 'Groups created successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create groups' },
      { status: 500 }
    );
  }
}
