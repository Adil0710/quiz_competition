"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Users } from "lucide-react";

interface Team {
  _id: string;
  name: string;
  school?: { name: string; code: string };
}

interface Competition {
  _id: string;
  name: string;
  status: "draft" | "ongoing" | "completed";
  teams: Team[];
}

const GROUP_NAMES = Array.from({ length: 6 }).map((_, i) => `Group ${String.fromCharCode(65 + i)}`);

export default function ManualGroupsPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // groupAssignments[groupIndex] = array of team ids
  const [groupAssignments, setGroupAssignments] = useState<string[][]>(
    () => Array.from({ length: 6 }).map(() => [])
  );

  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchCompetition = async () => {
      try {
        const res = await fetch(`/api/competitions/${competitionId}`);
        const data = await res.json();
        if (data.success) {
          setCompetition(data.data);
        } else {
          toast({ title: "Error", description: "Competition not found", variant: "destructive" });
          router.push(`/competitions/${competitionId}`);
        }
      } catch (e) {
        toast({ title: "Error", description: "Failed to load competition", variant: "destructive" });
        router.push(`/competitions/${competitionId}`);
      } finally {
        setLoading(false);
      }
    };
    if (competitionId) fetchCompetition();
  }, [competitionId, router, toast]);

  const assignedTeamIds = useMemo(
    () => new Set(groupAssignments.flat()),
    [groupAssignments]
  );

  const unassignedTeams = useMemo(() => {
    const teams = competition?.teams || [];
    const filtered = teams.filter((t) => !assignedTeamIds.has(t._id));
    if (!search.trim()) return filtered;
    const s = search.toLowerCase();
    return filtered.filter(
      (t) => t.name.toLowerCase().includes(s) || t.school?.code?.toLowerCase().includes(s)
    );
  }, [competition?.teams, assignedTeamIds, search]);

  const moveTeamToGroup = (teamId: string, groupIdx: number) => {
    setGroupAssignments((prev) => {
      const next = prev.map((arr) => arr.filter((id) => id !== teamId));
      if (next[groupIdx].length >= 3) return prev; // max 3 per group
      next[groupIdx] = [...next[groupIdx], teamId];
      return next;
    });
  };

  const removeFromGroup = (teamId: string, groupIdx: number) => {
    setGroupAssignments((prev) => {
      const next = prev.map((arr) => [...arr]);
      next[groupIdx] = next[groupIdx].filter((id) => id !== teamId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!competition) return;
    // validate: total 18 teams -> 6 groups x 3
    const total = groupAssignments.reduce((acc, g) => acc + g.length, 0);
    if (total !== 18) {
      toast({ title: "Validation", description: "Assign exactly 18 teams across 6 groups (3 per group).", variant: "destructive" });
      return;
    }
    if (groupAssignments.some((g) => g.length !== 3)) {
      toast({ title: "Validation", description: "Each group must contain exactly 3 teams.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const customGroups = groupAssignments.map((teamIds, i) => ({
        name: GROUP_NAMES[i],
        teams: teamIds,
      }));
      const res = await fetch(`/api/competitions/${competitionId}/create-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "manual", customGroups }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: "Groups created successfully" });
        router.push(`/competitions/${competitionId}`);
      } else {
        toast({ title: "Failed", description: data.error || "Unable to create groups", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to create groups", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-24" />
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-9 w-36" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-10" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-9 w-28" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-5 w-12" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <div key={j} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <Skeleton className="h-5 w-40 mb-1" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!competition) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/competitions/${competitionId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Manual Groups</h1>
            <p className="text-muted-foreground">Assign teams to 6 groups (3 teams each)</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Groups
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unassigned Teams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Unassigned Teams</span>
              <Badge variant="secondary">{unassignedTeams.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search by team or code" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-[60vh] overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead className="text-right">Add</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassignedTeams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        <Users className="inline h-4 w-4 mr-2" /> No teams
                      </TableCell>
                    </TableRow>
                  ) : (
                    unassignedTeams.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>
                          {t.school?.name}
                          {t.school?.code ? (
                            <Badge variant="outline" className="ml-2 text-xs">{t.school.code}</Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <Select onValueChange={(val) => moveTeamToGroup(t._id, Number(val))}>
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Group" />
                            </SelectTrigger>
                            <SelectContent>
                              {GROUP_NAMES.map((g, idx) => (
                                <SelectItem key={g} value={String(idx)} disabled={groupAssignments[idx].length >= 3}>
                                  {g} ({groupAssignments[idx].length}/3)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Groups */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {GROUP_NAMES.map((g, idx) => (
            <Card key={g}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{g}</span>
                  <Badge variant={groupAssignments[idx].length === 3 ? "default" : "secondary"}>
                    {groupAssignments[idx].length}/3
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {groupAssignments[idx].map((teamId) => {
                    const t = competition.teams.find((x) => x._id === teamId);
                    if (!t) return null;
                    return (
                      <div key={teamId} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{t.name}</div>
                          {t.school?.code ? (
                            <div className="text-sm text-muted-foreground">{t.school.code}</div>
                          ) : null}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => removeFromGroup(teamId, idx)}>
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                  {groupAssignments[idx].length === 0 && (
                    <div className="text-sm text-muted-foreground">No teams yet. Add from the left.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
