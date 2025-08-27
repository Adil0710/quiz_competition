import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Competition from "@/models/Competition";
import Team from "@/models/Team";
import mongoose from "mongoose";

// GET /api/competitions/[id]/top-teams?limit=9
// Gets top teams by totalScore for semifinal selection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '9');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid competition id" },
        { status: 400 }
      );
    }

    const competition = await Competition.findById(id).populate({
      path: 'groups.teams',
      model: 'Team'
    });

    if (!competition) {
      return NextResponse.json(
        { success: false, error: "Competition not found" },
        { status: 404 }
      );
    }

    // Get all teams from all groups and sort by totalScore
    const allTeams = competition.groups.reduce((teams: any[], group: any) => {
      return teams.concat(group.teams);
    }, []);

    // Sort teams by totalScore in descending order and take top N
    const topTeams = allTeams
      .sort((a: any, b: any) => (b.totalScore || 0) - (a.totalScore || 0))
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        topTeams,
        totalTeams: allTeams.length,
        selectedCount: topTeams.length
      }
    });

  } catch (error) {
    console.error('Error getting top teams:', error);
    return NextResponse.json(
      { success: false, error: "Failed to get top teams" },
      { status: 500 }
    );
  }
}
