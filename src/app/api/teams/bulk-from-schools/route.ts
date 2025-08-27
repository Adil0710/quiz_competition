import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Team from '@/models/Team';
import School from '@/models/School';

export async function POST() {
  try {
    await dbConnect();

    // Get all schools
    const schools = await School.find({})
      .lean()
      .select('_id name code') as Array<{
        _id: string;
        name: string;
        code: string;
      }>;

    if (schools.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No schools found' },
        { status: 400 }
      );
    }

    // Get existing teams to avoid duplicates
    const existingTeams = await Team.find({})
      .lean()
      .select('school')
      .populate('school', '_id') as Array<{
        school?: {
          _id: string;
        };
      }>;

    const existingSchoolIds = new Set(
      existingTeams
        .map(team => team.school?._id?.toString())
        .filter(Boolean)
    );

    // Filter schools that don't have teams yet
    const schoolsWithoutTeams = schools.filter(
      school => !existingSchoolIds.has(school._id.toString())
    );

    if (schoolsWithoutTeams.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All schools already have teams' },
        { status: 400 }
      );
    }

    // Create teams for schools without teams
    const teamsToCreate = schoolsWithoutTeams.map(school => ({
      name: `Team ${school.name}`,
      school: school._id,
      members: [], // Empty members array - can be filled later
      totalScore: 0,
      currentStage: 'group'
    }));

    const createdTeams = await Team.insertMany(teamsToCreate);

    return NextResponse.json({
      success: true,
      createdCount: createdTeams.length,
      message: `Successfully created ${createdTeams.length} teams`
    });

  } catch (error) {
    console.error('Bulk team creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create teams' },
      { status: 500 }
    );
  }
}
