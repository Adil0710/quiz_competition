import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import GlobalSettings from '@/models/GlobalSettings';

export async function GET() {
  try {
    await dbConnect();
    
    // Get or create default settings
    let settings = await GlobalSettings.findOne();
    if (!settings) {
      settings = await GlobalSettings.create({
        mcqPoints: 10,
        mediaPoints: 10,
        buzzerPoints: 10,
        rapidFirePoints: 10,
        sequencePoints: 10,
        visualRapidFirePoints: 10,
        mcqNegativeMarking: false,
        mediaNegativeMarking: false,
        rapidFireNegativeMarking: false,
        sequenceNegativeMarking: false,
        visualRapidFireNegativeMarking: false
      });
    } else {
      // Migration: Check if new negative marking fields don't exist
      if (settings.mcqNegativeMarking === undefined) {
        // Update existing document to add new fields
        settings = await GlobalSettings.findOneAndUpdate(
          { _id: settings._id },
          {
            $set: {
              mcqNegativeMarking: false,
              mediaNegativeMarking: false,
              rapidFireNegativeMarking: false,
              sequenceNegativeMarking: false,
              visualRapidFireNegativeMarking: false
            },
            $unset: {
              negativeMarking: ""
            }
          },
          { new: true }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching global settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch global settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const {
      mcqPoints,
      mediaPoints,
      buzzerPoints,
      rapidFirePoints,
      sequencePoints,
      visualRapidFirePoints,
      mcqNegativeMarking,
      mediaNegativeMarking,
      rapidFireNegativeMarking,
      sequenceNegativeMarking,
      visualRapidFireNegativeMarking
    } = body;

    // Update or create settings (upsert)
    const settings = await GlobalSettings.findOneAndUpdate(
      {}, // Empty filter to match any document
      {
        mcqPoints,
        mediaPoints,
        buzzerPoints,
        rapidFirePoints,
        sequencePoints,
        visualRapidFirePoints,
        mcqNegativeMarking,
        mediaNegativeMarking,
        rapidFireNegativeMarking,
        sequenceNegativeMarking,
        visualRapidFireNegativeMarking
      },
      { 
        upsert: true, // Create if doesn't exist
        new: true,    // Return updated document
        runValidators: true
      }
    );

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Global settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating global settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update global settings' },
      { status: 500 }
    );
  }
}
