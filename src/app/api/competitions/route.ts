import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Competition from '@/models/Competition';
import Team from '@/models/Team';
import Group from '@/models/Group';

export async function GET() {
  try {
    await dbConnect();
    const competitions = await Competition.find({})
      .populate({
        path: 'teams',
        select: 'name college members totalScore currentStage',
        populate: {
          path: 'college',
          select: 'name code'
        }
      })
      .populate({
        path: 'groups',
        select: 'name stage teams',
        populate: {
          path: 'teams',
          select: 'name college',
          populate: { path: 'college', select: 'name code' }
        }
      })
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: competitions });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch competitions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, description, startDate, teams } = body;

    if (!name || !startDate) {
      return NextResponse.json(
        { success: false, error: 'Competition name and start date are required' },
        { status: 400 }
      );
    }

    if (teams && teams.length !== 18) {
      return NextResponse.json(
        { success: false, error: 'Competition must have exactly 18 teams' },
        { status: 400 }
      );
    }

    const competition = await Competition.create({
      name,
      description,
      startDate: new Date(startDate),
      teams: teams || []
    });

    const populatedCompetition = await Competition.findById(competition._id)
      .populate('teams', 'name college');

    return NextResponse.json({ success: true, data: populatedCompetition }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create competition' },
      { status: 500 }
    );
  }
}
