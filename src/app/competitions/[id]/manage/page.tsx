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
  correctAnswer?: string | number;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'video';
  points: number;
  phase: 'league' | 'semi_final' | 'final';
}

interface Competition {
  _id: string;
  name: string;
  groups: Group[];
  teams?: Array<{
    _id: string;
    name: string;
  }>;
}

export default function ManageCompetitionPage() {
  const [currentPhase, setCurrentPhase] = useState<string>('league');
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);

  // Phase structure definition
  const phaseStructure = {
    league: [
      { name: 'MCQ Round', type: 'mcq' },
      { name: 'Media Round', type: 'media' },
      { name: 'Buzzer Round', type: 'buzzer' }
    ],
    semi_final: [
      { name: 'MCQ Round', type: 'mcq' },
      { name: 'Media Round', type: 'media' },
      { name: 'Buzzer Round', type: 'buzzer' },
      { name: 'Rapid Fire Round', type: 'rapid_fire' }
    ],
    final: [
      { name: 'Sequence Round', type: 'sequence' },
      { name: 'Media Round', type: 'media' },
      { name: 'Buzzer Round', type: 'buzzer' },
      { name: 'Visual Rapid Fire Round', type: 'visual_rapid_fire' }
    ]
  };
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [noQuestionsForType, setNoQuestionsForType] = useState(false);

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState<boolean>(false);
  const [mediaLoading, setMediaLoading] = useState<boolean>(false);
  const [showGroupSummaryModal, setShowGroupSummaryModal] = useState(false);

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
    isOptionCorrect,
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
    nextQuestion,
    startTimer,
    stopTimer,
    updateTimer,
    setTeams,
    updateTeamScore,
    selectTeam,
    awardPoints,
    selectOption,
    toggleCorrectAnswer,
    addBuzzerPress,
    clearBuzzerPresses,
    selectBuzzerTeam,
    addSequenceAnswer,
    clearSequenceAnswers,
    toggleSequenceModal,
    setPresenting,
    resetRound
  } = useQuizStore();

  const resetQuestion = () => {
    resetRound();
    setSelectedTeam(null);
    setState('idle'); // Always start with hidden question
  };

  useEffect(() => {
    if (competitionId) {
      fetchCompetition();
    }
  }, [competitionId]);

  // Initialize first round when competition loads
  useEffect(() => {
    if (competition && currentGroup && !currentQuestion) {
      console.log('Auto-loading questions for competition start');
      const firstRound = getCurrentRound();
      setRoundType(firstRound.type as any);
      loadQuestions(firstRound.type, currentPhase);
    }
  }, [competition, currentGroup]);

  // Ensure questions are loaded when needed
  useEffect(() => {
    if (competition && currentGroup && roundType && !currentQuestion && !noQuestionsForType) {
      console.log('Ensuring questions are loaded for round type:', roundType);
      loadQuestions(roundType, currentPhase);
    }
  }, [competition, currentGroup, roundType, currentQuestion, noQuestionsForType, currentPhase]);

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
      console.log('Key pressed:', event.key, 'Current question exists:', !!currentQuestion, 'Competition loaded:', !!competition);
      
      // Only handle shortcuts if not typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        console.log('Typing in input field, ignoring key press');
        return;
      }
      
      const key = event.key.toLowerCase();
      console.log('Processing key:', key, 'Current state:', currentState);
      event.preventDefault();
      
      switch (key) {
        case 'q':
          console.log('Q key detected');
          if (!currentQuestion && competition && currentGroup) {
            console.log('No question loaded, loading questions first');
            const firstRound = getCurrentRound();
            setRoundType(firstRound.type as any);
            loadQuestions(firstRound.type, currentPhase);
          } else if (currentQuestion) {
            console.log('Question exists, calling handleQuestionToggle');
            handleQuestionToggle();
          }
          break;
        case 'o':
          console.log('O key detected, currentQuestion:', !!currentQuestion, 'currentState:', currentState);
          handleOptionsToggle();
          break;
        case 'a':
          console.log('A key detected');
          if (currentQuestion) {
            if (roundType === 'media') {
              handleMediaAnswerToggle();
            } else {
              handleAnswerToggle();
            }
          }
          break;
        case 't':
          console.log('T key detected');
          handleTimerToggle();
          break;
        case 'n':
          console.log('N key detected - next question');
          if (currentQuestion) {
            handleNextQuestion();
          }
          break;
        default:
          console.log('Unhandled key:', key);
      }
    };

    console.log('Setting up keyboard listener, currentQuestion:', !!currentQuestion, 'competition:', !!competition);
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      console.log('Removing keyboard listener');
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [currentQuestion, currentState, competition, currentGroup, currentPhase]);

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
        
        // Automatically set phase based on competition's current stage
        const stageToPhaseMap = {
          'group': 'league',
          'semi_final': 'semi_final', 
          'final': 'final'
        };
        const mappedPhase = stageToPhaseMap[data.data.currentStage as keyof typeof stageToPhaseMap] || 'league';
        setCurrentPhase(mappedPhase);
        
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
    // Initialize team scores from database totalScore
    groupTeams.forEach(team => {
      if (team.totalScore) {
        updateTeamScore(team._id, team.totalScore);
      }
    });
  };

  // Phase and round management functions
  const getCurrentRound = () => {
    const rounds = phaseStructure[currentPhase as keyof typeof phaseStructure];
    return rounds[currentRoundIndex] || rounds[0];
  };

  const getQuestionCount = (type: string, phase: string, teamCount: number, groupCount: number) => {
    // Calculate based on round type and phase
    if (type === 'mcq' || type === 'media') {
      return teamCount * 2; // 2 questions per team
    } else if (type === 'buzzer') {
      return 5; // 5 questions per group (fixed)
    } else if (type === 'rapid_fire') {
      return teamCount * 20; // 20 questions per team
    } else if (type === 'sequence') {
      return teamCount * 2; // 2 questions per team
    } else if (type === 'visual_rapid_fire') {
      return teamCount * 20; // 20 questions per team (updated from 25)
    }
    
    return 10; // Default fallback
  };

  const nextRound = () => {
    const rounds = phaseStructure[currentPhase as keyof typeof phaseStructure];
    if (currentRoundIndex < rounds.length - 1) {
      const nextIndex = currentRoundIndex + 1;
      setCurrentRoundIndex(nextIndex);
      const nextRoundType = rounds[nextIndex].type;
      setRoundType(nextRoundType as any);
      loadQuestions(nextRoundType, currentPhase);
    }
  };

  const previousRound = () => {
    if (currentRoundIndex > 0) {
      const prevIndex = currentRoundIndex - 1;
      setCurrentRoundIndex(prevIndex);
      const rounds = phaseStructure[currentPhase as keyof typeof phaseStructure];
      const prevRoundType = rounds[prevIndex].type;
      setRoundType(prevRoundType as any);
      loadQuestions(prevRoundType, currentPhase);
    }
  };

  const changePhase = (newPhase: string) => {
    setCurrentPhase(newPhase);
    setCurrentRoundIndex(0);
    const rounds = phaseStructure[newPhase as keyof typeof phaseStructure];
    const firstRoundType = rounds[0].type;
    setRoundType(firstRoundType as any);
    loadQuestions(firstRoundType, newPhase);
  };

  const preloadMedia = (mediaUrl: string, mediaType: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (mediaType === 'image') {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = mediaUrl;
      } else if (mediaType === 'audio') {
        const audio = new Audio();
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject();
        audio.src = mediaUrl;
      } else if (mediaType === 'video') {
        const video = document.createElement('video');
        video.oncanplaythrough = () => resolve();
        video.onerror = () => reject();
        video.src = mediaUrl;
      } else {
        resolve();
      }
    });
  };

  const preloadAllMedia = async (questions: any[]) => {
    const mediaQuestions = questions.filter(q => q.mediaUrl);
    if (mediaQuestions.length === 0) return;

    console.log(`Preloading ${mediaQuestions.length} media files...`);
    setMediaLoading(true);

    try {
      await Promise.all(
        mediaQuestions.map(q => preloadMedia(q.mediaUrl, q.mediaType))
      );
      console.log('All media preloaded successfully');
      setMediaLoaded(true);
    } catch (error) {
      console.warn('Some media failed to preload:', error);
      setMediaLoaded(true); // Continue anyway
    } finally {
      setMediaLoading(false);
    }
  };

  const loadQuestions = async (type: string, phase: string = 'league') => {
    console.log('Loading questions for type:', type, 'phase:', phase, 'Competition ID:', competitionId);
    
    if (!competition || !currentGroup) {
      console.log('Competition or group not loaded yet');
      return;
    }

    const teamCount = currentGroup.teams.length;
    const groupCount = competition.groups.length;
    const requiredCount = getQuestionCount(type, phase, teamCount, groupCount);
    
    try {
      const response = await fetch(`/api/competitions/${competitionId}/questions?type=${type}&phase=${phase}&count=${requiredCount}`);
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success && data.data && data.data.length > 0) {
        console.log('Questions loaded successfully:', data.data.length, 'questions');
        setQuestions(data.data);
        setCurrentQuestion(data.data[0]);
        console.log('Set current question:', data.data[0]);
        setNoQuestionsForType(false);
        setMediaLoaded(false);
        
        // Preload media for media rounds
        if (type === 'media' || type === 'visual_rapid_fire') {
          preloadAllMedia(data.data);
        } else {
          setMediaLoaded(true); // No media to load
        }
        
        toast({
          title: "Questions Loaded",
          description: `Loaded ${data.data.length} ${type} questions for ${phase} phase`,
        });
      } else {
        console.log('No questions available for type:', type, 'phase:', phase, 'API response:', data);
        setNoQuestionsForType(true);
        toast({
          title: "No Questions Available",
          description: `No ${type} questions found for ${phase} phase. Please add questions to the database.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      setNoQuestionsForType(true);
      toast({
        title: "Error Loading Questions",
        description: "Failed to load questions from database",
        variant: "destructive",
      });
    }
  };

  // Keyboard handlers
  const handleQuestionToggle = () => {
    console.log('Q pressed! Current state:', currentState, 'Has question:', !!currentQuestion);
    
    if (currentState === 'idle') {
      if (roundType === 'buzzer') {
        setState('question_shown'); // For buzzer, show question AND team selection
      } else {
        setState('question_shown'); // For other rounds, just show question
      }
    } else {
      setState('idle');
    }
  };

  const handleOptionsToggle = () => {
    console.log('O pressed! Current state:', currentState, 'Round type:', roundType, 'Has question:', !!currentQuestion);
    
    // Always set to options_shown regardless of current state
    setState('options_shown');
    
    if (roundType === 'mcq') {
      startTimer(15); // 15 second timer for MCQ
      console.log('MCQ: Showing options with 15s timer, state set to options_shown');
    } else if (roundType === 'media') {
      // For media, NEVER start timer immediately - always wait for media to load
      if (currentQuestion?.mediaUrl) {
        console.log('Media: Waiting for media to load before starting timer');
        // Timer will start when media loads via onLoad/onCanPlayThrough events
      } else {
        startTimer(15); // No media, start timer normally
      }
    } else if (roundType === 'buzzer') {
      console.log('Buzzer: Showing options for team selection');
    } else if (roundType === 'rapid_fire') {
      startTimer(60); // 1 minute timer for rapid fire
      console.log('Rapid Fire: Starting 1 minute timer');
    } else if (roundType === 'sequence') {
      console.log('Sequence: Showing options for sequence input');
    } else if (roundType === 'visual_rapid_fire') {
      // For visual rapid fire, NEVER start timer immediately - always wait for images
      if (currentQuestion?.mediaUrl) {
        console.log('Visual Rapid Fire: Waiting for images to load before starting timer');
        // Timer will start when image loads via onLoad event
      } else {
        startTimer(60); // No media, start timer normally
      }
    }
    
    // Log the state after setting
    setTimeout(() => {
      console.log('State after O key:', currentState);
    }, 100);
  };

  const handleAnswerToggle = () => {
    // For MCQ, don't show separate answer state - options already show correct/incorrect
    if (roundType === 'mcq') {
      return; // Skip answer toggle for MCQ
    }
    
    if (currentState === 'options_shown' || currentState === 'question_shown') {
      setState('answer_shown');
      stopTimer();
    }
  };

  const handleMediaAnswerToggle = async () => {
    if (currentState === 'answer_shown') {
      setState('options_shown');
    } else {
      setState('answer_shown');
      
      // Media answers are awarded manually via point buttons
      // No automatic scoring for media rounds
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
    loadQuestions(type, 'league'); // Default to league phase
  };

  const handleGroupChange = (groupId: string) => {
    const group = competition?.groups.find(g => g._id === groupId);
    if (group) {
      setCurrentGroup(group);
      initializeTeamScores(group.teams);
    }
  };

  const handleStartNextGroup = () => {
    const currentGroupIndex = competition?.groups.findIndex(g => g._id === currentGroup?._id) || 0;
    const nextGroupIndex = currentGroupIndex + 1;
    
    if (competition && nextGroupIndex < competition.groups.length) {
      const nextGroup = competition.groups[nextGroupIndex];
      setCurrentGroup(nextGroup);
      setShowGroupSummaryModal(false);
      
      // Reset to first round of Phase 1
      setCurrentRoundIndex(0);
      setRoundType('mcq');
      loadQuestions('mcq', 'league');
      resetQuestion();
      setState('idle');
      
      toast({
        title: "New Group Started",
        description: `Starting Phase 1 for ${nextGroup.name}`,
      });
    } else {
      toast({
        title: "All Groups Complete",
        description: "All groups have completed Phase 1!",
      });
      setShowGroupSummaryModal(false);
    }
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    
    // Check if we've reached the end of questions for this round
    if (nextIndex >= questions.length) {
      const currentRound = getCurrentRound();
      const nextRoundIndex = currentRoundIndex + 1;
      const nextRound = phaseStructure[currentPhase as keyof typeof phaseStructure][nextRoundIndex];
      
      if (nextRound) {
        toast({
          title: "Round Complete",
          description: `${currentRound.name} completed! Moving to ${nextRound.name}...`,
        });
        
        // Reset question state before moving to next round
        resetQuestion();
        setState('idle');
        
        // Move to next round with a small delay to show the toast
        setTimeout(() => {
          setCurrentRoundIndex(nextRoundIndex);
          setRoundType(nextRound.type as any);
          loadQuestions(nextRound.type, currentPhase);
          
          // Show instructions for the new round
          toast({
            title: `${nextRound.name} Started`,
            description: `Press Q to show the first question`,
          });
        }, 1500);
      } else {
        // Check if this is the end of Phase 1 (buzzer round completion)
        if (currentPhase === 'league' && roundType === 'buzzer') {
          setShowGroupSummaryModal(true);
        } else {
          toast({
            title: "Phase Complete",
            description: `All rounds in ${currentPhase} phase completed!`,
          });
          resetQuestion();
          setState('idle');
        }
      }
      return;
    }
    
    nextQuestion();
    setSelectedTeam(null); // Clear selected team for buzzer rounds
    setState('idle'); // Reset to hidden state
  };

  const handleOptionSelect = (option: string, index: number) => {
    selectOption(index);
    const correctAnswer = currentQuestion?.correctAnswer;
    let isCorrect = false;
    
    if (typeof correctAnswer === 'number') {
      isCorrect = index === correctAnswer;
    } else if (typeof correctAnswer === 'string') {
      isCorrect = option === correctAnswer;
    }
    
    if (!isCorrect) {
      // Auto-show correct answer for wrong selection
      setTimeout(() => {
        toggleCorrectAnswer();
      }, 1000);
    }
  };

  const handleAwardPoints = async (teamId: string, points: number) => {
    // Only award points if an option was selected and it's correct
    if (roundType === 'mcq' && selectedOption === null) {
      toast({
        title: "No Selection",
        description: "Please select an answer first",
        variant: "destructive",
      });
      return;
    }

    // For MCQ, check if the selected answer is correct
    if (roundType === 'mcq' && !isOptionCorrect) {
      toast({
        title: "Incorrect Answer",
        description: "No points awarded for wrong answer",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update team's totalScore directly in the Team model
      const response = await fetch(`/api/teams/${teamId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points })
      });
      
      if (response.ok) {
        // Update local state
        updateTeamScore(teamId, points);
        
        // Also update the team's totalScore in the current group
        if (currentGroup) {
          const updatedTeams = currentGroup.teams.map(team => 
            team._id === teamId 
              ? { ...team, totalScore: (team.totalScore || 0) + points }
              : team
          );
          setCurrentGroup({ ...currentGroup, teams: updatedTeams });
        }
        
        toast({
          title: "Points Awarded",
          description: `${points > 0 ? '+' : ''}${points} points awarded`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to award points');
      }
    } catch (error) {
      console.error('Error awarding points:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to award points",
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

  const handleSequenceSubmit = (optionIndex: number) => {
    if (sequenceAnswers.includes(optionIndex)) {
      // Remove if already selected - clear and re-add others
      clearSequenceAnswers();
      sequenceAnswers.filter(i => i !== optionIndex).forEach(i => addSequenceAnswer(i));
    } else {
      // Add to sequence
      addSequenceAnswer(optionIndex);
    }
  };

  const handleBuzzerAnswer = (option: string, index: number) => {
    selectOption(index);
    
    if (!currentQuestion) return;
    
    // Check if answer is correct
    const isCorrect = typeof currentQuestion.correctAnswer === 'string' 
      ? option === currentQuestion.correctAnswer 
      : index === currentQuestion.correctAnswer;
    
    if (isCorrect) {
      toggleCorrectAnswer(); // Show correct answer feedback
    }
    
    if (selectedTeam && isCorrect) {
      // Award points for correct answer
      updateTeamScore(selectedTeam, currentQuestion.points);
      toast({
        title: "Correct Answer!",
        description: `${competition?.teams?.find(t => t._id === selectedTeam)?.name} gets ${currentQuestion.points} points`,
      });
    } else if (selectedTeam && !isCorrect) {
      // Deduct points for wrong answer in buzzer round
      updateTeamScore(selectedTeam, -currentQuestion.points);
      toast({
        title: "Wrong Answer!",
        description: `${competition?.teams?.find(t => t._id === selectedTeam)?.name} loses ${currentQuestion.points} points`,
        variant: "destructive",
      });
    }
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
    if (currentState === 'idle') {
      return 'Show Question (Q)';
    } else if (currentState === 'question_shown') {
      if (roundType === 'rapid_fire') {
        return 'Start 1 Min Timer (O)';
      } else if (roundType === 'visual_rapid_fire') {
        return 'Start 1 Min Timer & Show Images (O)';
      } else if (roundType === 'mcq') {
        return 'Show Options & Start Timer (O)';
      } else if (roundType === 'media') {
        return 'Show Media (O)';
      } else if (roundType === 'buzzer') {
        return 'Show Options (O)';
      } else if (roundType === 'sequence') {
        return 'Show Options (O)';
      }
      return 'Show Options (O)';
    } else if (currentState === 'options_shown') {
      if (roundType === 'sequence') {
        return 'Compare Sequence (A)';
      }
      if (roundType === 'mcq' || roundType === 'media') {
        return 'Next Question (N)';
      }
      return 'Show Answer (A)';
    } else if (currentState === 'answer_shown') {
      return 'Next Question';
    }
    return 'Continue';
  };

  const handleDynamicButtonClick = () => {
    if (currentState === 'idle') {
      handleQuestionToggle();
    } else if (currentState === 'question_shown') {
      handleOptionsToggle();
    } else if (currentState === 'options_shown') {
      if (roundType === 'sequence') {
        toggleSequenceModal();
      } else if (roundType === 'mcq' || roundType === 'media') {
        handleNextQuestion();
      } else {
        handleAnswerToggle();
      }
    } else if (currentState === 'answer_shown') {
      handleNextQuestion();
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
            
            {/* Phase Management - Auto-detected */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Phase:</span>
              <Badge variant="secondary" className="px-3 py-1">
                {currentPhase === 'league' ? 'League' : 
                 currentPhase === 'semi_final' ? 'Semi-Final' : 
                 'Final'}
              </Badge>
              <span className="text-xs text-gray-500">(Auto-detected from competition stage)</span>
            </div>

            {/* Round Management */}
            <div className="flex items-center space-x-2">
              <Button 
                onClick={previousRound} 
                disabled={currentRoundIndex === 0}
                variant="outline"
                size="sm"
              >
                ← Prev
              </Button>
              <div className="text-center min-w-[120px]">
                <div className="text-sm font-medium">{getCurrentRound().name}</div>
                <div className="text-xs text-gray-500">
                  {currentRoundIndex + 1} / {phaseStructure[currentPhase as keyof typeof phaseStructure].length}
                </div>
              </div>
              <Button 
                onClick={nextRound} 
                disabled={currentRoundIndex === phaseStructure[currentPhase as keyof typeof phaseStructure].length - 1}
                variant="outline"
                size="sm"
              >
                Next →
              </Button>
            </div>
            
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
                <div className="text-8xl font-mono text-center mb-4 font-bold">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <Button 
                  onClick={handleTimerToggle}
                  className="w-full mb-4"
                  variant={isTimerActive ? "destructive" : "default"}
                >
                  {isTimerActive ? "Stop" : "Start"} Timer
                </Button>
                
                {/* Debug State Display */}
                <div className="text-sm space-y-1 p-2 bg-gray-100 rounded">
                  <div><strong>State:</strong> {currentState}</div>
                  <div><strong>Round:</strong> {roundType}</div>
                  <div><strong>Question:</strong> {currentQuestion ? 'Loaded' : 'None'}</div>
                  <div><strong>Index:</strong> {currentQuestionIndex + 1}</div>
                </div>
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
                      
                      {/* Media Display - Only show when options are shown for media rounds */}
                      {currentQuestion.mediaUrl && currentState === 'options_shown' && (
                        <div className="text-center mb-6">
                          {currentQuestion.mediaType === 'image' && (
                            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
                              <img 
                                src={currentQuestion.mediaUrl} 
                                alt="Question media" 
                                className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                              />
                            </div>
                          )}
                          {currentQuestion.mediaType === 'audio' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                              <div className="flex items-center justify-center mb-4">
                                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793l-4.146-3.317a1 1 0 00-.632-.226H2a1 1 0 01-1-1V7.618a1 1 0 011-1h1.605a1 1 0 00.632-.226l4.146-3.317z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                              <audio controls className="w-full max-w-md mx-auto">
                                <source src={currentQuestion.mediaUrl} />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          )}
                          {currentQuestion.mediaType === 'video' && (
                            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
                              <video controls className="w-full max-w-2xl mx-auto rounded-lg shadow-lg">
                                <source src={currentQuestion.mediaUrl} />
                                Your browser does not support the video element.
                              </video>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Round-specific Content */}
                      
                      {/* MCQ Options */}
                      {roundType === 'mcq' && currentQuestion?.options && (currentState === 'options_shown' || (currentState === 'timer_running' && isTimerActive)) && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {currentQuestion.options.map((option, index) => (
                            <Button
                              key={index}
                              variant={
                                selectedOption === index
                                  ? (typeof currentQuestion.correctAnswer === 'string' ? option === currentQuestion.correctAnswer : index === currentQuestion.correctAnswer)
                                    ? "default"
                                    : "destructive"
                                  : showCorrectAnswer && (typeof currentQuestion.correctAnswer === 'string' ? option === currentQuestion.correctAnswer : index === currentQuestion.correctAnswer)
                                  ? "default"
                                  : "outline"
                              }
                              className={
                                `text-lg p-4 h-auto ${
                                  selectedOption === index
                                    ? (typeof currentQuestion.correctAnswer === 'string' ? option === currentQuestion.correctAnswer : index === currentQuestion.correctAnswer)
                                      ? "bg-green-500 hover:bg-green-600 text-white"
                                      : "bg-red-500 hover:bg-red-600 text-white"
                                    : showCorrectAnswer && (typeof currentQuestion.correctAnswer === 'string' ? option === currentQuestion.correctAnswer : index === currentQuestion.correctAnswer)
                                    ? "bg-green-500 hover:bg-green-600 text-white"
                                    : ""
                                }`
                              }
                              onClick={() => handleOptionSelect(option, index)}
                            >
                              {String.fromCharCode(65 + index)}. {option}
                            </Button>
                          ))}
                        </div>
                      )}
                      
                      {/* Media Round Content */}
                      {roundType === 'media' && currentState === 'options_shown' && currentQuestion.mediaUrl && (
                        <div className="text-center mb-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-blue-800 font-semibold">Media content is displayed above. Press A to show answer or award points manually.</p>
                          </div>
                        </div>
                      )}

                      {/* Media Round Answer Display */}
                      {roundType === 'media' && currentState === 'answer_shown' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <h4 className="font-semibold text-green-800 mb-2">Answer:</h4>
                          <p className="text-green-700 text-lg">{currentQuestion?.correctAnswer}</p>
                        </div>
                      )}
                      
                      {/* Buzzer Round Team Selection */}
                      {roundType === 'buzzer' && (currentState === 'question_shown' || currentState === 'options_shown') && (
                        <div className="space-y-4 mb-4">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-yellow-800 font-semibold text-lg">🔔 Buzzer Round - Select Team That Buzzed First</p>
                            <p className="text-yellow-700 mt-2">Click on the team that pressed their buzzer first to answer</p>
                          </div>
                          
                          {/* Team Selection Buttons */}
                          <div className="grid grid-cols-3 gap-3">
                            {currentGroup?.teams?.map((team, index) => (
                              <Button
                                key={team._id}
                                variant={selectedTeam === team._id ? "default" : "outline"}
                                className={`text-lg p-4 h-auto ${
                                  selectedTeam === team._id 
                                    ? "bg-blue-500 hover:bg-blue-600 text-white" 
                                    : "hover:bg-blue-50"
                                }`}
                                onClick={() => setSelectedTeam(team._id)}
                              >
                                <div className="text-center">
                                  <div className="font-bold">{team.name}</div>
                                  <div className="text-sm opacity-75">Score: {teamScores[team._id] || 0}</div>
                                </div>
                              </Button>
                            ))}
                          </div>
                          
                          {/* Answer Options after team selection */}
                          {selectedTeam && currentQuestion.options && (
                            <div className="mt-4">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                <p className="text-blue-800 font-medium">
                                  Selected Team: {currentGroup?.teams?.find(t => t._id === selectedTeam)?.name}
                                </p>
                                <p className="text-blue-700 text-sm">Now select their answer:</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {currentQuestion.options.map((option, index) => (
                                  <Button
                                    key={index}
                                    variant={selectedOption === index ? "default" : "outline"}
                                    className={`text-lg p-3 h-auto ${
                                      selectedOption === index 
                                        ? (typeof currentQuestion.correctAnswer === 'string' 
                                            ? option === currentQuestion.correctAnswer 
                                            : index === currentQuestion.correctAnswer)
                                          ? "bg-green-500 hover:bg-green-600 text-white"
                                          : "bg-red-500 hover:bg-red-600 text-white"
                                        : ""
                                    }`}
                                    onClick={() => handleBuzzerAnswer(option, index)}
                                  >
                                    {String.fromCharCode(65 + index)}. {option}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      
                      {/* Rapid Fire Round */}
                      {roundType === 'rapid_fire' && currentState === 'options_shown' && (
                        <div className="text-center mb-4">
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <p className="text-orange-800 font-semibold text-xl">Rapid Fire Round - 1 Minute Timer</p>
                            <p className="text-orange-700 mt-2">Questions asked orally. Press T to start 1-minute timer. Award points for correct answers.</p>
                            <div className="mt-3">
                              <div className="text-2xl font-mono font-bold text-orange-800">
                                Timer: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Sequence Round Options */}
                      {roundType === 'sequence' && currentQuestion.options && currentState === 'options_shown' && (
                        <div className="space-y-3 mb-4">
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <p className="text-purple-800 font-semibold">🔢 Sequence Round - Click options in the order given by the team:</p>
                            <p className="text-purple-700 text-sm mt-1">Selected sequence: {sequenceAnswers.map(i => String.fromCharCode(65 + i)).join(' → ')}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {currentQuestion.options.map((option, index) => (
                              <Button
                                key={index}
                                variant={sequenceAnswers.includes(index) ? "default" : "outline"}
                                className={`text-lg p-4 h-auto ${
                                  sequenceAnswers.includes(index) 
                                    ? "bg-purple-500 hover:bg-purple-600 text-white" 
                                    : "hover:bg-purple-50"
                                }`}
                                onClick={() => handleSequenceSubmit(index)}
                              >
                                {sequenceAnswers.includes(index) && (
                                  <span className="mr-2 bg-white text-purple-500 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                                    {sequenceAnswers.indexOf(index) + 1}
                                  </span>
                                )}
                                {String.fromCharCode(65 + index)}. {option}
                              </Button>
                            ))}
                          </div>
                          {sequenceAnswers.length > 0 && (
                            <div className="flex justify-center">
                              <Button
                                onClick={clearSequenceAnswers}
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Clear Sequence
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Visual Rapid Fire Round */}
                      {roundType === 'visual_rapid_fire' && currentState === 'options_shown' && (
                        <div className="text-center mb-4">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-green-800 font-semibold text-xl">Visual Rapid Fire - 1 Minute</p>
                            <p className="text-green-700 mt-2">Images displayed above. Award points for correct answers.</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Answer Display */}
                      {currentState === 'answer_shown' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-800 mb-2">Correct Answer:</h4>
                          <p className="text-green-700">{typeof currentQuestion.correctAnswer === 'string' ? currentQuestion.correctAnswer : currentQuestion.options?.[currentQuestion.correctAnswer as number]}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Dynamic Action Button */}
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleDynamicButtonClick}
                      className="w-full text-lg py-3"
                      size="lg"
                    >
                      {getDynamicButtonText()}
                    </Button>
                  </div>

                  {/* Sequence Comparison Modal */}
                  {showSequenceModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold mb-4">Sequence Comparison</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="font-semibold text-gray-700">Team's Answer:</p>
                            <p className="text-lg">{sequenceAnswers.map(i => String.fromCharCode(65 + i)).join(' → ')}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Correct Answer:</p>
                            <p className="text-lg text-green-600">
                              {Array.isArray(currentQuestion.correctAnswer) 
                                ? currentQuestion.correctAnswer.map((i: number) => String.fromCharCode(65 + i)).join(' → ')
                                : 'A → B → C → D'}
                            </p>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button onClick={toggleSequenceModal} variant="outline">
                              Close
                            </Button>
                            <Button onClick={() => {
                              toggleSequenceModal();
                              setState('answer_shown');
                            }}>
                              Continue
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Competition Ready</h2>
                    <p className="text-gray-600 mb-4">Press keyboard shortcuts to control the presentation:</p>
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
                      <div className="bg-blue-50 p-3 rounded">
                        <kbd className="bg-blue-200 px-2 py-1 rounded text-sm font-mono">Q</kbd>
                        <span className="ml-2">Show Question</span>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <kbd className="bg-green-200 px-2 py-1 rounded text-sm font-mono">O</kbd>
                        <span className="ml-2">Show Options & Start Timer</span>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded">
                        <kbd className="bg-yellow-200 px-2 py-1 rounded text-sm font-mono">A</kbd>
                        <span className="ml-2">Show Answer (Buzzer/Rapid Fire only)</span>
                      </div>
                      <div className="bg-purple-50 p-3 rounded">
                        <kbd className="bg-purple-200 px-2 py-1 rounded text-sm font-mono">T</kbd>
                        <span className="ml-2">Toggle Timer</span>
                      </div>
                      <div className="bg-red-50 p-3 rounded">
                        <kbd className="bg-red-200 px-2 py-1 rounded text-sm font-mono">N</kbd>
                        <span className="ml-2">Next Question</span>
                      </div>
                    </div>
                  </div>
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
              <div className="grid grid-cols-3 gap-4">
                {currentGroup.teams.map((team) => (
                  <Card key={team._id} className="p-4">
                    <h4 className="font-semibold">{team.name}</h4>
                    <p className="text-sm text-gray-600">{team.school.name}</p>
                    <p className="text-lg font-bold text-blue-600">
                      Total Score: {teamScores[team._id] || 0}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        className={`flex-1 ${
                          !currentQuestion 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : roundType === 'mcq' && selectedOption !== null
                              ? isOptionCorrect 
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white cursor-not-allowed'
                              : ''
                        }`}
                        onClick={() => handleAwardPoints(team._id, currentQuestion?.points || 10)}
                        disabled={!currentQuestion || (roundType === 'mcq' && selectedOption !== null && !isOptionCorrect)}
                      >
                        +{currentQuestion?.points || 10}
                        {roundType === 'mcq' && selectedOption !== null && (
                          isOptionCorrect ? ' ✓' : ' ✗'
                        )}
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
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Group Summary Modal */}
        <Dialog open={showGroupSummaryModal} onOpenChange={setShowGroupSummaryModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                Phase 1 Complete - {currentGroup?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 text-lg mb-2">🎉 Buzzer Round Completed!</h3>
                <p className="text-green-700">All rounds in Phase 1 have been completed for this group.</p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4">Final Scores</h3>
                <div className="grid grid-cols-1 gap-3">
                  {currentGroup?.teams
                    ?.map(team => ({ ...team, score: teamScores[team._id] || 0 }))
                    ?.sort((a, b) => b.score - a.score)
                    ?.map((team, index) => (
                      <div key={team._id} className={`flex justify-between items-center p-4 rounded-lg border ${
                        index === 0 ? 'bg-yellow-50 border-yellow-300' : 
                        index === 1 ? 'bg-gray-50 border-gray-300' : 
                        index === 2 ? 'bg-orange-50 border-orange-300' : 
                        'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                          </span>
                          <div>
                            <h4 className="font-semibold">{team.name}</h4>
                            <p className="text-sm text-gray-600">{team.school.name}</p>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {team.score}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowGroupSummaryModal(false)}
              >
                Stay with Current Group
              </Button>
              <Button 
                onClick={handleStartNextGroup}
                className="bg-green-600 hover:bg-green-700"
              >
                Start Phase 1 for Next Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            {currentQuestion && (currentState === 'question_shown' || currentState === 'options_shown' || currentState === 'timer_running' || currentState === 'answer_shown') ? (
              <div className="text-center max-w-4xl">
                <h2 className="text-4xl font-bold mb-8">{currentQuestion.question}</h2>
                
                {/* Media removed from here - only show on O press */}
                                {/* Media Display */}
                    {currentQuestion?.mediaUrl && currentState === 'options_shown' && (
                      <div className="mt-6 flex justify-center">
                        {mediaLoading && (
                          <div className="flex items-center space-x-2 text-blue-600">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span>Loading media...</span>
                          </div>
                        )}
                        {!mediaLoading && (
                          <>
                            {currentQuestion.mediaType === 'image' && (
                              <img 
                                src={currentQuestion.mediaUrl} 
                                alt="Question media" 
                                className="max-w-md max-h-64 object-contain rounded-lg shadow-lg"
                                onLoad={() => {
                                  console.log('Image loaded, starting timer for', roundType);
                                  if (currentState === 'options_shown') {
                                    startTimer(roundType === 'media' ? 15 : 60);
                                  }
                                }}
                              />
                            )}
                            {currentQuestion.mediaType === 'audio' && (
                              <audio 
                                controls 
                                className="w-full max-w-md"
                                onCanPlayThrough={() => {
                                  console.log('Audio loaded, starting timer for', roundType);
                                  if (currentState === 'options_shown') {
                                    startTimer(15);
                                  }
                                }}
                              >
                                <source src={currentQuestion.mediaUrl} type="audio/mpeg" />
                                Your browser does not support the audio element.
                              </audio>
                            )}
                            {currentQuestion.mediaType === 'video' && (
                              <video 
                                controls 
                                className="max-w-md max-h-64 rounded-lg shadow-lg"
                                onCanPlayThrough={() => {
                                  console.log('Video loaded, starting timer for', roundType);
                                  if (currentState === 'options_shown') {
                                    startTimer(15);
                                  }
                                }}
                              >
                                <source src={currentQuestion.mediaUrl} type="video/mp4" />
                                Your browser does not support the video element.
                              </video>
                            )}
                          </>
                        )}
                      </div>
                    )}

                {/* MCQ Options in presentation - Always show structure */}
                {(roundType === 'mcq' || roundType === 'media' || roundType === 'buzzer') && currentQuestion?.options && (
                  <div className="grid grid-cols-2 gap-6 text-2xl">
                    {currentQuestion.options.map((option, index) => (
                      <div
                        key={index}
                        className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                          currentState === 'options_shown' || currentState === 'timer_running'
                            ? showCorrectAnswer && (typeof currentQuestion.correctAnswer === 'string' ? option === currentQuestion.correctAnswer : index === currentQuestion.correctAnswer)
                              ? 'bg-green-600 border-green-400 text-white'
                              : selectedOption === index
                              ? (typeof currentQuestion.correctAnswer === 'string' ? option === currentQuestion.correctAnswer : index === currentQuestion.correctAnswer)
                                ? 'bg-green-600 border-green-400 text-white'
                                : 'bg-red-600 border-red-400 text-white'
                              : 'border-gray-400'
                            : 'border-gray-300 bg-gray-50 text-gray-500'
                        }`}
                      >
                        <span className="font-bold">{String.fromCharCode(65 + index)}.</span>{' '}
                        {currentState === 'options_shown' || currentState === 'timer_running' ? option : ''}
                      </div>
                    ))}
                  </div>
                )}

                {/* Buzzer Round Team Selection in Presentation */}
                {roundType === 'buzzer' && (currentState === 'question_shown' || currentState === 'options_shown') && (
                  <div className="mt-8 space-y-6">
                    <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-6 text-center">
                      <h3 className="text-yellow-800 font-bold text-3xl mb-2">🔔 Buzzer Round</h3>
                      <p className="text-yellow-700 text-xl">Select the team that buzzed first</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6">
                      {currentGroup?.teams?.map((team) => (
                        <div
                          key={team._id}
                          className={`border-2 rounded-lg p-6 text-center cursor-pointer transition-colors ${
                            selectedTeam === team._id 
                              ? "bg-blue-500 border-blue-400 text-white" 
                              : "border-gray-400 hover:border-blue-400 bg-white"
                          }`}
                        >
                          <div className="font-bold text-2xl">{team.name}</div>
                          <div className="text-lg opacity-75 mt-2">Score: {teamScores[team._id] || 0}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Answer in presentation */}
                {currentState === 'answer_shown' && currentQuestion && (
                  <div className="bg-green-600 border-2 border-green-400 rounded-lg p-8 text-3xl">
                    <h3 className="font-bold mb-4">Correct Answer:</h3>
                    <p>{typeof currentQuestion.correctAnswer === 'string' ? currentQuestion.correctAnswer : currentQuestion.options?.[currentQuestion.correctAnswer as number]}</p>
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
              {sequenceAnswers.map((answerIndex, idx) => {
                const option = currentQuestion?.options?.[answerIndex];
                const isCorrect = answerIndex === (currentQuestion?.correctAnswer as number);
                
                return (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <h4 className="font-semibold">Answer {idx + 1}</h4>
                      <p className="text-gray-600">{option}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isCorrect ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-red-500" />
                      )}
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
