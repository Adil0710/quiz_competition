'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, BookOpen, Trophy, Play } from 'lucide-react';
import Link from 'next/link';

interface Competition {
  _id: string;
  name: string;
  description: string;
  status: 'draft' | 'ongoing' | 'completed';
  currentStage: 'group' | 'semi_final' | 'final';
  teams: any[];
  groups: any[];
  startDate: string;
  createdAt: string;
}

interface Stats {
  totalColleges: number;
  totalTeams: number;
  totalQuestions: number;
  activeCompetitions: number;
}

export default function Dashboard() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalColleges: 0,
    totalTeams: 0,
    totalQuestions: 0,
    activeCompetitions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [competitionsRes, collegesRes, teamsRes, questionsRes] = await Promise.all([
        fetch('/api/competitions'),
        fetch('/api/colleges'),
        fetch('/api/teams'),
        fetch('/api/questions')
      ]);

      const [competitionsData, collegesData, teamsData, questionsData] = await Promise.all([
        competitionsRes.json(),
        collegesRes.json(),
        teamsRes.json(),
        questionsRes.json()
      ]);

      if (competitionsData.success) setCompetitions(competitionsData.data);
      
      setStats({
        totalColleges: collegesData.success ? collegesData.data.length : 0,
        totalTeams: teamsData.success ? teamsData.data.length : 0,
        totalQuestions: questionsData.success ? questionsData.data.length : 0,
        activeCompetitions: competitionsData.success ? 
          competitionsData.data.filter((c: Competition) => c.status === 'ongoing').length : 0
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quiz Competition Dashboard</h1>
          <p className="text-muted-foreground">Manage your quiz competitions, teams, and questions</p>
        </div>
        <div className="flex gap-2">
          <Link href="/colleges">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Manage Colleges
            </Button>
          </Link>
          <Link href="/questions">
            <Button variant="outline">
              <BookOpen className="mr-2 h-4 w-4" />
              Manage Questions
            </Button>
          </Link>
          <Link href="/competitions/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Competition
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Colleges</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalColleges}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuestions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Competitions</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCompetitions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Competitions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Competitions</CardTitle>
          <CardDescription>Overview of all quiz competitions</CardDescription>
        </CardHeader>
        <CardContent>
          {competitions.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No competitions yet</h3>
              <p className="text-muted-foreground">Get started by creating your first competition.</p>
              <Link href="/competitions/create">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Competition
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {competitions.map((competition) => (
                <Card key={competition._id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{competition.name}</h3>
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
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Teams: {competition.teams?.length || 0}</span>
                        <span>Groups: {competition.groups?.length || 0}</span>
                        <span>Started: {new Date(competition.startDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/competitions/${competition._id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {competition.status === 'ongoing' && (
                        <Link href={`/competitions/${competition._id}/manage`}>
                          <Button size="sm">
                            <Play className="mr-2 h-4 w-4" />
                            Manage
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
