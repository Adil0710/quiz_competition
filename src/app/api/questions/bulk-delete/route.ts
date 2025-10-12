import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/models/Question';
import { deleteFromCloudinary, extractPublicId } from '@/lib/cloudinary';

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

    // First, fetch all questions to get their media URLs
    const questions = await Question.find({ type }).select('mediaUrl imageUrls').lean();

    // Delete all media files from Cloudinary
    for (const question of questions) {
      // Delete single mediaUrl if exists
      if (question.mediaUrl) {
        try {
          const publicId = extractPublicId(question.mediaUrl);
          if (publicId) await deleteFromCloudinary(publicId);
        } catch (deleteError) {
          console.error('Failed to delete media:', deleteError);
        }
      }

      // Delete imageUrls if exists (for visual_rapid_fire)
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
