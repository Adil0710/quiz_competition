import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Competition from '@/models/Competition';
import Team from '@/models/Team';
import Group from '@/models/Group';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    // Find the competition and populate groups with teams
    const competition = await Competition.findById(id).populate({
      path: 'groups',
      model: 'Group',
      populate: {
        path: 'teams',
        model: 'Team',
        populate: {
          path: 'school',
          model: 'School'
        }
      }
    });

    console.log('Competition found:', !!competition);
    console.log('Groups count:', competition?.groups?.length || 0);
    console.log('Groups data:', competition?.groups?.map((g: any) => ({
      name: g.name,
      teamsCount: g.teams?.length || 0,
      teams: g.teams?.map((t: any) => t ? { _id: t._id, name: t.name, totalScore: t.totalScore } : 'undefined')
    })));

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    if (competition.currentStage !== 'semi_final') {
      return NextResponse.json({ error: 'Competition must be in semi-final stage' }, { status: 400 });
    }

    // Get all teams from semifinal groups
    const allTeams = competition.groups.reduce((teams: any[], group: any) => {
      return teams.concat(group.teams || []);
    }, []);

    // Filter out any null/undefined teams
    const validTeams = allTeams.filter((team: any) => team && team._id);

    console.log('All teams:', allTeams.length);
    console.log('Valid teams:', validTeams.length);
    console.log('Valid teams data:', validTeams.map((t: any) => ({ _id: t._id, name: t.name, totalScore: t.totalScore })));

    if (validTeams.length < 3) {
      return NextResponse.json({ error: `Need at least 3 teams for final, found ${validTeams.length}` }, { status: 400 });
    }

    // Sort teams by totalScore
    const sortedTeams = validTeams.sort((a: any, b: any) => (b.totalScore || 0) - (a.totalScore || 0));

    console.log('Sorted teams by score:', sortedTeams.map((t: any, i: number) => ({ 
      rank: i + 1, 
      name: t.name, 
      score: t.totalScore || 0 
    })));

    // Check for ties that affect the top 3 selection
    const thirdTeamScore = sortedTeams[2]?.totalScore || 0;
    
    // Find teams that are competing for the 3rd position and beyond with the same score
    const teamsWithThirdScore = sortedTeams.filter((team: any) => (team.totalScore || 0) === thirdTeamScore);
    
    let tieIssue = false;
    let tiedTeamsInfo = [];

    // Check if there are more teams with the 3rd team's score than available positions
    if (teamsWithThirdScore.length > 1) {
      const thirdScoreStartIndex = sortedTeams.findIndex((team: any) => (team.totalScore || 0) === thirdTeamScore);
      const thirdScoreEndIndex = sortedTeams.findLastIndex((team: any) => (team.totalScore || 0) === thirdTeamScore);
      
      // If the tie extends past the 3rd position, we need manual selection
      if (thirdScoreStartIndex < 3 && thirdScoreEndIndex >= 3) {
        tieIssue = true;
        // Only include teams from 3rd position onwards that have the tied score
        tiedTeamsInfo = sortedTeams
          .slice(thirdScoreStartIndex)
          .filter((team: any) => (team.totalScore || 0) === thirdTeamScore)
          .map((t: any) => ({
            _id: t._id,
            name: t.name,
            score: t.totalScore || 0,
            school: t.school
          }));
      }
    }

    if (tieIssue) {
      // Automatically create tiebreaker groups for semifinal tie at 3rd cutoff
      const thirdScoreStartIndex = sortedTeams.findIndex((team: any) => (team.totalScore || 0) === thirdTeamScore);
      // Compute last index manually for compatibility
      let thirdScoreEndIndex = -1;
      for (let i = sortedTeams.length - 1; i >= 0; i--) {
        const score = (sortedTeams[i]?.totalScore || 0);
        if (score === thirdTeamScore) { thirdScoreEndIndex = i; break; }
      }

      const tiedTeams = sortedTeams
        .slice(thirdScoreStartIndex, thirdScoreEndIndex + 1)
        .filter((team: any) => (team.totalScore || 0) === thirdTeamScore);

      const tiedTeamIds = tiedTeams.map((t: any) => t._id);

      // Replace current semifinal groups with dedicated tiebreaker groups
      await Group.deleteMany({ competition: id });

      const buildTiebreakerGroups = (teamIds: string[]) => {
        const groups: { name: string; teams: string[] }[] = [];
        if (teamIds.length === 4) {
          groups.push({ name: 'Semifinal Tiebreaker A', teams: teamIds.slice(0, 2) });
          groups.push({ name: 'Semifinal Tiebreaker B', teams: teamIds.slice(2, 4) });
        } else if (teamIds.length === 3) {
          groups.push({ name: 'Semifinal Tiebreaker', teams: teamIds.slice(0, 3) });
        } else if (teamIds.length === 2) {
          groups.push({ name: 'Semifinal Tiebreaker', teams: teamIds.slice(0, 2) });
        } else {
          // Fallback chunking
          let i = 0;
          let labelIdx = 0;
          const label = () => String.fromCharCode('A'.charCodeAt(0) + (labelIdx++));
          while (i < teamIds.length) {
            const remaining = teamIds.length - i;
            const size = remaining >= 3 ? 3 : remaining;
            const chunk = teamIds.slice(i, i + size);
            groups.push({ name: `Semifinal Tiebreaker ${label()}`.trim(), teams: chunk });
            i += size;
          }
        }
        return groups;
      };

      const groupData = buildTiebreakerGroups(tiedTeamIds).map((g) => ({
        name: g.name,
        teams: g.teams,
        stage: 'semi_final' as const,
        competition: id,
        maxRounds: 1,
      }));

      const createdGroups = await Group.insertMany(groupData);

      // Update competition to reflect tiebreakers
      competition.groups = createdGroups.map((g: any) => g._id);
      competition.currentStage = 'semi_final';
      await competition.save();

      return NextResponse.json({
        success: true,
        tiebreakerCreated: true,
        message: `Tie detected at 3rd place (score ${thirdTeamScore}). Created ${createdGroups.length} semifinal tiebreaker group(s). Conduct a 5-question buzzer round and run advancement again.`,
        groups: createdGroups.map(g => ({ _id: g._id, name: g.name, teams: g.teams })),
      });
    }

    // No ties affecting selection, proceed with top 3
    const topTeams = sortedTeams.slice(0, 3);

    // Reset scores for final phase
    await Team.updateMany(
      { _id: { $in: topTeams.map((t: any) => t._id) } },
      { $set: { totalScore: 0 } }
    );

    // Delete existing semifinal groups
    await Group.deleteMany({ competition: id });

    // Create final group with top 3 teams
    const finalGroupData = {
      name: "Final Group",
      teams: topTeams.map((t: any) => t._id),
      stage: 'final',
      competition: id
    };

    // Create Group document
    const createdFinalGroup = await Group.create(finalGroupData);

    // Update competition
    competition.groups = [createdFinalGroup._id];
    competition.currentStage = 'final';
    competition.currentPhase = 'final';
    await competition.save();

    return NextResponse.json({
      success: true,
      topTeams: topTeams.map((t: any) => ({
        _id: t._id,
        name: t.name,
        school: t.school,
        totalScore: 0
      })),
      finalGroup: {
        _id: createdFinalGroup._id,
        name: createdFinalGroup.name,
        teams: createdFinalGroup.teams
      }
    });

  } catch (error) {
    console.error('Error advancing to final:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
