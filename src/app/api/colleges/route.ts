import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import College from '@/models/College';

export async function GET() {
  try {
    await dbConnect();
    const colleges = await College.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: colleges });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch colleges' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, code, address, contactEmail, contactPhone } = body;

    if (!name || !code || !address || !contactEmail || !contactPhone) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    const existingCollege = await College.findOne({
      $or: [{ name }, { code }]
    });

    if (existingCollege) {
      return NextResponse.json(
        { success: false, error: 'College with this name or code already exists' },
        { status: 400 }
      );
    }

    const college = await College.create({
      name,
      code: code.toUpperCase(),
      address,
      contactEmail: contactEmail.toLowerCase(),
      contactPhone
    });

    return NextResponse.json({ success: true, data: college }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create college' },
      { status: 500 }
    );
  }
}
