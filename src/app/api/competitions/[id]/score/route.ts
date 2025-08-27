import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Competition from "@/models/Competition";
import mongoose from "mongoose";

// POST /api/competitions/[id]/score
// Body: { teamId: string, points: number }
// Updates team score in the competition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid competition id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { teamId, points } = body;

    if (!teamId || typeof points !== 'number') {
      return NextResponse.json(
        { success: false, error: "teamId and points are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return NextResponse.json(
        { success: false, error: "Invalid team id" },
        { status: 400 }
      );
    }

    const competition = await Competition.findById(id);
    if (!competition) {
      return NextResponse.json(
        { success: false, error: "Competition not found" },
        { status: 404 }
      );
    }

    // Find the team in the competition's teamScores array and update score
    let teamFound = false;
    
    // Check if team already exists in teamScores
    const existingTeamScore = competition.teamScores.find(
      (ts: any) => ts.team.toString() === teamId
    );
    
    if (existingTeamScore) {
      existingTeamScore.score = (existingTeamScore.score || 0) + points;
      teamFound = true;
    } else {
      // Add new team score entry
      competition.teamScores.push({
        team: new mongoose.Types.ObjectId(teamId),
        score: points
      });
      teamFound = true;
    }

    if (!teamFound) {
      return NextResponse.json(
        { success: false, error: "Team not found in competition" },
        { status: 404 }
      );
    }

    await competition.save();

    return NextResponse.json({ 
      success: true, 
      message: `Added ${points} points to team`,
      data: { teamId, points }
    });

  } catch (error) {
    console.error('Error updating team score:', error);
    return NextResponse.json(
      { success: false, error: "Failed to update team score" },
      { status: 500 }
    );
  }
}
