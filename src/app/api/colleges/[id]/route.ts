import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import College from '@/models/College';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid college ID' },
        { status: 400 }
      );
    }

    const college = await College.findById(params.id);
    
    if (!college) {
      return NextResponse.json(
        { success: false, error: 'College not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: college });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch college' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid college ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, code, address, contactEmail, contactPhone } = body;

    const existingCollege = await College.findOne({
      $and: [
        { _id: { $ne: params.id } },
        { $or: [{ name }, { code }] }
      ]
    });

    if (existingCollege) {
      return NextResponse.json(
        { success: false, error: 'College with this name or code already exists' },
        { status: 400 }
      );
    }

    const college = await College.findByIdAndUpdate(
      params.id,
      {
        name,
        code: code?.toUpperCase(),
        address,
        contactEmail: contactEmail?.toLowerCase(),
        contactPhone
      },
      { new: true, runValidators: true }
    );

    if (!college) {
      return NextResponse.json(
        { success: false, error: 'College not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: college });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update college' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid college ID' },
        { status: 400 }
      );
    }

    const college = await College.findByIdAndDelete(params.id);

    if (!college) {
      return NextResponse.json(
        { success: false, error: 'College not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'College deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete college' },
      { status: 500 }
    );
  }
}
