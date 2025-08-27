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

    // Validate we have exactly 3 teams for final
    if (selectedTeamIds.length !== 3) {
      return NextResponse.json(
        { success: false, error: `Expected 3 teams for final, received ${selectedTeamIds.length}` },
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

    // Validate that all selected team IDs exist
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

    // Delete existing semifinal groups
    await Group.deleteMany({ competition: id });

    // Create final group with 3 teams
    const finalGroupData = {
      name: "Final Group",
      teams: selectedTeamIds,
      stage: 'final',
      competition: id
    };

    // Create Group document
    const createdFinalGroup = await Group.create(finalGroupData);

    // Update competition with final group and phase
    competition.groups = [createdFinalGroup._id];
    competition.currentStage = 'final';
    competition.currentPhase = 'final';
    await competition.save();

    return NextResponse.json({
      success: true,
      message: "Successfully advanced to final phase with manual selection",
      data: {
        selectedTeams: selectedTeams.map((t: any) => ({ _id: t._id, name: t.name })),
        finalGroup: {
          _id: createdFinalGroup._id,
          name: createdFinalGroup.name,
          teams: createdFinalGroup.teams
        }
      }
    });

  } catch (error) {
    console.error('Error in manual final advancement:', error);
    return NextResponse.json(
      { success: false, error: "Failed to advance to final" },
      { status: 500 }
    );
  }
}
