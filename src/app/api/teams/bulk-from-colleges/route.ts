import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import College from '@/models/College';
import Team from '@/models/Team';

// POST /api/teams/bulk-from-colleges
// Creates one team per college that currently has no team.
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Fetch all colleges
    const colleges = await College.find({}, { _id: 1, name: 1, code: 1 });

    if (!colleges.length) {
      return NextResponse.json({ success: true, created: 0, data: [] });
    }

    // Find colleges that already have at least one team
    const teams = await Team.aggregate([
      { $group: { _id: '$college', count: { $sum: 1 } } }
    ]);

    const collegeIdsWithTeams = new Set<string>(teams.map((t: any) => String(t._id)));

    // Determine colleges without teams
    const collegesWithoutTeams = colleges.filter((c: any) => !collegeIdsWithTeams.has(String(c._id)));

    if (!collegesWithoutTeams.length) {
      return NextResponse.json({ success: true, created: 0, data: [] });
    }

    // Create teams with empty members for those colleges
    const toCreate = collegesWithoutTeams.map((c: any) => ({
      name: `${c.code || c.name} Team`,
      college: c._id,
      members: [],
    }));

    const created = await Team.insertMany(toCreate);

    // Populate college fields for response
    const createdIds = created.map((t: any) => t._id);
    const populated = await Team.find({ _id: { $in: createdIds } }).populate('college', 'name code');

    return NextResponse.json({ success: true, created: created.length, data: populated }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to bulk create teams from colleges' },
      { status: 500 }
    );
  }
}
