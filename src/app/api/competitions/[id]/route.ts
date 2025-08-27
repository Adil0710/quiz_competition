import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Competition from '@/models/Competition';
import mongoose, { model } from 'mongoose';
import Group from '@/models/Group';
import School from '@/models/School';
import Team from '@/models/Team';

// Ensure the Group model is registered (prevent tree-shaking of unused import)
void Group;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Correct type definition
): Promise<NextResponse> {
  try {
    const { id } = await params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid competition ID' },
        { status: 400 }
      );
    }

    const competition = await Competition.findById(id)
      .select('name description startDate status currentPhase teams groups createdAt')
      .populate({
        path: 'teams',
        model: Team,
        select: 'name school members totalScore currentStage',
        populate: {
          path: 'school',
          model: School,
          select: 'name code'
        }
      })
      .populate({
        path: 'groups',
        select: 'name stage teams',
        populate: {
          path: 'teams',
          select: 'name school totalScore',
          populate: {
            path: 'school',
            select: 'name code'
          }
        }
      })
      .lean();

    if (!competition) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: competition });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch competition' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid competition ID' },
        { status: 400 }
      );
    }

    const deleted = await Competition.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Competition deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete competition' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
 { params }: { params: Promise<{ id: string }> } // Correct type definition
): Promise<NextResponse> {
  try {
    const { id } = await params;
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid competition ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, status, currentStage, endDate } = body;

    const competition = await Competition.findByIdAndUpdate(
      id,
      { name, description, status, currentStage, endDate },
      { new: true, runValidators: true }
    )
      .select('name description startDate status currentPhase teams groups')
      .populate({
        path: 'teams',
        select: 'name school totalScore',
        populate: {
          path: 'school',
          select: 'name code'
        }
      })
      .lean();

    if (!competition) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: competition });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update competition' },
      { status: 500 }
    );
  }
}
