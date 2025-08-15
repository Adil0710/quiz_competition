import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Competition from '@/models/Competition';
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
        { success: false, error: 'Invalid competition ID' },
        { status: 400 }
      );
    }

    const competition = await Competition.findById(id)
      .populate({
        path: 'teams',
        populate: {
          path: 'college',
          select: 'name code'
        }
      })
      .populate({
        path: 'groups',
        populate: {
          path: 'teams',
          populate: {
            path: 'college',
            select: 'name code'
          }
        }
      });
    
    if (!competition) {
      return NextResponse.json(
        { success: false, error: 'Competition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: competition });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch competition' },
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
    ).populate({
      path: 'teams',
      populate: {
        path: 'college',
        select: 'name code'
      }
    });

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
