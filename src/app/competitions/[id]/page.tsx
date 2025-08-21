'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, Play, Trophy, Settings, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Competition {
  _id: string;
  name: string;
  description: string;
  status: 'draft' | 'ongoing' | 'completed';
  currentStage: 'group' | 'semi_final' | 'final';
  teams: any[];
  groups: any[];
  startDate: string;
  endDate?: string;
}

export default function CompetitionDetailsPage() {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingScores, setResettingScores] = useState(false);
  const [creatingMode, setCreatingMode] = useState<null | 'auto' | 'manual'>(null);
  const [navManualLoading, setNavManualLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'draft' as Competition['status'],
    currentStage: 'group' as Competition['currentStage'],
    endDate: '' as string | ''
  });
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;

  useEffect(() => {
    if (competitionId) {
      fetchCompetition();
    }
  }, [competitionId]);

  const fetchCompetition = async () => {
    try {
      const response = await fetch(`/api/competitions/${competitionId}`);
      const data = await response.json();
      if (data.success) {
        setCompetition(data.data);
        // Seed form with fetched values
        const c = data.data as Competition;
        setForm({
          name: c.name || '',
          description: c.description || '',
          status: c.status,
          currentStage: c.currentStage,
          endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 10) : ''
        });
      } else {
        toast({
          title: "Error",
          description: "Competition not found",
          variant: "destructive"
        });
        router.push('/dashboard');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch competition details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetScores = async () => {
    try {
      setResettingScores(true);
      const res = await fetch(`/api/competitions/${competitionId}/scores`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Scores Reset', description: 'All team scores for this competition were cleared.' });
        fetchCompetition();
      } else {
        toast({ title: 'Failed', description: data.error || 'Could not reset scores', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to reset scores', variant: 'destructive' });
    } finally {
      setResettingScores(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/competitions/${competitionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          status: form.status,
          currentStage: form.currentStage,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Updated', description: 'Competition updated successfully' });
        setEditOpen(false);
        fetchCompetition();
      } else {
        toast({ title: 'Failed', description: data.error || 'Update failed', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update competition', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/competitions/${competitionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Deleted', description: 'Competition deleted' });
        router.push('/dashboard');
      } else {
        toast({ title: 'Failed', description: data.error || 'Delete failed', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete competition', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateGroups = async (mode: 'auto' | 'manual') => {
    try {
      setCreatingMode(mode);
      // If manual, build customGroups from existing teams in sequential order (6 groups, 3 teams each)
      const customGroups = mode === 'manual' && competition ? Array.from({ length: 6 }).map((_, i) => {
        const start = i * 3;
        const slice = (competition.teams as any[]).slice(start, start + 3);
        return {
          name: `Group ${String.fromCharCode(65 + i)}`,
          teams: slice.map((t: any) => t._id || t),
        };
      }) : undefined;

      const response = await fetch(`/api/competitions/${competitionId}/create-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, customGroups })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Groups created successfully"
        });
        fetchCompetition();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create groups",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create groups",
        variant: "destructive"
      });
    } finally {
      setCreatingMode(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'ongoing': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'group': return 'bg-yellow-500';
      case 'semi_final': return 'bg-orange-500';
      case 'final': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-36" />
            <div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        {/* Info cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="flex justify-between items-center p-2 bg-muted rounded">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-5 w-10" />
                        </div>
                      ))}
                      <Skeleton className="h-4 w-28" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Competition not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{competition.name}</h1>
              <Badge className={getStatusColor(competition.status)}>
                {competition.status}
              </Badge>
              {competition.status === 'ongoing' && (
                <Badge className={getStageColor(competition.currentStage)}>
                  {competition.currentStage.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{competition.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {competition.status === 'draft' && competition.teams.length === 18 && (
            <>
              <Button variant="outline" onClick={() => handleCreateGroups('auto')} disabled={creatingMode!==null || navManualLoading}>
                {creatingMode==='auto' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Auto Create Groups
              </Button>
              <Button
                variant="outline"
                disabled={navManualLoading || creatingMode!==null}
                onClick={() => {
                  setNavManualLoading(true);
                  router.push(`/competitions/${competitionId}/groups/manual`);
                }}
              >
                {navManualLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Manual Groups
              </Button>
            </>
          )}
          {competition.status === 'ongoing' && (
            <Link href={`/competitions/${competitionId}/manage`}>
              <Button>
                <Play className="mr-2 h-4 w-4" />
                Manage Competition
              </Button>
            </Link>
          )}
          <Button variant="destructive" onClick={handleResetScores} disabled={resettingScores}>
            {resettingScores ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            Reset Scores
          </Button>
          {/* Edit */}
          <AlertDialog open={editOpen} onOpenChange={setEditOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Edit</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Edit Competition</AlertDialogTitle>
                <AlertDialogDescription>Update basic details.</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Name</label>
                  <input className="w-full border rounded px-3 py-2" value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <textarea className="w-full border rounded px-3 py-2" value={form.description} onChange={e=>setForm(s=>({...s,description:e.target.value}))} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Status</label>
                    <select className="w-full border rounded px-3 py-2" value={form.status} onChange={e=>setForm(s=>({...s,status:e.target.value as any}))}>
                      <option value="draft">draft</option>
                      <option value="ongoing">ongoing</option>
                      <option value="completed">completed</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Stage</label>
                    <select className="w-full border rounded px-3 py-2" value={form.currentStage} onChange={e=>setForm(s=>({...s,currentStage:e.target.value as any}))}>
                      <option value="group">group</option>
                      <option value="semi_final">semi_final</option>
                      <option value="final">final</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">End Date</label>
                    <input type="date" className="w-full border rounded px-3 py-2" value={form.endDate} onChange={e=>setForm(s=>({...s,endDate:e.target.value}))} />
                  </div>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleUpdate} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                  Save
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete competition?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is permanent and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Competition Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competition.teams.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Groups Created</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competition.groups.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stage</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competition.currentStage.replace('_', ' ')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Start Date</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {new Date(competition.startDate).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Participating Teams</CardTitle>
              <CardDescription>All teams registered for this competition</CardDescription>
            </CardHeader>
            <CardContent>
              {competition.teams.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No teams registered</h3>
                  <p className="text-muted-foreground">Teams will appear here once registered.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Current Stage</TableHead>
                      <TableHead>Total Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competition.teams.map((team: any) => (
                      <TableRow key={team._id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{team.college?.name}</div>
                            <Badge variant="secondary" className="text-xs">
                              {team.college?.code}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{team.members?.length || 0}</TableCell>
                        <TableCell>
                          <Badge className={getStageColor(team.currentStage || 'group')}>
                            {(team.currentStage || 'group').replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const entry = (competition as any).teamScores?.find(
                              (ts: any) => String(ts.team?._id ?? ts.team) === String(team._id)
                            );
                            return entry?.score ?? 0;
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Competition Groups</CardTitle>
              <CardDescription>Groups created for different stages</CardDescription>
            </CardHeader>
            <CardContent>
              {competition.groups.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No groups created</h3>
                  <p className="text-muted-foreground">
                    Create groups to start the competition.
                  </p>
                  {competition.status === 'draft' && competition.teams.length === 18 && (
                    <div className="flex gap-2 justify-center mt-4">
                      <Button onClick={() => handleCreateGroups('auto')} disabled={navManualLoading}>
                        Auto Create Groups
                      </Button>
                      <Button
                        variant="outline"
                        disabled={navManualLoading}
                        onClick={() => {
                          setNavManualLoading(true);
                          router.push(`/competitions/${competitionId}/groups/manual`);
                        }}
                      >
                        {navManualLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Manual Groups
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {competition.groups.map((group: any) => (
                    <Card key={group._id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {group.name}
                          <Badge className={getStageColor(group.stage)}>
                            {group.stage.replace('_', ' ')}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {group.teams?.map((team: any) => (
                            <div key={team._id} className="flex justify-between items-center p-2 bg-muted rounded">
                              <span className="font-medium">{team.name}</span>
                              <Badge variant="outline">{team.college?.code}</Badge>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 text-sm text-muted-foreground">
                          Round {group.currentRound || 1} of {group.maxRounds || 3}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
