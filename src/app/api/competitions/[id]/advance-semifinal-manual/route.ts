import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Competition from "@/models/Competition";
import Team from "@/models/Team";
import Group from "@/models/Group";
import mongoose from "mongoose";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { selectedTeamIds } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid competition id" },
        { status: 400 }
      );
    }

    if (!selectedTeamIds || !Array.isArray(selectedTeamIds)) {
      return NextResponse.json(
        { success: false, error: "Invalid team selection" },
        { status: 400 }
      );
    }

    // Validate we have exactly 9 teams for semifinal
    if (selectedTeamIds.length !== 9) {
      return NextResponse.json(
        { success: false, error: `Expected 9 teams for semifinal, received ${selectedTeamIds.length}` },
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

    // Validate that all selected team IDs exist in the competition
    const selectedTeams = await Team.find({ _id: { $in: selectedTeamIds } });
    if (selectedTeams.length !== selectedTeamIds.length) {
      return NextResponse.json(
        { success: false, error: "Some selected teams not found" },
        { status: 400 }
      );
    }

    // Reset scores for selected teams
    await Team.updateMany(
      { _id: { $in: selectedTeamIds } },
      { $set: { totalScore: 0 } }
    );

    // Delete existing groups
    await Group.deleteMany({ competition: id });

    // Create 3 groups of 3 teams each for semifinal
    const groupData = [
      {
        name: "Semifinal Group A",
        teams: selectedTeamIds.slice(0, 3),
        stage: 'semi_final',
        competition: id
      },
      {
        name: "Semifinal Group B", 
        teams: selectedTeamIds.slice(3, 6),
        stage: 'semi_final',
        competition: id
      },
      {
        name: "Semifinal Group C",
        teams: selectedTeamIds.slice(6, 9),
        stage: 'semi_final',
        competition: id
      }
    ];

    // Create Group documents
    const createdGroups = await Group.insertMany(groupData);

    // Update competition with semifinal groups and phase
    competition.groups = createdGroups.map(g => g._id);
    competition.currentStage = 'semi_final';
    await competition.save();

    return NextResponse.json({
      success: true,
      message: "Successfully advanced to semifinal phase with manual selection",
      data: {
        selectedTeams: selectedTeams.map((t: any) => ({ _id: t._id, name: t.name })),
        semifinalGroups: createdGroups.map(g => ({ _id: g._id, name: g.name, teams: g.teams }))
      }
    });

  } catch (error) {
    console.error('Error in manual semifinal advancement:', error);
    return NextResponse.json(
      { success: false, error: "Failed to advance to semifinal" },
      { status: 500 }
    );
  }
}
