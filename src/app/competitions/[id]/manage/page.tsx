'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Play, Pause, SkipForward, Trophy, Users, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Question {
  _id: string;
  question: string;
  type: 'mcq' | 'media' | 'rapid_fire';
  options?: string[];
  correctAnswer?: string;
  mediaUrl?: string;
  mediaType?: string;
  points: number;
}

interface Team {
  _id: string;
  name: string;
  college: { name: string; code: string };
  totalScore: number;
}

interface Group {
  _id: string;
  name: string;
  stage: string;
  teams: Team[];
  currentRound: number;
  maxRounds: number;
}

export default function ManageCompetitionPage() {
  const [competition, setCompetition] = useState<any>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [roundType, setRoundType] = useState<'mcq' | 'media' | 'rapid_fire'>('mcq');
  const [teamScores, setTeamScores] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const [isRoundActive, setIsRoundActive] = useState(false);
  
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
        if (data.data.groups.length > 0) {
          setCurrentGroup(data.data.groups[0]);
          initializeTeamScores(data.data.groups[0].teams);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch competition",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeTeamScores = (teams: Team[]) => {
    const scores: {[key: string]: number} = {};
    teams.forEach(team => {
      scores[team._id] = 0;
    });
    setTeamScores(scores);
  };

  const fetchQuestions = async (type: string, count: number = 6) => {
    try {
      // Use competition-scoped endpoint to prevent repeats within this competition
      const response = await fetch(`/api/competitions/${competitionId}/questions?type=${type}&count=${count}`);
      const data = await response.json();
      if (data.success) {
        const questions = (data.data || []).slice(0, count);
        setCurrentQuestions(questions);
        setCurrentQuestionIndex(0);
        if (!questions.length) {
          toast({
            title: "No questions available",
            description: "No unused questions of this type remain for this competition.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch questions",
        variant: "destructive"
      });
    }
  };

  const startRound = async (type: 'mcq' | 'media' | 'rapid_fire') => {
    setRoundType(type);
    await fetchQuestions(type);
    setIsRoundActive(true);
    toast({
      title: "Round Started",
      description: `${type.toUpperCase()} round has begun`
    });
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      endRound();
    }
  };

  const endRound = () => {
    setIsRoundActive(false);
    toast({
      title: "Round Completed",
      description: "Round has ended. Review scores and proceed to next round."
    });
  };

  const awardPoints = (teamId: string, points: number) => {
    setTeamScores(prev => ({
      ...prev,
      [teamId]: (prev[teamId] || 0) + points
    }));
    toast({
      title: "Points Awarded",
      description: `${points} points awarded to team`
    });
  };

  const advanceToNextStage = async () => {
    if (!currentGroup) return;

    // Get winning teams (top teams from current stage)
    const sortedTeams = currentGroup.teams
      .map(team => ({ ...team, score: teamScores[team._id] || 0 }))
      .sort((a, b) => b.score - a.score);

    let winningTeams: string[] = [];
    let nextStage = '';

    if (currentGroup.stage === 'group') {
      // From group stage, take top 1 team per group
      winningTeams = [sortedTeams[0]._id];
      nextStage = 'semi_final';
    } else if (currentGroup.stage === 'semi_final') {
      // From semi-final, take top 1 team per group
      winningTeams = [sortedTeams[0]._id];
      nextStage = 'final';
    }

    try {
      const response = await fetch(`/api/competitions/${competitionId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: nextStage,
          winningTeams
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: `Teams advanced to ${nextStage.replace('_', ' ')} stage`
        });
        fetchCompetition();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to advance teams",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading competition management...</div>
      </div>
    );
  }

  const currentQuestion = currentQuestions[currentQuestionIndex];

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/competitions/${competitionId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Competition
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Manage Competition</h1>
            <p className="text-muted-foreground">{competition?.name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Quiz Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Round Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Round Control
              </CardTitle>
              <CardDescription>
                Current Group: {currentGroup?.name} | Round {currentGroup?.currentRound || 1} of {currentGroup?.maxRounds || 3}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isRoundActive ? (
                <div className="flex gap-4">
                  <Button onClick={() => startRound('mcq')}>
                    Start MCQ Round
                  </Button>
                  <Button onClick={() => startRound('media')}>
                    Start Media Round
                  </Button>
                  <Button onClick={() => startRound('rapid_fire')}>
                    Start Rapid Fire
                  </Button>
                </div>
              ) : (
                <div className="flex gap-4">
                  <Button onClick={nextQuestion} disabled={!currentQuestion}>
                    Next Question
                  </Button>
                  <Button variant="outline" onClick={endRound}>
                    End Round
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Question */}
          {isRoundActive && currentQuestion && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Question {currentQuestionIndex + 1} of {currentQuestions.length}</span>
                  <Badge>{roundType.toUpperCase()}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-lg font-medium">{currentQuestion.question}</div>
                
                {currentQuestion.mediaUrl && (
                  <div className="border rounded-lg p-4">
                    {currentQuestion.mediaType === 'image' && (
                      <img src={currentQuestion.mediaUrl} alt="Question media" className="max-w-full h-auto" />
                    )}
                    {currentQuestion.mediaType === 'audio' && (
                      <audio controls className="w-full">
                        <source src={currentQuestion.mediaUrl} />
                      </audio>
                    )}
                    {currentQuestion.mediaType === 'video' && (
                      <video controls className="w-full max-h-96">
                        <source src={currentQuestion.mediaUrl} />
                      </video>
                    )}
                  </div>
                )}

                {currentQuestion.options && (
                  <div className="grid grid-cols-2 gap-2">
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                      </div>
                    ))}
                  </div>
                )}

                {roundType === 'rapid_fire' && (
                  <div className="text-center">
                    <p className="text-muted-foreground">Admin will ask the question. Click on team that answers correctly.</p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Points: {currentQuestion.points}</span>
                  {currentQuestion.correctAnswer && roundType !== 'rapid_fire' && (
                    <span className="text-sm font-medium">Answer: {currentQuestion.correctAnswer}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Teams & Scoring */}
        <div className="space-y-6">
          {/* Group Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Group</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={currentGroup?._id} 
                onValueChange={(value) => {
                  const group = competition?.groups.find((g: any) => g._id === value);
                  setCurrentGroup(group);
                  if (group) initializeTeamScores(group.teams);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {competition?.groups.map((group: any) => (
                    <SelectItem key={group._id} value={group._id}>
                      {group.name} ({group.stage})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Team Scores */}
          {currentGroup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Team Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentGroup.teams.map((team) => (
                  <div key={team._id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{team.name}</div>
                      <div className="text-sm text-muted-foreground">{team.college.code}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{teamScores[team._id] || 0}</span>
                      {isRoundActive && currentQuestion && (
                        <Button 
                          size="sm" 
                          onClick={() => awardPoints(team._id, currentQuestion.points)}
                        >
                          +{currentQuestion.points}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Stage Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Stage Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={advanceToNextStage}
                disabled={isRoundActive}
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Advance to Next Stage
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
