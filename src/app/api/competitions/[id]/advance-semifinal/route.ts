import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Competition from "@/models/Competition";
import Team from "@/models/Team";
import Group from "@/models/Group";
import mongoose from "mongoose";

// POST /api/competitions/[id]/advance-semifinal
// Advances top 9 teams to semifinal phase, creates 3 groups, resets scores
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

    const competition = await Competition.findById(id)
      .populate({
        path: 'teams',
        model: 'Team',
        populate: {
          path: 'school',
          select: 'name code'
        }
      })
      .populate({
        path: 'groups.teams',
        model: 'Team'
      });

    if (!competition) {
      return NextResponse.json(
        { success: false, error: "Competition not found" },
        { status: 404 }
      );
    }

    console.log('Competition structure:', {
      teamsCount: competition.teams?.length || 0,
      groupsCount: competition.groups?.length || 0,
      directTeams: competition.teams?.map((t: any) => ({ id: t._id, name: t.name, score: t.totalScore || 0 })) || []
    });

    // Use teams directly from competition.teams (not from groups)
    const allTeams = competition.teams || [];

    // Filter out any null/undefined teams and ensure we have valid team objects
    const validTeams = allTeams.filter((team: any) => team && team._id);

    console.log(`Total teams found: ${validTeams.length}`);
    console.log('Teams:', validTeams.map((t: any) => ({ name: t.name, score: t.totalScore || 0 })));

    if (validTeams.length < 9) {
      return NextResponse.json(
        { success: false, error: `Not enough teams to advance to semifinal. Need 9 teams, but only ${validTeams.length} valid teams available.` },
        { status: 400 }
      );
    }

    // Sort teams by score only (descending)
    const sortedTeams = validTeams.sort((a: any, b: any) => {
      const scoreA = a.totalScore || 0;
      const scoreB = b.totalScore || 0;
      return scoreB - scoreA;
    });

    console.log('Sorted teams by score:', sortedTeams.map((t: any, i: number) => ({ 
      rank: i + 1, 
      name: t.name, 
      score: t.totalScore || 0 
    })));

    // Check for ties that affect the top 9 selection
    const ninthTeamScore = sortedTeams[8]?.totalScore || 0;
    
    // Find teams that are competing for the 9th position and beyond with the same score
    const teamsWithNinthScore = sortedTeams.filter((team: any) => (team.totalScore || 0) === ninthTeamScore);
    
    let tieIssue = false;
    let tiedTeamsInfo = [];

    // Check if there are more teams with the 9th team's score than available positions
    if (teamsWithNinthScore.length > 1) {
      const ninthScoreStartIndex = sortedTeams.findIndex((team: any) => (team.totalScore || 0) === ninthTeamScore);
      const ninthScoreEndIndex = sortedTeams.findLastIndex((team: any) => (team.totalScore || 0) === ninthTeamScore);
      
      // If the tie extends past the 9th position, we need manual selection
      if (ninthScoreStartIndex < 9 && ninthScoreEndIndex >= 9) {
        tieIssue = true;
        // Only include teams from 9th position onwards that have the tied score
        tiedTeamsInfo = sortedTeams
          .slice(ninthScoreStartIndex)
          .filter((team: any) => (team.totalScore || 0) === ninthTeamScore)
          .map((t: any) => ({
            _id: t._id,
            name: t.name,
            score: t.totalScore || 0,
            school: t.school
          }));
      }
    }

    if (tieIssue) {
      // Automatically create tiebreaker groups and instruct to run a 5-question buzzer round
      const ninthScoreStartIndex = sortedTeams.findIndex((team: any) => (team.totalScore || 0) === ninthTeamScore);
      // Compute last index manually for compatibility
      let ninthScoreEndIndex = -1;
      for (let i = sortedTeams.length - 1; i >= 0; i--) {
        const score = (sortedTeams[i]?.totalScore || 0);
        if (score === ninthTeamScore) { ninthScoreEndIndex = i; break; }
      }

      const tiedTeams = sortedTeams
        .slice(ninthScoreStartIndex, ninthScoreEndIndex + 1)
        .filter((team: any) => (team.totalScore || 0) === ninthTeamScore);

      const tiedTeamIds = tiedTeams.map((t: any) => t._id);

      // Remove existing groups and create dedicated tiebreaker groups
      await Group.deleteMany({ competition: id });

      const buildTiebreakerGroups = (teamIds: string[]) => {
        const groups: { name: string; teams: string[] }[] = [];
        if (teamIds.length === 4) {
          groups.push({ name: 'Tiebreaker Group A', teams: teamIds.slice(0, 2) });
          groups.push({ name: 'Tiebreaker Group B', teams: teamIds.slice(2, 4) });
          return groups;
        }
        if (teamIds.length === 3) {
          groups.push({ name: 'Tiebreaker Group', teams: teamIds.slice(0, 3) });
          return groups;
        }
        if (teamIds.length === 2) {
          groups.push({ name: 'Tiebreaker Group', teams: teamIds.slice(0, 2) });
          return groups;
        }

        // Generic: prefer chunks of 3, but when remaining % 3 === 1 use a chunk of 2 to avoid a 1-sized group
        let i = 0;
        let labelIdx = 0;
        const label = () => String.fromCharCode('A'.charCodeAt(0) + (labelIdx++));
        while (i < teamIds.length) {
          const remaining = teamIds.length - i;
          let size = 3;
          if (remaining % 3 === 1 && remaining >= 4) {
            size = 2;
          } else if (remaining < 3) {
            size = remaining; // 2
          }
          const chunk = teamIds.slice(i, i + size);
          groups.push({ name: `Tiebreaker Group ${label()}`.trim(), teams: chunk });
          i += size;
        }
        return groups;
      };

      const groupData = buildTiebreakerGroups(tiedTeamIds).map((g) => ({
        name: g.name,
        teams: g.teams,
        stage: 'group' as const,
        competition: id,
        maxRounds: 1,
      }));

      const createdGroups = await Group.insertMany(groupData);

      // Update competition to reflect tiebreaker groups so UI can manage them
      competition.groups = createdGroups.map((g: any) => g._id);
      competition.currentStage = 'group';
      await competition.save();

      return NextResponse.json({
        success: true,
        tiebreakerCreated: true,
        message: `Tie detected at 9th place (score ${ninthTeamScore}). Created ${createdGroups.length} tiebreaker group(s). Conduct a 5-question buzzer round and run advancement again.`,
        groups: createdGroups.map(g => ({ _id: g._id, name: g.name, teams: g.teams })),
      });
    }

    // No ties affecting selection, proceed with top 9
    const topTeams = sortedTeams.slice(0, 9);

    // Reset scores for top 9 teams and update stages
    await Team.updateMany(
      { _id: { $in: topTeams.map((t: any) => t._id) } },
      { $set: { totalScore: 0, currentStage: 'semi_final' } }
    );

    // Mark eliminated teams (those not in top 9)
    const eliminatedIds = validTeams
      .filter((t: any) => !topTeams.find((tt: any) => String(tt._id) === String(t._id)))
      .map((t: any) => t._id);
    if (eliminatedIds.length > 0) {
      await Team.updateMany(
        { _id: { $in: eliminatedIds } },
        { $set: { currentStage: 'eliminated' } }
      );
    }

    // Delete existing groups
    await Group.deleteMany({ competition: id });

    // Create 3 groups of 3 teams each for semifinal
    const groupData = [
      {
        name: "Semifinal Group A",
        teams: topTeams.slice(0, 3).map((team: any) => team._id),
        stage: 'semi_final',
        competition: id
      },
      {
        name: "Semifinal Group B", 
        teams: topTeams.slice(3, 6).map((team: any) => team._id),
        stage: 'semi_final',
        competition: id
      },
      {
        name: "Semifinal Group C",
        teams: topTeams.slice(6, 9).map((team: any) => team._id),
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
      message: "Successfully advanced to semifinal phase",
      data: {
        topTeams: topTeams.map((t: any) => ({ _id: t._id, name: t.name, previousScore: t.totalScore })),
        semifinalGroups: createdGroups.map(g => ({ _id: g._id, name: g.name, teams: g.teams }))
      }
    });

  } catch (error) {
    console.error('Error advancing to semifinal:', error);
    return NextResponse.json(
      { success: false, error: "Failed to advance to semifinal" },
      { status: 500 }
    );
  }
}
