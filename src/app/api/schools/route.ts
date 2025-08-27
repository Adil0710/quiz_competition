import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import School from '@/models/School';

export async function GET() {
  try {
    await dbConnect();
    const schools = await School.find({})
      .lean()
      .select('name code contactEmail contactPhone createdAt')
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: schools });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schools' },
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

    const existingSchool = await School.findOne({
      $or: [{ name }, { code }]
    }).lean().select('_id');

    if (existingSchool) {
      return NextResponse.json(
        { success: false, error: 'School with this name or code already exists' },
        { status: 400 }
      );
    }

    const school = await School.create({
      name,
      code: code.toUpperCase(),
      address,
      contactEmail: contactEmail.toLowerCase(),
      contactPhone
    });

    return NextResponse.json({ success: true, data: school }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create school' },
      { status: 500 }
    );
  }
}
