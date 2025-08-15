import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Team from '@/models/Team';
import College from '@/models/College';

export async function GET() {
  try {
    await dbConnect();
    const teams = await Team.find({})
      .populate('college', 'name code')
      .populate('groupId', 'name stage')
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: teams });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, college, members } = body;

    if (!name || !college) {
      return NextResponse.json(
        { success: false, error: 'Team name and college are required' },
        { status: 400 }
      );
    }

    // Initialize members array if not provided
    const teamMembers = members || [];

    // Validate college exists
    const collegeExists = await College.findById(college);
    if (!collegeExists) {
      return NextResponse.json(
        { success: false, error: 'College not found' },
        { status: 400 }
      );
    }

    // Ensure at least one captain exists if members are provided
    if (teamMembers.length > 0) {
      const hasCaptain = teamMembers.some((member: any) => member.role === 'captain');
      if (!hasCaptain) {
        teamMembers[0].role = 'captain'; // Make first member captain if none exists
      }
    }

    const team = await Team.create({
      name,
      college,
      members: teamMembers
    });

    const populatedTeam = await Team.findById(team._id)
      .populate('college', 'name code');

    return NextResponse.json({ success: true, data: populatedTeam }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
