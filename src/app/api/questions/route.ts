import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/models/Question';
import { uploadToCloudinary } from '@/lib/cloudinary';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const unused = searchParams.get('unused');

    let filter: any = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (unused === 'true') filter.isUsed = false;

    const questions = await Question.find(filter)
      .select('question type options correctAnswer mediaUrl mediaType imageUrls difficulty category points phase isUsed')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: questions });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const formData = await request.formData();
    
    const question = formData.get('question') as string;
    const type = formData.get('type') as string;
    const category = formData.get('category') as string;
    const difficulty = formData.get('difficulty') as string;
    const points = parseInt(formData.get('points') as string) || 1;
    const options = JSON.parse(formData.get('options') as string || '[]');
    const correctAnswer = formData.get('correctAnswer') as string;
    const mediaFile = formData.get('mediaFile') as File;
    const mediaType = formData.get('mediaType') as string;

    if (!question || !type || !category) {
      return NextResponse.json(
        { success: false, error: 'Question, type, and category are required' },
        { status: 400 }
      );
    }

    let mediaUrl = '';
    if (mediaFile && mediaFile.size > 0) {
      try {
        const uploadResult: any = await uploadToCloudinary(mediaFile, 'quiz-media');
        mediaUrl = uploadResult.secure_url;
      } catch (uploadError) {
        return NextResponse.json(
          { success: false, error: 'Failed to upload media file' },
          { status: 500 }
        );
      }
    }

    const questionData: any = {
      question,
      type,
      category,
      difficulty: difficulty || 'medium',
      points,
      options: type === 'mcq' || type === 'media' ? options : undefined,
      correctAnswer: type !== 'rapid_fire' ? correctAnswer : undefined,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaUrl ? mediaType : undefined
    };

    const newQuestion = await Question.create(questionData);
    // Return lean version for consistency
    const leanQuestion = await Question.findById(newQuestion._id)
      .select('question type options correctAnswer mediaUrl mediaType imageUrls difficulty category points phase isUsed')
      .lean();
    return NextResponse.json({ success: true, data: newQuestion }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
