import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Team from '@/models/Team';
import School from '@/models/School';
import Group from '@/models/Group'; // 👈 add this if you have a Group model

export async function GET() {
  try {
    await dbConnect();
    const teams = await Team.find({})
      .lean() // Use lean for better performance
      .populate({
        path: 'school',
        model: School,
        select: 'name code',
        options: { lean: true }
      })
      .populate({
        path: 'groupId',
        model: Group,
        select: 'name stage',
        options: { lean: true }
      })
      .select('name school groupId members totalScore currentStage createdAt')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: teams });
  } catch (error) {
    console.log(error);
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
    const { name, school, members } = body;

    if (!name || !school) {
      return NextResponse.json(
        { success: false, error: 'Team name and school are required' },
        { status: 400 }
      );
    }

    // Initialize members array if not provided
    const teamMembers = members || [];

    // Validate school exists
    const schoolExists = await School.findById(school).lean().select('_id');
    if (!schoolExists) {
      return NextResponse.json(
        { success: false, error: 'School not found' },
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
      school,
      members: teamMembers
    });

    const populatedTeam = await Team.findById(team._id)
      .lean()
      .populate({
        path: 'school',
        select: 'name code',
        options: { lean: true }
      });

    return NextResponse.json({ success: true, data: populatedTeam }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
