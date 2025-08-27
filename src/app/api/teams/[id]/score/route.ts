import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Team from "@/models/Team";
import mongoose from "mongoose";

// POST /api/teams/[id]/score
// Body: { points: number }
// Updates team's totalScore directly
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid team id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { points } = body;

    if (typeof points !== 'number') {
      return NextResponse.json(
        { success: false, error: "Points must be a number" },
        { status: 400 }
      );
    }

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Update team's totalScore
    team.totalScore = (team.totalScore || 0) + points;
    await team.save();

    return NextResponse.json({ 
      success: true, 
      message: `Added ${points} points to team ${team.name}`,
      data: { 
        teamId: id, 
        points, 
        newTotalScore: team.totalScore 
      }
    });

  } catch (error) {
    console.error('Error updating team score:', error);
    return NextResponse.json(
      { success: false, error: "Failed to update team score" },
      { status: 500 }
    );
  }
}
