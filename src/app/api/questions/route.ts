import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
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
    const correctAnswerRaw = formData.get('correctAnswer') as string;
    const phaseRaw = (formData.get('phase') as string) || 'league';
    const mediaFile = formData.get('mediaFile') as File;
    const mediaType = formData.get('mediaType') as string;
    const imageUrlsRaw = formData.get('imageUrls') as string | null;

    // Question is optional for visual_rapid_fire
    if (!type || !category) {
      return NextResponse.json(
        { success: false, error: 'Type and category are required' },
        { status: 400 }
      );
    }
    
    if (type !== 'visual_rapid_fire' && !question) {
      return NextResponse.json(
        { success: false, error: 'Question is required for this type' },
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

    // Normalize phase
    const phase = ['league', 'semi_final', 'final'].includes(phaseRaw) ? phaseRaw : 'league';

    const questionData: any = {
      type,
      category,
      difficulty: difficulty || 'medium',
      points,
      phase,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaUrl ? mediaType : undefined
    };

    // Only add question field if it exists (optional for visual_rapid_fire)
    if (question) {
      questionData.question = question;
    }

    if (type === 'mcq') {
      questionData.options = options;
      // keep whatever was sent as the correct option text or index encoded as string
      questionData.correctAnswer = correctAnswerRaw ?? undefined;
    } else if (type === 'buzzer') {
      questionData.options = options;
      // Store correctAnswer as string (the option text)
      questionData.correctAnswer = correctAnswerRaw ?? undefined;
    } else if (type === 'media') {
      // free-text answer for media type
      questionData.correctAnswer = correctAnswerRaw ?? undefined;
    } else if (type === 'sequence') {
      // expect options array and correct sequence as either JSON array or comma string
      questionData.options = options;
      let parsed: number[] | null = null;
      if (correctAnswerRaw) {
        try {
          const maybe = JSON.parse(correctAnswerRaw);
          if (Array.isArray(maybe) && maybe.every((n) => Number.isInteger(n))) {
            parsed = maybe;
          }
        } catch {}
        if (!parsed) {
          const parts = String(correctAnswerRaw)
            .split(',')
            .map((s) => Number(String(s).trim()));
          if (
            parts.length > 0 &&
            parts.every((n) => Number.isInteger(n) && n >= 1 && n <= options.length)
          ) {
            parsed = parts.map((n) => n - 1);
          }
        }
      }
      questionData.correctAnswer = parsed ?? undefined;
    } else if (type === 'visual_rapid_fire') {
      // Visual Rapid Fire: accept array of image URLs
      if (imageUrlsRaw) {
        try {
          const parsed = JSON.parse(imageUrlsRaw);
          if (Array.isArray(parsed) && parsed.every((u) => typeof u === 'string')) {
            questionData.imageUrls = parsed;
          }
        } catch {}
      }
    } else if (type === 'rapid_fire') {
      // Rapid fire no additional fields
    }

    const newQuestion = await Question.create(questionData);
    // Return lean version for consistency
    const leanQuestion = await Question.findById(newQuestion._id)
      .select('question type options correctAnswer mediaUrl mediaType imageUrls difficulty category points phase isUsed')
      .lean();
    return NextResponse.json({ success: true, data: newQuestion }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create question:', error);
    console.error('Error details:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create question' },
      { status: 500 }
    );
  }
}
