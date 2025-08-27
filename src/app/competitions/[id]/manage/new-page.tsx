"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Play, Trophy, Timer, Check, X, SkipForward } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQuizStore } from "@/lib/quiz-store";

interface Team {
  _id: string;
  name: string;
  school: { name: string; code: string };
  totalScore: number;
}

interface Group {
  _id: string;
  name: string;
  teams: Team[];
}

interface Question {
  _id: string;
  type: "mcq" | "media" | "buzzer" | "rapid_fire" | "sequence" | "visual_rapid_fire";
  question: string;
  options?: string[];
  correctAnswer: string;
  media?: {
    type: "image" | "audio" | "video";
    url: string;
  };
  points: number;
}

interface Competition {
  _id: string;
  name: string;
  groups: Group[];
}

export default function ManageCompetitionPage() {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [noQuestionsForType, setNoQuestionsForType] = useState(false);

  const presentRef = useRef<HTMLDivElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;

  // Zustand store
  const {
    currentState,
    roundType,
    currentQuestion,
    currentQuestionIndex,
    questions,
    timeLeft,
    isTimerActive,
    teams,
    teamScores,
    selectedTeamId,
    selectedOption,
    showCorrectAnswer,
    buzzerPressedTeams,
    currentBuzzerTeam,
    sequenceAnswers,
    showSequenceModal,
    isPresenting,
    
    // Actions
    setState,
    setRoundType,
    setCurrentQuestion,
    setQuestions,
    goToNextQuestion,
    startTimer,
    stopTimer,
    updateTimer,
    setTeams,
    updateTeamScore,
    selectTeam,
    awardTeamPoints,
    selectOption: selectMCQOption,
    toggleCorrectAnswer,
    addBuzzerPress,
    clearBuzzerPresses,
    selectBuzzerTeam,
    addSequenceAnswer,
    clearSequenceAnswers,
    toggleSequenceModal,
    setPresenting,
    resetQuestion,
    resetRound
  } = useQuizStore();

  useEffect(() => {
    if (competitionId) {
      fetchCompetition();
    }
  }, [competitionId]);

  // Timer effect
  useEffect(() => {
    if (isTimerActive) {
      timerIntervalRef.current = setInterval(() => {
        updateTimer();
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerActive, updateTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isPresenting || !currentQuestion) return;
      
      const key = event.key.toLowerCase();
      event.preventDefault();
      
      switch (key) {
        case 'q':
          handleQuestionToggle();
          break;
        case 'o':
          handleOptionsToggle();
          break;
        case 'a':
          handleAnswerToggle();
          break;
        case 't':
          handleTimerToggle();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isPresenting, currentQuestion, currentState]);

  // Fullscreen handling
  useEffect(() => {
    const handler = () => {
      const isFs = !!document.fullscreenElement;
      setPresenting(isFs);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [setPresenting]);

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
      console.error('Error fetching competition:', error);
      toast({
        title: "Error",
        description: "Failed to load competition data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeTeamScores = (groupTeams: Team[]) => {
    setTeams(groupTeams);
    const scores: { [key: string]: number } = {};
    groupTeams.forEach(team => {
      scores[team._id] = team.totalScore || 0;
    });
  };

  const loadQuestions = async (type: string) => {
    try {
      const response = await fetch(`/api/competitions/${competitionId}/questions?type=${type}`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        setQuestions(data.data);
        setCurrentQuestion(data.data[0]);
        setNoQuestionsForType(false);
        resetRound();
      } else {
        setNoQuestionsForType(true);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      setNoQuestionsForType(true);
    }
  };

  // Keyboard handlers
  const handleQuestionToggle = () => {
    if (currentState === 'idle') {
      setState('question_shown');
    } else if (currentState === 'question_shown') {
      setState('idle');
    }
  };

  const handleOptionsToggle = () => {
    if (roundType === 'mcq' && currentState === 'question_shown') {
      setState('options_shown');
    }
  };

  const handleAnswerToggle = () => {
    if (currentState === 'options_shown' || currentState === 'question_shown') {
      setState('answer_shown');
    }
  };

  const handleTimerToggle = () => {
    if (isTimerActive) {
      stopTimer();
    } else {
      startTimer();
    }
  };

  const handleRoundTypeChange = (type: string) => {
    setRoundType(type as any);
    loadQuestions(type);
  };

  const handleGroupChange = (groupId: string) => {
    const group = competition?.groups.find(g => g._id === groupId);
    if (group) {
      setCurrentGroup(group);
      initializeTeamScores(group.teams);
    }
  };

  const handleNextQuestion = () => {
    goToNextQuestion();
    resetQuestion();
  };

  const handleOptionSelect = (option: string) => {
    selectMCQOption(option);
    const isCorrect = option === currentQuestion?.correctAnswer;
    
    if (!isCorrect) {
      // Auto-show correct answer for wrong selection
      setTimeout(() => {
        toggleCorrectAnswer();
      }, 1000);
    }
  };

  const handleAwardPoints = async (teamId: string, points: number) => {
    try {
      const response = await fetch(`/api/competitions/${competitionId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, points })
      });
      
      if (response.ok) {
        awardTeamPoints(teamId, points);
        updateTeamScore(teamId, points);
        toast({
          title: "Points Awarded",
          description: `${points} points awarded successfully`,
        });
      }
    } catch (error) {
      console.error('Error awarding points:', error);
      toast({
        title: "Error",
        description: "Failed to award points",
        variant: "destructive",
      });
    }
  };

  const handleBuzzerPress = (teamId: string) => {
    if (!buzzerPressedTeams.includes(teamId)) {
      addBuzzerPress(teamId);
      if (!currentBuzzerTeam) {
        selectBuzzerTeam(teamId);
      }
    }
  };

  const handleSequenceSubmit = (teamId: string, answer: string) => {
    addSequenceAnswer(teamId, answer);
  };

  const enterPresentationMode = async () => {
    if (presentRef.current) {
      try {
        await presentRef.current.requestFullscreen();
      } catch (error) {
        console.error('Error entering fullscreen:', error);
      }
    }
  };

  const exitPresentationMode = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const getDynamicButtonText = () => {
    switch (currentState) {
      case 'idle':
        return 'Show Question';
      case 'question_shown':
        if (roundType === 'mcq') return 'Show Options';
        if (roundType === 'media') return 'Show Media';
        return 'Show Answer';
      case 'options_shown':
        return 'Show Answer';
      case 'answer_shown':
        return 'Next Question';
      default:
        return 'Continue';
    }
  };

  const handleDynamicButtonClick = () => {
    switch (currentState) {
      case 'idle':
        handleQuestionToggle();
        break;
      case 'question_shown':
        if (roundType === 'mcq') {
          handleOptionsToggle();
        } else {
          handleAnswerToggle();
        }
        break;
      case 'options_shown':
        handleAnswerToggle();
        break;
      case 'answer_shown':
        handleNextQuestion();
        break;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Competition Not Found</h2>
            <p className="text-gray-600 mb-4">The requested competition could not be loaded.</p>
            <Link href="/competitions">
              <Button>Back to Competitions</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Controls */}
      <div className="bg-white border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/competitions">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold">{competition.name}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={currentGroup?._id} onValueChange={handleGroupChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Group" />
              </SelectTrigger>
              <SelectContent>
                {competition.groups.map((group) => (
                  <SelectItem key={group._id} value={group._id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={roundType} onValueChange={handleRoundTypeChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">MCQ Round</SelectItem>
                <SelectItem value="media">Media Round</SelectItem>
                <SelectItem value="buzzer">Buzzer Round</SelectItem>
                <SelectItem value="rapid_fire">Rapid Fire</SelectItem>
                <SelectItem value="sequence">Sequence Round</SelectItem>
                <SelectItem value="visual_rapid_fire">Visual Rapid Fire</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={enterPresentationMode}>
              <Play className="w-4 h-4 mr-2" />
              Present
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Timer Display */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Timer className="w-5 h-5 mr-2" />
                  Timer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-6xl font-mono text-center mb-4">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <Button 
                  onClick={handleTimerToggle}
                  className="w-full"
                  variant={isTimerActive ? "destructive" : "default"}
                >
                  {isTimerActive ? "Stop" : "Start"} Timer
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {noQuestionsForType ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">No Questions Available</h3>
                  <p className="text-gray-600">No questions found for the selected round type.</p>
                </CardContent>
              </Card>
            ) : currentQuestion ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>
                      Question {currentQuestionIndex + 1} - {roundType.toUpperCase()}
                    </CardTitle>
                    <Badge variant="secondary">{currentQuestion.points} points</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Question Display */}
                  {currentState !== 'idle' && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-4">{currentQuestion.question}</h3>
                      
                      {/* Media Display */}
                      {currentQuestion.media && currentState !== 'idle' && (
                        <div className="mb-4">
                          {currentQuestion.media.type === 'image' && (
                            <img 
                              src={currentQuestion.media.url} 
                              alt="Question media"
                              className="max-w-full h-auto rounded"
                            />
                          )}
                          {currentQuestion.media.type === 'audio' && (
                            <audio controls className="w-full">
                              <source src={currentQuestion.media.url} />
                            </audio>
                          )}
                          {currentQuestion.media.type === 'video' && (
                            <video controls className="w-full max-w-md">
                              <source src={currentQuestion.media.url} />
                            </video>
                          )}
                        </div>
                      )}
                      
                      {/* MCQ Options */}
                      {roundType === 'mcq' && currentQuestion.options && currentState === 'options_shown' && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {currentQuestion.options.map((option, index) => (
                            <Button
                              key={index}
                              variant={
                                selectedOption === option
                                  ? option === currentQuestion.correctAnswer
                                    ? "default"
                                    : "destructive"
                                  : showCorrectAnswer && option === currentQuestion.correctAnswer
                                  ? "default"
                                  : "outline"
                              }
                              className={
                                showCorrectAnswer && option === currentQuestion.correctAnswer
                                  ? "bg-green-500 hover:bg-green-600 text-white"
                                  : ""
                              }
                              onClick={() => handleOptionSelect(option)}
                            >
                              {String.fromCharCode(65 + index)}. {option}
                            </Button>
                          ))}
                        </div>
                      )}
                      
                      {/* Answer Display */}
                      {currentState === 'answer_shown' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-800 mb-2">Correct Answer:</h4>
                          <p className="text-green-700">{currentQuestion.correctAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Dynamic Action Button */}
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleDynamicButtonClick}
                      size="lg"
                      className="px-8"
                    >
                      {getDynamicButtonText()}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-600">Select a round type to begin</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Team Scores */}
        {currentGroup && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Team Scores - {currentGroup.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {currentGroup.teams.map((team) => (
                  <div key={team._id} className="text-center p-4 border rounded-lg">
                    <h3 className="font-bold text-lg">{team.name}</h3>
                    <p className="text-sm text-gray-600">{team.school.name}</p>
                    <p className="text-2xl font-mono font-bold mt-2">
                      {teamScores[team._id] || 0}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleAwardPoints(team._id, currentQuestion?.points || 10)}
                        disabled={!currentQuestion}
                      >
                        +{currentQuestion?.points || 10}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleAwardPoints(team._id, -(currentQuestion?.points || 10))}
                        disabled={!currentQuestion}
                      >
                        -{currentQuestion?.points || 10}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Presentation Mode */}
      <div ref={presentRef} className={`${isPresenting ? 'block' : 'hidden'} fixed inset-0 bg-black text-white z-50`}>
        <div className="h-full flex flex-col">
          {/* Presentation Header */}
          <div className="bg-gray-900 p-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">{competition.name}</h1>
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-mono">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <Button onClick={exitPresentationMode} variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Presentation Content */}
          <div className="flex-1 flex items-center justify-center p-8">
            {currentQuestion && currentState !== 'idle' ? (
              <div className="text-center max-w-4xl">
                <h2 className="text-4xl font-bold mb-8">{currentQuestion.question}</h2>
                
                {/* Media in presentation */}
                {currentQuestion.media && (
                  <div className="mb-8">
                    {currentQuestion.media.type === 'image' && (
                      <img 
                        src={currentQuestion.media.url} 
                        alt="Question media"
                        className="max-w-full max-h-96 mx-auto rounded"
                      />
                    )}
                    {currentQuestion.media.type === 'video' && (
                      <video controls className="max-w-full max-h-96 mx-auto">
                        <source src={currentQuestion.media.url} />
                      </video>
                    )}
                  </div>
                )}
                
                {/* MCQ Options in presentation */}
                {roundType === 'mcq' && currentQuestion.options && currentState === 'options_shown' && (
                  <div className="grid grid-cols-2 gap-6 text-2xl">
                    {currentQuestion.options.map((option, index) => (
                      <div
                        key={index}
                        className={`p-6 border-2 rounded-lg ${
                          showCorrectAnswer && option === currentQuestion.correctAnswer
                            ? 'bg-green-600 border-green-400'
                            : selectedOption === option
                            ? option === currentQuestion.correctAnswer
                              ? 'bg-green-600 border-green-400'
                              : 'bg-red-600 border-red-400'
                            : 'border-gray-400'
                        }`}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Answer in presentation */}
                {currentState === 'answer_shown' && (
                  <div className="bg-green-600 border-2 border-green-400 rounded-lg p-8 text-3xl">
                    <h3 className="font-bold mb-4">Correct Answer:</h3>
                    <p>{currentQuestion.correctAnswer}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-6xl font-bold mb-4">Ready</h2>
                <p className="text-2xl text-gray-400">Press Q to show question</p>
              </div>
            )}
          </div>

          {/* Team Scores in presentation */}
          {currentGroup && (
            <div className="bg-gray-900 p-4">
              <div className="flex justify-around">
                {currentGroup.teams.map((team) => (
                  <div key={team._id} className="text-center">
                    <h3 className="text-xl font-bold">{team.name}</h3>
                    <p className="text-3xl font-mono font-bold">
                      {teamScores[team._id] || 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-4 left-4 text-sm text-gray-400">
            Q: Question | O: Options | A: Answer | T: Timer
          </div>
        </div>
      </div>

      {/* Sequence Modal */}
      {showSequenceModal && (
        <Dialog open={showSequenceModal} onOpenChange={toggleSequenceModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sequence Answers Comparison</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {sequenceAnswers.map((answer) => {
                const team = teams.find(t => t._id === answer.teamId);
                const isCorrect = answer.answer.toLowerCase().trim() === currentQuestion?.correctAnswer.toLowerCase().trim();
                
                return (
                  <div key={answer.teamId} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <h4 className="font-semibold">{team?.name}</h4>
                      <p className="text-gray-600">{answer.answer}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isCorrect ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                      <Button
                        size="sm"
                        variant={isCorrect ? "default" : "outline"}
                        onClick={() => handleAwardPoints(answer.teamId, currentQuestion?.points || 10)}
                      >
                        Award Points
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button onClick={toggleSequenceModal}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
