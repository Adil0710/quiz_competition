import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/models/Question';
import Competition from '@/models/Competition';

// POST /api/questions/reset
// Body: { type?: string, phase?: string, global?: boolean }
// Resets isUsed flag for questions. Can filter by type and phase.
// If global=true, also clears usedInCompetitions and competition.usedQuestions
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const { type, phase, global } = body;

    const filter: any = {};
    if (type) filter.type = type;
    if (phase && phase !== 'all') filter.phase = phase;

    // Count before reset
    const beforeCount = await Question.countDocuments({ ...filter, isUsed: true });

    if (global === true) {
      // Global reset: Clear isUsed and usedInCompetitions from all questions
      await Question.updateMany(
        filter,
        { 
          $set: { 
            isUsed: false,
            usedInCompetitions: []
          }
        }
      );

      // Clear usedQuestions from all competitions
      await Competition.updateMany(
        {},
        { $set: { usedQuestions: [] } }
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Global reset completed',
        resetCount: beforeCount,
        scope: 'global'
      });
    } else {
      // Standard reset: Only clear isUsed flag (keep per-competition tracking)
      await Question.updateMany(
        filter,
        { $set: { isUsed: false } }
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Questions reset successfully',
        resetCount: beforeCount,
        scope: 'standard'
      });
    }
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset questions' },
      { status: 500 }
    );
  }
}

// GET /api/questions/reset/stats
// Returns statistics about used/unused questions
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const phase = searchParams.get('phase');

    const filter: any = {};
    if (type) filter.type = type;
    if (phase && phase !== 'all') filter.phase = phase;

    const totalCount = await Question.countDocuments(filter);
    const usedCount = await Question.countDocuments({ ...filter, isUsed: true });
    const unusedCount = totalCount - usedCount;

    // Get breakdown by type
    const types = ['mcq', 'media', 'buzzer', 'rapid_fire', 'sequence', 'visual_rapid_fire'];
    const breakdown: any = {};
    
    for (const t of types) {
      const typeFilter = { ...filter, type: t };
      const total = await Question.countDocuments(typeFilter);
      const used = await Question.countDocuments({ ...typeFilter, isUsed: true });
      breakdown[t] = { total, used, unused: total - used };
    }

    return NextResponse.json({
      success: true,
      data: {
        total: totalCount,
        used: usedCount,
        unused: unusedCount,
        breakdown
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
