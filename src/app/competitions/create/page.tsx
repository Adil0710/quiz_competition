'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Trophy, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Team {
  _id: string;
  name: string;
  college: {
    _id: string;
    name: string;
    code: string;
  };
  members: any[];
}

export default function CreateCompetitionPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: ''
  });
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchTeams();
  }, []);

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
    }
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      } else if (prev.length < 18) {
        return [...prev, teamId];
      } else {
        toast({
          title: "Maximum teams reached",
          description: "You can only select 18 teams for a competition",
          variant: "destructive"
        });
        return prev;
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedTeams.length !== 18) {
      toast({
        title: "Invalid team count",
        description: "Please select exactly 18 teams for the competition",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          teams: selectedTeams
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Competition created successfully"
        });
        router.push(`/competitions/${data.data._id}`);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create competition",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create competition",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Competition</h1>
          <p className="text-muted-foreground">Set up a new quiz competition with 18 teams</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Competition Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Competition Details
            </CardTitle>
            <CardDescription>Basic information about the competition</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Competition Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter competition name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter competition description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Team Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Selection ({selectedTeams.length}/18)
            </CardTitle>
            <CardDescription>
              Select exactly 18 teams to participate in the competition
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No teams available</h3>
                <p className="text-muted-foreground">Create teams first before starting a competition.</p>
                <Link href="/teams/create">
                  <Button className="mt-4">Create Teams</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <Card 
                    key={team._id} 
                    className={`cursor-pointer transition-colors ${
                      selectedTeams.includes(team._id) ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleTeamToggle(team._id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedTeams.includes(team._id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <h3 className="font-semibold">{team.name}</h3>
                          </div>
                          <Badge variant="secondary">{team.college.code}</Badge>
                          <p className="text-sm text-muted-foreground">{team.college.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {team.members.length} members
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button 
            type="submit" 
            disabled={loading || selectedTeams.length !== 18}
          >
            {loading ? 'Creating...' : 'Create Competition'}
          </Button>
        </div>
      </form>
    </div>
  );
}
