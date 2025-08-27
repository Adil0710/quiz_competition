'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface School {
  _id: string;
  name: string;
  code: string;
}

export default function CreateTeamPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
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
  const router = useRouter();

  useEffect(() => {
    fetchSchools();
  }, []);

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
    
    // Filter valid members (only those with at least a name)
    const validMembers = formData.members.filter(member => 
      member.name.trim()
    );

    // Ensure at least one captain exists if members are provided
    if (validMembers.length > 0) {
      const hasCaptain = validMembers.some(member => member.role === 'captain');
      if (!hasCaptain) {
        validMembers[0].role = 'captain';
      }
    }

    setLoading(true);

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          members: validMembers
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Team created successfully"
        });
        router.push('/teams');
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create team",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMember = (index: number, field: string, value: string) => {
    const newMembers = [...formData.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData({ ...formData, members: newMembers });
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/teams">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teams
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Team</h1>
          <p className="text-muted-foreground">Add a new team for competition</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Team Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Information
            </CardTitle>
            <CardDescription>Basic team details and school affiliation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              {schools.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No schools available. <Link href="/schools" className="text-primary underline">Add schools first</Link>.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Add team members (optional - can be added later)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.members.map((member, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Member {index + 1}</h4>
                    <Select 
                      value={member.role} 
                      onValueChange={(value) => updateMember(index, 'role', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="captain">Captain</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Name</Label>
                      <Input
                        value={member.name}
                        onChange={(e) => updateMember(index, 'name', e.target.value)}
                        placeholder="Member name"
                      />
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
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/teams">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button 
            type="submit" 
            disabled={loading || !formData.name || !formData.school}
          >
            {loading ? 'Creating...' : 'Create Team'}
          </Button>
        </div>
      </form>
    </div>
  );
}
