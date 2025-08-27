import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import School from '@/models/School';
import mongoose from 'mongoose';

export async function GET(
    request: NextRequest,
   { params }: { params: Promise<{ id: string }> } // Correct type definition
): Promise<NextResponse> {
    try {
      const { id } = await params;
      await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    const school = await School.findById(id);
    
    if (!school) {
      return NextResponse.json(
        { success: false, error: 'School not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: school });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch school' },
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
        { success: false, error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, code, address, contactEmail, contactPhone } = body;

    const existingCollege = await School.findOne({
      $and: [
        { _id: { $ne: id } },
        { $or: [{ name }, { code }] }
      ]
    });

    if (existingCollege) {
      return NextResponse.json(
        { success: false, error: 'School with this name or code already exists' },
        { status: 400 }
      );
    }

    const school = await School.findByIdAndUpdate(
      id,
      {
        name,
        code: code?.toUpperCase(),
        address,
        contactEmail: contactEmail?.toLowerCase(),
        contactPhone
      },
      { new: true, runValidators: true }
    );

    if (!school) {
      return NextResponse.json(
        { success: false, error: 'School not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: school });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update school' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
{ params }: { params: Promise<{ id: string }> } // Correct type definition
): Promise<NextResponse> {
  try {
    const { id } = await params;
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    const school = await School.findByIdAndDelete(id);

    if (!school) {
      return NextResponse.json(
        { success: false, error: 'School not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'School deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete school' },
      { status: 500 }
    );
  }
}
