'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Pencil, Trash2, Play, Eye } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';

interface Competition {
  _id: string;
  name: string;
  description: string;
  status: 'draft' | 'ongoing' | 'completed';
  currentStage: 'group' | 'semi_final' | 'final';
  startDate: string;
  endDate?: string;
  teams: any[];
}

export default function CompetitionsListPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editOpenId, setEditOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'draft' as Competition['status'],
    currentStage: 'group' as Competition['currentStage'],
    endDate: '' as string | ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    try {
      const res = await fetch('/api/competitions');
      const data = await res.json();
      if (data.success) {
        setCompetitions(data.data || []);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to fetch competitions', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch competitions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) =>
    status === 'ongoing' ? 'bg-green-500' : status === 'completed' ? 'bg-blue-500' : 'bg-gray-500';

  const openEdit = (c: Competition) => {
    setEditOpenId(c._id);
    setForm({
      name: c.name,
      description: c.description,
      status: c.status,
      currentStage: c.currentStage,
      endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 10) : ''
    });
  };

  const handleUpdate = async (id: string) => {
    try {
      setBusyId(id);
      const res = await fetch(`/api/competitions/${id}`, {
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
        toast({ title: 'Updated', description: 'Competition updated' });
        setEditOpenId(null);
        fetchList();
      } else {
        toast({ title: 'Failed', description: data.error || 'Update failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update competition', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setBusyId(id);
      const res = await fetch(`/api/competitions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Deleted', description: 'Competition deleted' });
        setCompetitions(prev => prev.filter(c => c._id !== id));
      } else {
        toast({ title: 'Failed', description: data.error || 'Delete failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete competition', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Competitions</h1>
        <Link href="/competitions/create">
          <Button>Create Competition</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Competitions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 items-center">
                  <Skeleton className="col-span-3 h-6" />
                  <Skeleton className="col-span-3 h-6" />
                  <Skeleton className="col-span-2 h-6" />
                  <Skeleton className="col-span-2 h-6" />
                  <Skeleton className="col-span-2 h-10" />
                </div>
              ))}
            </div>
          ) : competitions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No competitions found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitions.map(c => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="truncate max-w-[300px]">{c.description}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>{c.currentStage.replace('_', ' ')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/competitions/${c._id}`}>
                          <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1"/>View</Button>
                        </Link>
                        {c.status === 'ongoing' && (
                          <Link href={`/competitions/${c._id}/manage`}>
                            <Button size="sm"><Play className="h-4 w-4 mr-1"/>Manage</Button>
                          </Link>
                        )}
                        <AlertDialog open={editOpenId === c._id} onOpenChange={(o)=>!o && setEditOpenId(null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={()=>openEdit(c)} disabled={busyId===c._id}>
                              {busyId===c._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin"/> : <Pencil className="h-4 w-4 mr-1"/>}
                              Edit
                            </Button>
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
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={()=>handleUpdate(c._id)} disabled={busyId===c._id}>
                                {busyId===c._id ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                                Save
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={busyId===c._id}>
                              {busyId===c._id ? <Loader2 className="h-4 w-4 mr-1 animate-spin"/> : <Trash2 className="h-4 w-4 mr-1"/>}
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete competition?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={()=>handleDelete(c._id)} disabled={busyId===c._id}>
                                {busyId===c._id ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
