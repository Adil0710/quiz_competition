import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Team from '@/models/Team';
import College from '@/models/College';
import mongoose from 'mongoose';

export async function GET(
request: Request,
{ params }: { params: Promise<{ id: string }> } // Correct type definition
): Promise<NextResponse> {
  try {
     const {id} = await params
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid team ID' },
        { status: 400 }
      );
    }

    const team = await Team.findById(id)
      .populate('college', 'name code')
      .populate('groupId', 'name stage');
    
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: team });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

export async function PUT(
request: Request,
{ params }: { params: Promise<{ id: string }> } // Correct type definition
): Promise<NextResponse> {
  try {
     const {id} = await params
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid team ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, college, members, totalScore, currentStage } = body;

    // Validate college exists if provided
    if (college) {
      const collegeExists = await College.findById(college);
      if (!collegeExists) {
        return NextResponse.json(
          { success: false, error: 'College not found' },
          { status: 400 }
        );
      }
    }

    // Validate members structure if provided
    if (members && members.length > 0) {
      const hasCaptain = members.some((member: any) => member.role === 'captain');
      if (!hasCaptain) {
        return NextResponse.json(
          { success: false, error: 'Team must have at least one captain' },
          { status: 400 }
        );
      }
    }

    const team = await Team.findByIdAndUpdate(
      id,
      { name, college, members, totalScore, currentStage },
      { new: true, runValidators: true }
    ).populate('college', 'name code').populate('groupId', 'name stage');

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: team });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

export async function DELETE(
request: Request,
{ params }: { params: Promise<{ id: string }> } // Correct type definition
): Promise<NextResponse> {
  try {
     const {id} = await params
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid team ID' },
        { status: 400 }
      );
    }

    const team = await Team.findByIdAndDelete(id);

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
