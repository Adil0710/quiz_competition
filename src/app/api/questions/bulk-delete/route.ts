import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/models/Question';

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ 
        success: false, 
        error: 'Type parameter is required' 
      }, { status: 400 });
    }

    // Delete all questions of the specified type
    const result = await Question.deleteMany({ type });

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      type 
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete questions' },
      { status: 500 }
    );
  }
}
