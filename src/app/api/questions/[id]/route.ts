import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/models/Question';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
     const {id} = await params
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid question ID' },
        { status: 400 }
      );
    }

    const question = await Question.findById(params.id);
    
    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: question });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
     const {id} = await params
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid question ID' },
        { status: 400 }
      );
    }

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

    const existingQuestion = await Question.findById(params.id);
    if (!existingQuestion) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    let mediaUrl = existingQuestion.mediaUrl;
    
    if (mediaFile && mediaFile.size > 0) {
      // Delete old media if exists
      if (existingQuestion.mediaUrl) {
        try {
          const publicId = existingQuestion.mediaUrl.split('/').pop()?.split('.')[0];
          if (publicId) await deleteFromCloudinary(publicId);
        } catch (deleteError) {
          console.error('Failed to delete old media:', deleteError);
        }
      }
      
      // Upload new media
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

    const updateData: any = {
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

    const updatedQuestion = await Question.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: updatedQuestion });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
     const {id} = await params
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid question ID' },
        { status: 400 }
      );
    }

    const question = await Question.findById(params.id);
    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    // Delete media from Cloudinary if exists
    if (question.mediaUrl) {
      try {
        const publicId = question.mediaUrl.split('/').pop()?.split('.')[0];
        if (publicId) await deleteFromCloudinary(publicId);
      } catch (deleteError) {
        console.error('Failed to delete media:', deleteError);
      }
    }

    await Question.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}
