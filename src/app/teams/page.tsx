'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Search, Users, Loader2, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

interface School {
  _id: string;
  name: string;
  code: string;
}

interface Team {
  _id: string;
  name: string;
  school?: School | null;
  members?: {
    name: string;
    email: string;
    phone: string;
    role: 'captain' | 'member';
  }[];
  totalScore?: number;
  currentStage?: string;
  createdAt?: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    school: '',
    members: [
      { name: '', email: '', phone: '', role: 'captain' as 'captain' | 'member' },
      { name: '', email: '', phone: '', role: 'member' as 'captain' | 'member' },
      { name: '', email: '', phone: '', role: 'member' as 'captain' | 'member' }
    ]
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
    fetchSchools();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = teams.filter(team => {
      const schoolName = team.school?.name?.toLowerCase() || '';
      const schoolCode = team.school?.code?.toLowerCase() || '';
      return (
        team.name.toLowerCase().includes(term) ||
        schoolName.includes(term) ||
        schoolCode.includes(term)
      );
    });
    setFilteredTeams(filtered);
  }, [teams, searchTerm]);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      const data = await response.json();
      if (data.success) {
        setTeams(data.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await fetch('/api/schools');
      const data = await response.json();
      if (data.success) {
        setSchools(data.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch schools",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Members are optional; filter only fully filled entries
    const validMembers = formData.members.filter(member => 
      member.name.trim() && member.email.trim() && member.phone.trim()
    );

    if (validMembers.length > 0) {
      const hasCaptain = validMembers.some(member => member.role === 'captain');
      if (!hasCaptain) {
        validMembers[0].role = 'captain';
      }
    }

    try {
      const url = editingTeam ? `/api/teams/${editingTeam._id}` : '/api/teams';
      const method = editingTeam ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          members: validMembers // can be empty
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Team ${editingTeam ? 'updated' : 'created'} successfully`
        });
        setIsDialogOpen(false);
        resetForm();
        fetchTeams();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save team",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save team",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      school: team.school?._id || '',
      members: [
        ...(team.members || []),
        ...Array(Math.max(0, 3 - (team.members?.length || 0))).fill({ name: '', email: '', phone: '', role: 'member' })
      ].slice(0, 3)
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      setDeletingId(id);
      const response = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Team deleted successfully"
        });
        fetchTeams();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete team",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      school: '',
      members: [
        { name: '', email: '', phone: '', role: 'captain' },
        { name: '', email: '', phone: '', role: 'member' },
        { name: '', email: '', phone: '', role: 'member' }
      ]
    });
    setEditingTeam(null);
  };

  const updateMember = (index: number, field: string, value: string) => {
    const newMembers = [...formData.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData({ ...formData, members: newMembers });
  };

  const handleBulkCreateTeams = async () => {
    if (!confirm('This will create teams for all schools that don\'t have teams yet. Continue?')) return;
    
    setBulkCreating(true);
    try {
      const response = await fetch('/api/teams/bulk-from-schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: `Created ${data.createdCount} teams successfully`
        });
        fetchTeams();
      } else {
        toast({
          title: "Error", 
          description: data.error || "Failed to create teams",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create teams",
        variant: "destructive"
      });
    } finally {
      setBulkCreating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Create and manage competition teams</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleBulkCreateTeams} 
            disabled={bulkCreating}
            variant="outline"
          >
            {bulkCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Create Teams from Schools
              </>
            )}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
                <DialogDescription>
                  {editingTeam ? 'Update team information' : 'Create a new team for competition'}
                </DialogDescription>
              </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter team name"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="school">School</Label>
                  <Select value={formData.school} onValueChange={(value) => setFormData({ ...formData, school: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school._id} value={school._id}>
                          {school.name} ({school.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label>Team Members</Label>
                  {formData.members.map((member, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Name</Label>
                          <Input
                            value={member.name}
                            onChange={(e) => updateMember(index, 'name', e.target.value)}
                            placeholder="Member name"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Role</Label>
                          <Select 
                            value={member.role} 
                            onValueChange={(value) => updateMember(index, 'role', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="captain">Captain</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={member.email}
                            onChange={(e) => updateMember(index, 'email', e.target.value)}
                            placeholder="Member email"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Phone</Label>
                          <Input
                            value={member.phone}
                            onChange={(e) => updateMember(index, 'phone', e.target.value)}
                            placeholder="Member phone"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingTeam ? 'Update' : 'Create'
                  )}
                </Button>
              </DialogFooter>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by team name, school name, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teams ({filteredTeams.length})</CardTitle>
          <CardDescription>All registered teams</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 items-center">
                  <Skeleton className="col-span-3 h-6" />
                  <Skeleton className="col-span-3 h-6" />
                  <Skeleton className="col-span-1 h-6" />
                  <Skeleton className="col-span-1 h-6" />
                  <Skeleton className="col-span-1 h-6" />
                  <Skeleton className="col-span-1 h-6" />
                  <Skeleton className="col-span-2 h-10" />
                </div>
              ))}
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No teams found</h3>
              <p className="text-muted-foreground">Create your first team to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team._id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{team.school?.name ?? 'Unknown school'}</div>
                        <Badge variant="secondary">{team.school?.code ?? 'N/A'}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>{team.members?.length ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(team.currentStage || 'group').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{team.totalScore ?? 0}</TableCell>
                    <TableCell>{team.createdAt ? new Date(team.createdAt).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(team)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(team._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
