import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/models/Question';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '@/lib/cloudinary';
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
        { success: false, error: 'Invalid question ID' },
        { status: 400 }
      );
    }

    const question = await Question.findById(id);
    
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
request: Request,
  { params }: { params: Promise<{ id: string }> } // Correct type definition
): Promise<NextResponse> {
  try {
     const {id} = await params
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
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
    const imageUrlsRaw = formData.get('imageUrls') as string | null;

    const existingQuestion = await Question.findById(id);
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
          const publicId = extractPublicId(existingQuestion.mediaUrl);
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

    // Handle imageUrls for visual_rapid_fire
    let imageUrls = existingQuestion.imageUrls;
    if (type === 'visual_rapid_fire' && imageUrlsRaw) {
      try {
        const parsed = JSON.parse(imageUrlsRaw);
        if (Array.isArray(parsed) && parsed.every((u: any) => typeof u === 'string')) {
          imageUrls = parsed;
        }
      } catch {}
    }

    const updateData: any = {
      question,
      type,
      category,
      difficulty: difficulty || 'medium',
      points,
      options: (type === 'mcq' || type === 'sequence' || type === 'buzzer') ? options : undefined,
      correctAnswer: (type !== 'rapid_fire' && type !== 'visual_rapid_fire') ? correctAnswer : undefined,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaUrl ? mediaType : undefined,
      imageUrls: type === 'visual_rapid_fire' ? imageUrls : undefined
    };

    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
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
request: Request,
  { params }: { params: Promise<{ id: string }> } // Correct type definition
): Promise<NextResponse> {
  try {
     const {id} = await params
    await dbConnect();
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid question ID' },
        { status: 400 }
      );
    }

    const question = await Question.findById(id);
    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      );
    }

    // Delete media from Cloudinary if exists
    if (question.mediaUrl) {
      try {
        const publicId = extractPublicId(question.mediaUrl);
        if (publicId) await deleteFromCloudinary(publicId);
      } catch (deleteError) {
        console.error('Failed to delete media:', deleteError);
      }
    }

    // Delete imageUrls from Cloudinary if exists (for visual_rapid_fire)
    if (question.imageUrls && Array.isArray(question.imageUrls)) {
      for (const imageUrl of question.imageUrls) {
        try {
          const publicId = extractPublicId(imageUrl);
          if (publicId) await deleteFromCloudinary(publicId);
        } catch (deleteError) {
          console.error('Failed to delete image:', deleteError);
        }
      }
    }

    await Question.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}
