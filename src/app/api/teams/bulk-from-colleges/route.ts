import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import School from '@/models/School';
import Team from '@/models/Team';

// POST /api/teams/bulk-from-schools
// Creates one team per school that currently has no team.
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Fetch all schools
    const schools = await School.find({}, { _id: 1, name: 1, code: 1 });

    if (!schools.length) {
      return NextResponse.json({ success: true, created: 0, data: [] });
    }

    // Find schools that already have at least one team
    const teams = await Team.aggregate([
      { $group: { _id: '$school', count: { $sum: 1 } } }
    ]);

    const schoolIdsWithTeams = new Set<string>(teams.map((t: any) => String(t._id)));

    // Determine schools without teams
    const schoolsWithoutTeams = schools.filter((c: any) => !schoolIdsWithTeams.has(String(c._id)));

    if (!schoolsWithoutTeams.length) {
      return NextResponse.json({ success: true, created: 0, data: [] });
    }

    // Create teams with empty members for those schools
    const toCreate = schoolsWithoutTeams.map((c: any) => ({
      name: `${c.code || c.name} Team`,
      school: c._id,
      members: [],
    }));

    const created = await Team.insertMany(toCreate);

    // Populate school fields for response
    const createdIds = created.map((t: any) => t._id);
    const populated = await Team.find({ _id: { $in: createdIds } }).populate('school', 'name code');

    return NextResponse.json({ success: true, created: created.length, data: populated }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to bulk create teams from schools' },
      { status: 500 }
    );
  }
}
