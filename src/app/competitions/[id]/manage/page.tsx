"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Play,
  Trophy,
  Timer,
  Check,
  X,
  SkipForward,
} from "lucide-react";
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
  type:
    | "mcq"
    | "media"
    | "buzzer"
    | "rapid_fire"
    | "sequence"
    | "visual_rapid_fire";
  question: string;
  options?: string[];
  correctAnswer?: string | number;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video";
  imageUrls?: string[]; // Array of images for visual rapid fire
  points: number;
  phase: "league" | "semi_final" | "final";
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
  const [currentPhase, setCurrentPhase] = useState<string>("league");
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);

  // Phase structure definition
  const phaseStructure = {
    league: [
      { name: "MCQ Round", type: "mcq" },
      { name: "Media Round", type: "media" },
      { name: "Buzzer Round", type: "buzzer" },
    ],
    semi_final: [
      { name: "MCQ Round", type: "mcq" },
      { name: "Media Round", type: "media" },
      { name: "Buzzer Round", type: "buzzer" },
      { name: "Rapid Fire Round", type: "rapid_fire" },
    ],
    final: [
      { name: "Sequence Round", type: "sequence" },
      { name: "Media Round", type: "media" },
      { name: "Buzzer Round", type: "buzzer" },
      { name: "Visual Rapid Fire Round", type: "visual_rapid_fire" },
    ],
  };

  

  // Default timer durations per round for T key toggle
  const getDefaultRoundDuration = () => {
    switch (roundType) {
      case "mcq":
      case "media":
      case "buzzer":
        return 15;
      case "rapid_fire":
      case "sequence":
      case "visual_rapid_fire":
        return 60;
      default:
        return 15;
    }
  };

  // Detect tie groups based on total score and start tie-breaker if needed
  const detectTieGroups = (): string[][] => {
    if (!currentGroup) return [];
    const scoreMap: Record<number, string[]> = {};
    currentGroup.teams.forEach((team) => {
      const score = teamScores[team._id] ?? team.totalScore ?? 0;
      if (!scoreMap[score]) scoreMap[score] = [];
      scoreMap[score].push(team._id);
    });
    const ties = Object.entries(scoreMap)
      .map(([score, ids]) => ({ score: Number(score), ids }))
      .filter((entry) => entry.ids.length >= 2)
      .sort((a, b) => b.score - a.score) // Resolve highest-score ties first
      .map((entry) => entry.ids);
    return ties;
  };

  const startTieBreakerIfNeeded = (): boolean => {
    const tieGroups = detectTieGroups();
    if (tieGroups.length > 0) {
      setTieBreakerMode(true);
      setTieBreakerGroups(tieGroups);
      setCurrentTieGroupIndex(0);
      setRoundType("buzzer" as any);
      resetQuestion();
      setState("idle");
      loadQuestions("buzzer", currentPhase); // will fetch 5 via getQuestionCount
      toast({
        title: "Tie-breaker Started",
        description: `Detected ${tieGroups.length} tie group(s). Starting buzzer tie-breaker for ${tieGroups[0].length} team(s).`,
      });
      return true;
    }
    return false;
  };
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [noQuestionsForType, setNoQuestionsForType] = useState(false);

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesPreloaded, setImagesPreloaded] = useState<boolean[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showGroupSummaryModal, setShowGroupSummaryModal] = useState(false);
  const [showRoundSummaryModal, setShowRoundSummaryModal] = useState(false);
  const [showFinalWinnerModal, setShowFinalWinnerModal] = useState(false);
  const [winnerRevealed, setWinnerRevealed] = useState(false);
  const [finalWinnerTeamId, setFinalWinnerTeamId] = useState<string | null>(null);
  const [completedRoundInfo, setCompletedRoundInfo] = useState<{ name: string; type: string } | null>(null);
  const [pendingNextRoundInfo, setPendingNextRoundInfo] = useState<{ name: string; type: string } | null>(null);
  const [pendingNextRoundIndex, setPendingNextRoundIndex] = useState<number | null>(null);
  // Tie-breaker state
  const [tieBreakerMode, setTieBreakerMode] = useState(false);
  const [tieBreakerGroups, setTieBreakerGroups] = useState<string[][]>([]);
  const [currentTieGroupIndex, setCurrentTieGroupIndex] = useState(0);
  const activeTieTeamIds: string[] = tieBreakerMode ? (tieBreakerGroups[currentTieGroupIndex] || []) : [];
  // Global settings state
  const [globalSettings, setGlobalSettings] = useState({
    mcqPoints: 10,
    mediaPoints: 10,
    buzzerPoints: 10,
    rapidFirePoints: 10,
    sequencePoints: 10,
    visualRapidFirePoints: 10,
    mcqNegativeMarking: false,
    mediaNegativeMarking: false,
    rapidFireNegativeMarking: false,
    sequenceNegativeMarking: false,
    visualRapidFireNegativeMarking: false
  });

  const presentRef = useRef<HTMLDivElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerAudioRef = useRef<HTMLAudioElement | null>(null);
  const rightAnswerAudioRef = useRef<HTMLAudioElement | null>(null);
  const wrongAnswerAudioRef = useRef<HTMLAudioElement | null>(null);

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
    sequenceRevealStep,
    sequenceComparison,
    isPresenting,

    // Actions
    setState,
    setRoundType,
    setCurrentQuestion,
    setQuestions,
    nextQuestion,
    prevQuestion,
    startTimer,
    stopTimer,
    updateTimer,
    setTeams,
    updateTeamScore,
    setTeamScore,
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
    nextSequenceReveal,
    resetSequenceReveal,
    setSequenceComparison,
    setPresenting,
    resetRound,
  } = useQuizStore();

  const resetQuestion = () => {
    resetRound();
    setSelectedTeam(null);
    setState("idle"); // Always start with hidden question
  };

  useEffect(() => {
    if (competitionId) {
      fetchCompetition();
      loadGlobalSettings();
    }
  }, [competitionId]);

  const loadGlobalSettings = async () => {
    try {
      const response = await fetch('/api/global-settings');
      const data = await response.json();
      if (data.success) {
        setGlobalSettings(data.data);
      }
    } catch (error) {
      console.error('Error loading global settings:', error);
    }
  };

  // Get points for current round type from global settings
  const getCurrentRoundPoints = () => {
    switch (roundType) {
      case "mcq":
        return globalSettings.mcqPoints;
      case "media":
        return globalSettings.mediaPoints;
      case "buzzer":
        return globalSettings.buzzerPoints;
      case "rapid_fire":
        return globalSettings.rapidFirePoints;
      case "sequence":
        return globalSettings.sequencePoints;
      case "visual_rapid_fire":
        return globalSettings.visualRapidFirePoints;
      default:
        return 10;
    }
  };

  // Get negative marking setting for current round type
  const getCurrentRoundNegativeMarking = () => {
    switch (roundType) {
      case "mcq":
        return globalSettings.mcqNegativeMarking;
      case "media":
        return globalSettings.mediaNegativeMarking;
      case "rapid_fire":
        return globalSettings.rapidFireNegativeMarking;
      case "sequence":
        return globalSettings.sequenceNegativeMarking;
      case "visual_rapid_fire":
        return globalSettings.visualRapidFireNegativeMarking;
      case "buzzer":
        return false; // Buzzer always manual control
      default:
        return false;
    }
  };

  // Initialize first round when competition loads
  useEffect(() => {
    if (competition && currentGroup && !currentQuestion) {
      console.log("Auto-loading questions for competition start");
      const firstRound = getCurrentRound();
      setRoundType(firstRound.type as any);
      loadQuestions(firstRound.type, currentPhase);
    }
  }, [competition, currentGroup]);

  // Ensure questions are loaded when needed
  useEffect(() => {
    if (
      competition &&
      currentGroup &&
      roundType &&
      !currentQuestion &&
      !noQuestionsForType
    ) {
      console.log("Ensuring questions are loaded for round type:", roundType);
      loadQuestions(roundType, currentPhase);
    }
  }, [
    competition,
    currentGroup,
    roundType,
    currentQuestion,
    noQuestionsForType,
    currentPhase,
  ]);

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

  // Audio helper functions
  const playTimerAudio = () => {
    if (timerAudioRef.current) {
      timerAudioRef.current.currentTime = 0;
      timerAudioRef.current.play().catch(console.error);
    }
  };

  const playRightAnswerAudio = () => {
    if (rightAnswerAudioRef.current) {
      rightAnswerAudioRef.current.currentTime = 0;
      rightAnswerAudioRef.current.play().catch(console.error);
    }
  };

  const playWrongAnswerAudio = () => {
    if (wrongAnswerAudioRef.current) {
      wrongAnswerAudioRef.current.currentTime = 0;
      wrongAnswerAudioRef.current.play().catch(console.error);
    }
  };

  const stopAllAudio = () => {
    if (timerAudioRef.current) {
      timerAudioRef.current.pause();
      timerAudioRef.current.currentTime = 0;
    }
    if (rightAnswerAudioRef.current) {
      rightAnswerAudioRef.current.pause();
      rightAnswerAudioRef.current.currentTime = 0;
    }
    if (wrongAnswerAudioRef.current) {
      wrongAnswerAudioRef.current.pause();
      wrongAnswerAudioRef.current.currentTime = 0;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      console.log(
        "Key pressed:",
        event.key,
        "Current question exists:",
        !!currentQuestion,
        "Competition loaded:",
        !!competition
      );

      // Only handle shortcuts if not typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        console.log("Typing in input field, ignoring key press");
        return;
      }

      const key = event.key.toLowerCase();
      console.log("Processing key:", key, "Current state:", currentState);
      event.preventDefault();

      switch (key) {
        case "q":
          console.log("Q key detected");
          if (!currentQuestion && competition && currentGroup) {
            console.log("No question loaded, loading questions first");
            const firstRound = getCurrentRound();
            setRoundType(firstRound.type as any);
            loadQuestions(firstRound.type, currentPhase);
          } else if (currentQuestion) {
            console.log("Question exists, calling handleQuestionToggle");
            handleQuestionToggle();
          }
          break;
        case "o":
          console.log(
            "O key detected, currentQuestion:",
            !!currentQuestion,
            "currentState:",
            currentState
          );
          if (roundType === "visual_rapid_fire" && currentState === "options_shown") {
            // Cycle through images for visual rapid fire
            handleNextImage();
          } else {
            handleOptionsToggle();
          }
          break;
        case "a":
          console.log("A key detected");
          // Final winner reveal gate
          if (showFinalWinnerModal && !winnerRevealed) {
            revealFinalWinner();
            break;
          }
          if (currentQuestion) {
            if (roundType === "sequence" && showSequenceModal) {
              // Handle sequence reveal step by step
              handleSequenceReveal();
            } else if (roundType === "media") {
              handleMediaAnswerToggle();
            } else {
              handleAnswerToggle();
            }
          }
          break;
        case "t":
          console.log("T key detected");
          handleTimerToggle();
          break;
        case "n":
          console.log("N key detected - next question");
          if (currentQuestion) {
            // Stop all audio and hide question for all phases
            stopAllAudio();
            setState("idle");
            handleNextQuestion();
          }
          break;
        case "p":
          console.log("P key detected - previous question");
          if (currentQuestionIndex > 0) {
            stopAllAudio();
            setState("idle");
            handlePrevQuestion();
          }
          break;
        default:
          console.log("Unhandled key:", key);
      }
    };

    console.log(
      "Setting up keyboard listener, currentQuestion:",
      !!currentQuestion,
      "competition:",
      !!competition
    );
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      console.log("Removing keyboard listener");
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [currentQuestion, currentState, competition, currentGroup, currentPhase]);

  // Fullscreen change handler
  useEffect(() => {
    const handler = () => {
      const isFs = !!document.fullscreenElement;
      setPresenting(isFs);
      // Focus presentation container when entering fullscreen
      if (isFs && presentRef.current) {
        setTimeout(() => {
          presentRef.current?.focus();
        }, 100);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [setPresenting]);

  // Fire confetti when round/group summary modals open
  useEffect(() => {
    if (showRoundSummaryModal) {
      fireSideConfetti();
    }
  }, [showRoundSummaryModal]);

  useEffect(() => {
    if (showGroupSummaryModal) {
      fireSideConfetti();
    }
  }, [showGroupSummaryModal]);

  useEffect(() => {
    if (showFinalWinnerModal) {
      fireSideConfetti();
    }
  }, [showFinalWinnerModal]);

  // Load canvas-confetti from CDN so we don't need a local dependency
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Confetti helpers
  const getConfetti = () =>
    (typeof window !== "undefined" && (window as any).confetti) || null;

  const fireSideConfetti = () => {
    const confetti = getConfetti();
    if (!confetti) return;
    confetti({
      particleCount: 120,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
    });
    confetti({
      particleCount: 120,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
    });
  };

  const fireFireworks = (duration = 3000) => {
    const confetti = getConfetti();
    if (!confetti) return;
    const end = Date.now() + duration;
    const colors = ["#bb0000", "#ffffff", "#00bb00", "#FFD700", "#00BFFF"];

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: Math.random() * 0.2, y: Math.random() * 0.5 },
        colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 - Math.random() * 0.2, y: Math.random() * 0.5 },
        colors,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const fetchCompetition = async () => {
    try {
      const response = await fetch(`/api/competitions/${competitionId}`);
      const data = await response.json();
      if (data.success) {
        setCompetition(data.data);

        // Automatically set phase based on competition's current stage
        const stageToPhaseMap = {
          group: "league",
          semi_final: "semi_final",
          final: "final",
        };
        const mappedPhase =
          stageToPhaseMap[
            data.data.currentStage as keyof typeof stageToPhaseMap
          ] || "league";
        setCurrentPhase(mappedPhase);

        if (data.data.groups.length > 0) {
          setCurrentGroup(data.data.groups[0]);
          await loadTeamsForGroup(data.data.groups[0].teams);
        }
      }
    } catch (error) {
      console.error("Error fetching competition:", error);
      toast({
        title: "Error",
        description: "Failed to load competition data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeamsForGroup = async (groupTeams: any[]) => {
    setTeams(groupTeams);
    
    // Fetch current scores from database and initialize properly
    await loadTeamScoresFromDB(groupTeams);
  };

  const loadTeamScoresFromDB = async (teams: any[]) => {
    try {
      // Fetch current scores for all teams
      const scorePromises = teams.map(async (team) => {
        const response = await fetch(`/api/teams/${team._id}`);
        if (response.ok) {
          const teamData = await response.json();
          return { teamId: team._id, score: teamData.totalScore || 0 };
        }
        return { teamId: team._id, score: 0 };
      });

      const scores = await Promise.all(scorePromises);
      
      // Set scores directly from database (not additive)
      scores.forEach(({ teamId, score }) => {
        setTeamScore(teamId, score);
      });

      console.log('Team scores loaded from database:', scores);
    } catch (error) {
      console.error('Error loading team scores:', error);
      // Fallback to team.totalScore if API fails
      teams.forEach((team) => {
        setTeamScore(team._id, team.totalScore || 0);
      });
    }
  };

  // Phase and round management functions
  const getCurrentRound = () => {
    const rounds = phaseStructure[currentPhase as keyof typeof phaseStructure];
    return rounds[currentRoundIndex] || rounds[0];
  };

  const getQuestionCount = (
    type: string,
    phase: string,
    teamCount: number,
    groupCount: number
  ) => {
    // Calculate based on round type and phase
    if (type === "mcq" || type === "media") {
      return teamCount * 2; // 2 questions per team
    } else if (type === "buzzer") {
      return 5; // 5 questions per group (fixed)
    } else if (type === "rapid_fire") {
      return 3; // Only 3 questions per group (one per team)
    } else if (type === "sequence") {
      return teamCount * 2; // 2 questions per team
    } else if (type === "visual_rapid_fire") {
      return 3; // 3 questions total, each with 20 images
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
      
      // Hide question and stop audio when navigating rounds
      setState("idle");
      stopAllAudio();
      
      loadQuestions(nextRoundType, currentPhase);
    }
  };

  const previousRound = () => {
    if (currentRoundIndex > 0) {
      const prevIndex = currentRoundIndex - 1;
      setCurrentRoundIndex(prevIndex);
      const rounds =
        phaseStructure[currentPhase as keyof typeof phaseStructure];
      const prevRoundType = rounds[prevIndex].type;
      setRoundType(prevRoundType as any);
      
      // Hide question and stop audio when navigating rounds
      setState("idle");
      stopAllAudio();
      
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
      if (mediaType === "image") {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = mediaUrl;
      } else if (mediaType === "audio") {
        const audio = new Audio();
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject();
        audio.src = mediaUrl;
      } else if (mediaType === "video") {
        const video = document.createElement("video");
        video.oncanplaythrough = () => resolve();
        video.onerror = () => reject();
        video.src = mediaUrl;
      } else {
        resolve();
      }
    });
  };

  const preloadAllMedia = async (questions: any[]) => {
    const mediaQuestions = questions.filter((q) => q.mediaUrl);
    if (mediaQuestions.length === 0) return;

    console.log(`Preloading ${mediaQuestions.length} media files...`);
    setMediaLoading(true);

    try {
      await Promise.all(
        mediaQuestions.map((q) => preloadMedia(q.mediaUrl, q.mediaType))
      );
      console.log("All media preloaded successfully");
      setMediaLoaded(true);
    } catch (error) {
      console.warn("Some media failed to preload:", error);
      setMediaLoaded(true); // Continue anyway
    } finally {
      setMediaLoading(false);
    }
  };

  const loadQuestions = async (type: string, phase: string = "league") => {
    console.log(
      "Loading questions for type:",
      type,
      "phase:",
      phase,
      "Competition ID:",
      competitionId
    );

    if (!competition || !currentGroup) {
      console.log("Competition or group not loaded yet");
      return;
    }

    const teamCount = currentGroup.teams.length;
    const groupCount = competition.groups.length;
    const requiredCount = getQuestionCount(type, phase, teamCount, groupCount);

    try {
      const response = await fetch(
        `/api/competitions/${competitionId}/questions?type=${type}&phase=${phase}&count=${requiredCount}`
      );
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (data.success && data.data && data.data.length > 0) {
        console.log(
          "Questions loaded successfully:",
          data.data.length,
          "questions"
        );
        setQuestions(data.data);
        setCurrentQuestion(data.data[0]);
        console.log("Set current question:", data.data[0]);
        
        // Preload images immediately if it's a visual rapid fire question
        if (data.data[0]?.type === "visual_rapid_fire" && data.data[0].imageUrls) {
          console.log("Preloading images for visual rapid fire question");
          preloadImages(data.data[0].imageUrls);
        }
        setNoQuestionsForType(false);
        setMediaLoaded(false);

        // Preload media for media rounds
        if (type === "media" || type === "visual_rapid_fire") {
          preloadAllMedia(data.data);
        } else {
          setMediaLoaded(true); // No media to load
        }

        toast({
          title: "Questions Loaded",
          description: `Loaded ${data.data.length} ${type} questions for ${phase} phase`,
        });
      } else {
        console.log(
          "No questions available for type:",
          type,
          "phase:",
          phase,
          "API response:",
          data
        );
        setNoQuestionsForType(true);
        toast({
          title: "No Questions Available",
          description: `No ${type} questions found for ${phase} phase. Please add questions to the database.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading questions:", error);
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
    console.log(
      "Q pressed! Current state:",
      currentState,
      "Has question:",
      !!currentQuestion
    );

    if (currentState === "idle") {
      if (roundType === "rapid_fire") {
        // For rapid fire, skip question display and go directly to timer
        setState("options_shown");
        startTimer(60); // Start 1 minute timer immediately
      } else if (roundType === "buzzer") {
        setState("question_shown"); // For buzzer, show question AND team selection
      } else {
        setState("question_shown"); // For other rounds, just show question
      }
    } else {
      setState("idle");
    }
  };

  const handleOptionsToggle = () => {
    console.log(
      "O pressed! Current state:",
      currentState,
      "Round type:",
      roundType,
      "Has question:",
      !!currentQuestion
    );

    // Always set to options_shown regardless of current state
    setState("options_shown");

    if (roundType === "mcq") {
      startTimer(15); // 15 second timer for MCQ
      playTimerAudio(); // Play timer sound
      console.log(
        "MCQ: Showing options with 15s timer, state set to options_shown"
      );
    } else if (roundType === "media") {
      // For media, NEVER start timer immediately - always wait for media to load
      if (currentQuestion?.mediaUrl) {
        console.log("Media: Waiting for media to load before starting timer");
        // Timer will start when media loads via onLoad/onCanPlayThrough events
      } else {
        startTimer(15); // No media, start timer normally
        playTimerAudio(); // Play timer sound
      }
    } else if (roundType === "buzzer") {
      // Start a short timer for buzzer just like MCQ
      startTimer(15);
      playTimerAudio();
      console.log("Buzzer: Showing options for team selection with 15s timer");
    } else if (roundType === "rapid_fire") {
      startTimer(60); // 1 minute timer for rapid fire
      playTimerAudio(); // Play timer sound
      console.log("Rapid Fire: Starting 1 minute timer");
    } else if (roundType === "sequence") {
      // Start 1 minute timer for sequence round for consistency
      startTimer(60);
      playTimerAudio();
      console.log("Sequence: Showing options for sequence input with 60s timer");
    } else if (roundType === "visual_rapid_fire") {
      // For visual rapid fire, only reset image index - images already preloaded
      console.log("Visual Rapid Fire: Resetting image index");
      setCurrentImageIndex(0);
      // Start timer immediately since images are already preloaded
      if (!isTimerActive) {
        startTimer(60);
        playTimerAudio();
      }
    }

    // Log the state after setting
    setTimeout(() => {
      console.log("State after O key:", currentState);
    }, 100);
  };

  const handleAnswerToggle = () => {
    // For MCQ, don't show separate answer state - options already show correct/incorrect
    if (roundType === "mcq") {
      return; // Skip answer toggle for MCQ
    }

    if (currentState === "options_shown" || currentState === "question_shown") {
      setState("answer_shown");
      stopTimer();
    }
  };

  const handleMediaAnswerToggle = async () => {
    if (currentState === "answer_shown") {
      setState("options_shown");
    } else {
      setState("answer_shown");

      // Media answers are awarded manually via point buttons
      // No automatic scoring for media rounds
    }
  };

  const handleTimerToggle = () => {
    if (isTimerActive) {
      stopTimer();
      stopAllAudio(); // Stop audio when timer is stopped
    } else {
      const defaultDuration = getDefaultRoundDuration();
      if (timeLeft <= 0) {
        // Start fresh with default duration for the current round
        startTimer(defaultDuration);
      } else {
        // Resume from remaining time
        startTimer();
      }
      // Resume timer audio when restarting timer via keyboard toggle
      playTimerAudio();
    }
  };

  const handleRoundTypeChange = (type: string) => {
    setRoundType(type as any);
    loadQuestions(type, "league"); // Default to league phase
  };

  const handleGroupChange = async (groupId: string) => {
    const group = competition?.groups.find((g) => g._id === groupId);
    if (group) {
      setCurrentGroup(group);
      await loadTeamsForGroup(group.teams);
    }
  };

  const computeFinalWinnerTeam = () => {
    const teams = (currentGroup?.teams || []).map((team) => ({
      ...team,
      score: teamScores[team._id] ?? team.totalScore ?? 0,
    }));
    if (teams.length === 0) return null;
    return teams.sort((a, b) => b.score - a.score)[0];
  };

  const revealFinalWinner = () => {
    if (!winnerRevealed) {
      setWinnerRevealed(true);
      fireFireworks(5000);
    }
  };

  const handleStartNextGroup = () => {
    const currentGroupIndex =
      competition?.groups.findIndex((g) => g._id === currentGroup?._id) || 0;
    const nextGroupIndex = currentGroupIndex + 1;

    if (competition && nextGroupIndex < competition.groups.length) {
      const nextGroup = competition.groups[nextGroupIndex];
      setCurrentGroup(nextGroup);
      setShowGroupSummaryModal(false);

      // Reset to first round of Phase 1
      setCurrentRoundIndex(0);
      setRoundType("mcq");
      loadQuestions("mcq", "league");
      resetQuestion();
      setState("idle");

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

  const handleNextImage = () => {
    if (roundType === "visual_rapid_fire" && currentQuestion?.imageUrls) {
      const totalImages = currentQuestion.imageUrls.length;
      
      setCurrentImageIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        
        if (nextIndex < totalImages) {
          console.log(`Visual Rapid Fire: Showing image ${nextIndex + 1} of ${totalImages} (from ${prevIndex + 1})`);
          return nextIndex;
        } else {
          console.log(`Visual Rapid Fire: Reached end of images (${totalImages} total), cycling back to first`);
          return 0;
        }
      });
    }
  };

  const preloadImages = (imageUrls: string[]) => {
    const preloadStatus = new Array(imageUrls.length).fill(false);
    setImagesPreloaded(preloadStatus);
    
    imageUrls.forEach((url, index) => {
      const img = new Image();
      img.onload = () => {
        setImagesPreloaded(prev => {
          const updated = [...prev];
          updated[index] = true;
          return updated;
        });
      };
      img.onerror = () => {
        console.error(`Failed to preload image ${index + 1}:`, url);
      };
      img.src = url;
    });
  };

  // Preload images when currentQuestion changes for visual rapid fire
  useEffect(() => {
    if (currentQuestion?.type === "visual_rapid_fire" && currentQuestion.imageUrls) {
      console.log("Preloading visual rapid fire images for question:", currentQuestion._id);
      preloadImages(currentQuestion.imageUrls);
    }
  }, [currentQuestion]);

  const handleNextQuestion = () => {
    // Stop all audio when moving to next question
    stopAllAudio();
    
    // Reset image index for visual rapid fire
    if (roundType === "visual_rapid_fire") {
      setCurrentImageIndex(0);
    }
    
    const nextIndex = currentQuestionIndex + 1;

    // Special handling for rapid fire - after 3 questions, move to next group
    if (roundType === "rapid_fire" && nextIndex >= 3) {
      toast({
        title: "Rapid Fire Complete",
        description: "3 questions completed! Moving to next group.",
      });

      // Show group summary modal to move to next group
      setShowGroupSummaryModal(true);
      return;
    }

    // Check if we've reached the end of questions for this round type
    if (nextIndex >= questions.length) {
      // Handle tie-breaker group progression first
      if (tieBreakerMode) {
        const hasMoreTieGroups = currentTieGroupIndex < tieBreakerGroups.length - 1;
        if (hasMoreTieGroups) {
          // Move to next tie group with fresh 5 buzzer questions
          setCurrentTieGroupIndex(currentTieGroupIndex + 1);
          resetRound();
          setSelectedTeam(null);
          setState("idle");
          setRoundType("buzzer" as any);
          loadQuestions("buzzer", currentPhase);
        } else {
          // All tie groups processed — end tie-breakers and show summary
          setTieBreakerMode(false);
          setTieBreakerGroups([]);
          setCurrentTieGroupIndex(0);
          resetQuestion();
          setState("idle");
          setShowGroupSummaryModal(true);
        }
        return;
      }

      const currentPhaseRounds = phaseStructure[currentPhase as keyof typeof phaseStructure];
      const currentRoundIndexInPhase = currentPhaseRounds.findIndex(
        (r) => r.type === roundType
      );
      const nextRound = currentPhaseRounds[currentRoundIndexInPhase + 1];

      if (nextRound) {
        // Show round summary modal before advancing
        setCompletedRoundInfo(currentPhaseRounds[currentRoundIndexInPhase]);
        setPendingNextRoundInfo(nextRound);
        setPendingNextRoundIndex(currentRoundIndexInPhase + 1);
        setShowRoundSummaryModal(true);
        // Reset display state
        resetQuestion();
        setState("idle");
      } else {
        // All rounds completed for this phase
        // Attempt to start tie-breakers automatically if any ties exist
        const started = startTieBreakerIfNeeded();
        if (!started) {
          toast({
            title: "Phase Complete",
            description: `All rounds in ${currentPhase} phase completed!`,
          });
          resetQuestion();
          setState("idle");
          if (currentPhase === "league" && roundType === "buzzer") {
            setShowGroupSummaryModal(true);
          }
          // If this is the Final phase, show the Final Winner overlay
          if (currentPhase === "final") {
            const winner = computeFinalWinnerTeam();
            setFinalWinnerTeamId(winner?._id || null);
            setWinnerRevealed(false);
            setShowFinalWinnerModal(true);
          }
        }
      }
      return;
    }

    nextQuestion();
    setSelectedTeam(null); // Clear selected team for buzzer rounds
    setState("idle"); // Reset to hidden state
  };

  const handlePrevQuestion = () => {
    // Stop all audio when moving to previous question
    stopAllAudio();

    // Reset image index for visual rapid fire
    if (roundType === "visual_rapid_fire") {
      setCurrentImageIndex(0);
    }

    const prevIndex = currentQuestionIndex - 1;
    if (prevIndex >= 0) {
      prevQuestion();
      setSelectedTeam(null);
      setState("idle");
    }
  };

  const handleOptionSelect = (option: string, index: number) => {
    selectOption(index);
    
    // Stop the timer and all audio immediately when option is selected
    stopTimer();
    stopAllAudio();
    
    const correctAnswer = currentQuestion?.correctAnswer;
    let isCorrect = false;

    if (typeof correctAnswer === "number") {
      isCorrect = index === correctAnswer;
    } else if (typeof correctAnswer === "string") {
      isCorrect = option === correctAnswer;
    }

    // Play appropriate audio based on answer correctness
    if (isCorrect) {
      playRightAnswerAudio();
      // Confetti from both sides for correct answer
      fireSideConfetti();
      // Keep existing CSS confetti for additional effect
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      playWrongAnswerAudio();
      // Auto-show correct answer for wrong selection
      setTimeout(() => {
        toggleCorrectAnswer();
      }, 1000);
    }
  };

  const handleAwardPoints = async (teamId: string, points: number) => {
    // Use global settings points instead of passed points
    const globalPoints = getCurrentRoundPoints();
    let finalPoints = globalPoints;

    // Only award points if an option was selected and it's correct
    if (roundType === "mcq" && selectedOption === null) {
      toast({
        title: "No Selection",
        description: "Please select an answer first",
        variant: "destructive",
      });
      return;
    }

    // For MCQ, check if the selected answer is correct and apply negative marking
    if (roundType === "mcq" && !isOptionCorrect) {
      if (getCurrentRoundNegativeMarking()) {
        finalPoints = -globalPoints; // Negative marking
      } else {
        toast({
          title: "Incorrect Answer",
          description: "No points awarded for wrong answer",
          variant: "destructive",
        });
        return;
      }
    }

    // For other round types, check if we have a wrong answer scenario and apply negative marking
    if (roundType !== "mcq" && roundType !== "buzzer") {
      // For media, rapid_fire, sequence, visual_rapid_fire - check if answer is wrong and negative marking is enabled
      const hasWrongAnswer = (
        (roundType === "media" && selectedOption !== null && !isOptionCorrect) ||
        (roundType === "rapid_fire" && selectedOption !== null && !isOptionCorrect) ||
        (roundType === "sequence" && selectedOption !== null && !isOptionCorrect) ||
        (roundType === "visual_rapid_fire" && selectedOption !== null && !isOptionCorrect)
      );
      
      if (hasWrongAnswer && getCurrentRoundNegativeMarking()) {
        finalPoints = -globalPoints; // Negative marking for wrong answers
      } else if (hasWrongAnswer && !getCurrentRoundNegativeMarking()) {
        // Wrong answer but no negative marking - don't award points
        toast({
          title: "Incorrect Answer",
          description: "No points awarded for wrong answer",
          variant: "destructive",
        });
        return;
      }
    }

    // For buzzer round, use the passed points (can be positive or negative)
    if (roundType === "buzzer") {
      finalPoints = points; // Keep original behavior for buzzer
    }

    try {
      // Update team's totalScore directly in the Team model
      const response = await fetch(`/api/teams/${teamId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: finalPoints }),
      });

      if (response.ok) {
        const result = await response.json();
        const newTotal =
          (result?.data?.newTotalScore ?? result?.newTotalScore ?? result?.totalScore) as number;

        // Set the exact score from database (not additive)
        setTeamScore(teamId, newTotal);

        // Also update the team's totalScore in the current group
        if (currentGroup) {
          const updatedTeams = currentGroup.teams?.map((team) =>
            team._id === teamId ? { ...team, totalScore: newTotal } : team
          );
          setCurrentGroup({ ...currentGroup, teams: updatedTeams });
        }

        toast({
          title: "Points Awarded",
          description: `${finalPoints > 0 ? "+" : ""}${finalPoints} points awarded. Total: ${newTotal}`,
        });
      } else {
        throw new Error("Failed to update score");
      }
    } catch (error) {
      console.error("Error awarding points:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to award points",
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

  const handleContinueToNextRound = () => {
    if (pendingNextRoundInfo && pendingNextRoundIndex !== null) {
      setCurrentRoundIndex(pendingNextRoundIndex);
      setRoundType(pendingNextRoundInfo.type as any);
      loadQuestions(pendingNextRoundInfo.type, currentPhase);
      setShowRoundSummaryModal(false);
      setCompletedRoundInfo(null);
      setPendingNextRoundInfo(null);
      setPendingNextRoundIndex(null);
    } else {
      setShowRoundSummaryModal(false);
    }
  };

  const handleSequenceSubmit = (optionIndex: number) => {
    if (sequenceAnswers.includes(optionIndex)) {
      // Remove if already selected - clear and re-add others
      clearSequenceAnswers();
      sequenceAnswers
        .filter((i) => i !== optionIndex)
        .forEach((i) => addSequenceAnswer(i));
    } else {
      // Add to sequence
      addSequenceAnswer(optionIndex);
    }
  };

  const initializeSequenceComparison = () => {
    if (!currentQuestion || !currentQuestion.options) return;
    
    // Get correct sequence from question
    const correctSequence = Array.isArray(currentQuestion.correctAnswer) 
      ? currentQuestion.correctAnswer 
      : [currentQuestion.correctAnswer as number];
    
    // Set up comparison data
    setSequenceComparison(correctSequence, sequenceAnswers);
    resetSequenceReveal();
    toggleSequenceModal();
  };

  const handleSequenceReveal = () => {
    const maxSteps = Math.max(sequenceComparison.correct.length, sequenceComparison.selected.length);
    
    if (sequenceRevealStep < maxSteps) {
      nextSequenceReveal();
      
      // Play sound based on current step comparison
      if (sequenceRevealStep < sequenceComparison.correct.length && 
          sequenceRevealStep < sequenceComparison.selected.length) {
        const isCorrect = sequenceComparison.correct[sequenceRevealStep] === sequenceComparison.selected[sequenceRevealStep];
        playSound(isCorrect ? 'correct' : 'wrong');
      }
    } else {
      // All steps revealed, close modal and show answer
      toggleSequenceModal();
      setState("answer_shown");
    }
  };

  const playSound = (type: 'correct' | 'wrong') => {
    // Create audio element and play sound
    const audio = new Audio(type === 'correct' ? '/right_answer.mp3' : '/wrong_answer.mp3');
    audio.play().catch(console.error);
  };

  const handleBuzzerAnswer = async (option: string, index: number) => {
    selectOption(index);

    if (!currentQuestion) return;

    // Check if answer is correct
    const isCorrect =
      typeof currentQuestion.correctAnswer === "string"
        ? option === currentQuestion.correctAnswer
        : index === currentQuestion.correctAnswer;

    if (isCorrect) {
      toggleCorrectAnswer(); // Show correct answer feedback
      // Confetti for correct buzzer answer
      fireSideConfetti();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    const buzzerPoints = getCurrentRoundPoints();
    if (selectedTeam && isCorrect) {
      // Award points for correct answer via API
      await handleAwardPoints(selectedTeam, buzzerPoints);
    } else if (selectedTeam && !isCorrect) {
      // Deduct points for wrong answer in buzzer round via API
      await handleAwardPoints(selectedTeam, -buzzerPoints);
    }
  };

  const enterPresentationMode = async () => {
    if (presentRef.current) {
      try {
        await presentRef.current.requestFullscreen();
        // Focus the presentation container to ensure keyboard events are captured
        setTimeout(() => {
          presentRef.current?.focus();
        }, 100);
      } catch (error) {
        console.error("Error entering fullscreen:", error);
      }
    }
  };

  const exitPresentationMode = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const getDynamicButtonText = () => {
    if (currentState === "idle") {
      if (roundType === "rapid_fire") {
        return "Start Timer (Q)";
      }
      return "Show Question (Q)";
    } else if (currentState === "question_shown") {
      if (roundType === "rapid_fire") {
        return "Start 1 Min Timer (O)";
      } else if (roundType === "visual_rapid_fire") {
        return "Start 1 Min Timer (O)";
      } else if (roundType === "mcq") {
        return "Show Options & Start Timer (O)";
      } else if (roundType === "media") {
        return "Show Media (O)";
      } else if (roundType === "buzzer") {
        return "Show Options (O)";
      } else if (roundType === "sequence") {
        return "Show Options (O)";
      }
      return "Show Options (O)";
    } else if (currentState === "options_shown") {
      if (roundType === "sequence") {
        return "Compare Sequence (A)";
      }
      if (roundType === "visual_rapid_fire") {
        return "Next Image (O) | Next Question (N)";
      }
      if (roundType === "mcq" || roundType === "media") {
        return "Next Question (N)";
      } else if (roundType === "buzzer") {
        return "Next Question (N)";
      } else if (roundType === "rapid_fire") {
        return "Next Question (N)";
      }
      return "Show Answer (A)";
    } else if (currentState === "answer_shown") {
      return "Next Question";
    }
    return "Continue";
  };

  const handleDynamicButtonClick = () => {
    if (currentState === "idle") {
      handleQuestionToggle();
    } else if (currentState === "question_shown") {
      handleOptionsToggle();
    } else if (currentState === "options_shown") {
      if (roundType === "sequence") {
        // Initialize sequence comparison and show modal
        initializeSequenceComparison();
      } else if (
        roundType === "mcq" ||
        roundType === "media" ||
        roundType === "rapid_fire"
      ) {
        handleNextQuestion();
      } else {
        handleAnswerToggle();
      }
    } else if (currentState === "answer_shown") {
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
            <h2 className="text-xl font-semibold mb-2">
              Competition Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The requested competition could not be loaded.
            </p>
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
                {currentPhase === "league"
                  ? "League"
                  : currentPhase === "semi_final"
                  ? "Semi-Final"
                  : "Final"}
              </Badge>
              {/* <span className="text-xs text-gray-500">(Auto-detected from competition stage)</span> */}
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
                <div className="text-sm font-medium">
                  {getCurrentRound().name}
                </div>
                <div className="text-xs text-gray-500">
                  {currentRoundIndex + 1} /{" "}
                  {
                    phaseStructure[currentPhase as keyof typeof phaseStructure]
                      .length
                  }
                </div>
              </div>
              <Button
                onClick={nextRound}
                disabled={
                  currentRoundIndex ===
                  phaseStructure[currentPhase as keyof typeof phaseStructure]
                    .length -
                    1
                }
                variant="outline"
                size="sm"
              >
                Next →
              </Button>
            </div>

            <Button
              onClick={() => setShowScoreModal(true)}
              variant="outline"
              className="mr-2"
            >
              Show Scores
            </Button>
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
                  {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
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
                  <div>
                    <strong>State:</strong> {currentState}
                  </div>
                  <div>
                    <strong>Round:</strong> {roundType}
                  </div>
                  <div>
                    <strong>Question:</strong>{" "}
                    {currentQuestion ? "Loaded" : "None"}
                  </div>
                  <div>
                    <strong>Index:</strong> {currentQuestionIndex + 1}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {noQuestionsForType ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    No Questions Available
                  </h3>
                  <p className="text-gray-600">
                    No questions found for the selected round type.
                  </p>
                </CardContent>
              </Card>
            ) : currentQuestion ? (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>
                      Question {currentQuestionIndex + 1} -{" "}
                      {roundType.toUpperCase()}
                    </CardTitle>
                    <Badge variant="secondary">
                      {currentQuestion.points} points
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Question Display - Hide for rapid fire */}
                  {currentState !== "idle" && (
                    <div className="mb-6">
                      {roundType !== "rapid_fire" && (
                        <h3 className="text-xl font-semibold mb-4 quiz-font">
                          {currentQuestion.question}
                        </h3>
                      )}

                      {/* Media Display - Only show when options are shown for media rounds */}
                      {currentQuestion.mediaUrl &&
                        currentState === "options_shown" && (
                          <div className="text-center mb-6">
                            {currentQuestion.mediaType === "image" && (
                              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
                                <img
                                  src={currentQuestion.mediaUrl}
                                  alt="Question media"
                                  className="max-w-5xl max-h-[36rem] md:max-h-[42rem] object-contain mx-auto rounded-lg shadow-lg"
                                />
                              </div>
                            )}
                            {currentQuestion.mediaType === "audio" && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                                <div className="flex items-center justify-center mb-4">
                                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg
                                      className="w-8 h-8 text-white"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793l-4.146-3.317a1 1 0 00-.632-.226H2a1 1 0 01-1-1V7.618a1 1 0 011-1h1.605a1 1 0 00.632-.226l4.146-3.317z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                </div>
                                <audio
                                  controls
                                  className="w-full max-w-md mx-auto"
                                >
                                  <source src={currentQuestion.mediaUrl} />
                                  Your browser does not support the audio
                                  element.
                                </audio>
                              </div>
                            )}
                            {currentQuestion.mediaType === "video" && (
                              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
                                <video
                                  controls
                                  className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
                                >
                                  <source src={currentQuestion.mediaUrl} />
                                  Your browser does not support the video
                                  element.
                                </video>
                              </div>
                            )}
                          </div>
                        )}

                      {/* Round-specific Content */}

                      {/* MCQ Options */}
                      {roundType === "mcq" &&
                        currentQuestion?.options &&
                        (currentState === "options_shown" ||
                          (currentState === "timer_running" &&
                            isTimerActive)) && (
                          <div className="mb-6">
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              {currentQuestion.options.map((option, index) => (
                                <Button
                                  key={index}
                                  variant={
                                    (typeof currentQuestion.correctAnswer ===
                                    "string"
                                      ? option === currentQuestion.correctAnswer
                                      : index ===
                                        currentQuestion.correctAnswer) &&
                                    (showCorrectAnswer ||
                                      selectedOption !== null)
                                      ? "default"
                                      : selectedOption === index &&
                                        !(typeof currentQuestion.correctAnswer ===
                                        "string"
                                          ? option ===
                                            currentQuestion.correctAnswer
                                          : index ===
                                            currentQuestion.correctAnswer)
                                      ? "destructive"
                                      : "outline"
                                  }
                                  className={`text-lg p-4 h-auto ${
                                    (typeof currentQuestion.correctAnswer ===
                                    "string"
                                      ? option === currentQuestion.correctAnswer
                                      : index ===
                                        currentQuestion.correctAnswer) &&
                                    (showCorrectAnswer ||
                                      selectedOption !== null)
                                      ? "bg-green-500 hover:bg-green-600 text-white"
                                      : selectedOption === index &&
                                        !(typeof currentQuestion.correctAnswer ===
                                        "string"
                                          ? option ===
                                            currentQuestion.correctAnswer
                                          : index ===
                                            currentQuestion.correctAnswer)
                                      ? "bg-red-500 hover:bg-red-600 text-white"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    handleOptionSelect(option, index)
                                  }
                                >
                                  <span className="quiz-font">{String.fromCharCode(65 + index)}. {option}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Media Round Content */}
                      {roundType === "media" &&
                        currentState === "options_shown" &&
                        currentQuestion.mediaUrl && (
                          <div className="text-center mb-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-blue-800 font-semibold">
                                Media content is displayed above. Press A to
                                show answer or award points manually.
                              </p>
                            </div>
                          </div>
                        )}

                      {/* Media Round Answer Display */}
                      {roundType === "media" &&
                        currentState === "answer_shown" && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-green-800 mb-2">
                              Answer:
                            </h4>
                            <p className="text-green-700 text-lg">
                              {currentQuestion?.correctAnswer}
                            </p>
                          </div>
                        )}

                      {/* Buzzer Round Team Selection */}
                      {roundType === "buzzer" &&
                        (currentState === "question_shown" ||
                          currentState === "options_shown") && (
                          <div className="space-y-4 mb-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <p className="text-yellow-800 font-semibold text-lg">
                                🔔 Buzzer Round - Select Team That Buzzed First
                              </p>
                              <p className="text-yellow-700 mt-2">
                                Click on the team that pressed their buzzer
                                first to answer
                              </p>
                            </div>

                            {/* Team Selection Buttons */}
                            <div className="grid grid-cols-3 gap-3">
                              {currentGroup?.teams?.map((team, index) => (
                                <Button
                                  key={team._id}
                                  variant={
                                    selectedTeam === team._id
                                      ? "default"
                                      : "outline"
                                  }
                                  className={`text-lg p-4 h-auto ${
                                    selectedTeam === team._id
                                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                                      : "hover:bg-blue-50"
                                  }`}
                                  onClick={() => setSelectedTeam(team._id)}
                                >
                                  <div className="text-center">
                                    <div className="font-bold">{team.name}</div>
                                    <div className="text-sm opacity-75">
                                      Score: {teamScores[team._id] || 0}
                                    </div>
                                  </div>
                                </Button>
                              ))}
                            </div>

                            {/* Answer Options after team selection */}
                            {selectedTeam && currentQuestion.options && (
                              <div className="mt-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                  <p className="text-blue-800 font-medium">
                                    Selected Team:{" "}
                                    {
                                      currentGroup?.teams?.find(
                                        (t) => t._id === selectedTeam
                                      )?.name
                                    }
                                  </p>
                                  <p className="text-blue-700 text-sm">
                                    Now select their answer:
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  {currentQuestion.options.map(
                                    (option, index) => (
                                      <Button
                                        key={index}
                                        variant={
                                          selectedOption === index
                                            ? "default"
                                            : "outline"
                                        }
                                        className={`text-lg p-3 h-auto ${
                                          selectedOption === index
                                            ? (
                                                typeof currentQuestion.correctAnswer ===
                                                "string"
                                                  ? option ===
                                                    currentQuestion.correctAnswer
                                                  : index ===
                                                    currentQuestion.correctAnswer
                                              )
                                              ? "bg-green-500 hover:bg-green-600 text-white"
                                              : "bg-red-500 hover:bg-red-600 text-white"
                                            : ""
                                        }`}
                                        onClick={() =>
                                          handleBuzzerAnswer(option, index)
                                        }
                                      >
                                        {String.fromCharCode(65 + index)}.{" "}
                                        {option}
                                      </Button>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      {/* Rapid Fire Round */}
                      {roundType === "rapid_fire" &&
                        currentState === "options_shown" && (
                          <div className="text-center mb-4">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <p className="text-orange-800 font-semibold text-xl">
                                Rapid Fire Round - 1 Minute Timer
                              </p>
                              <p className="text-orange-700 mt-2">
                                Questions asked orally by anchor. Timer started
                                automatically. Award points by clicking team
                                buttons below.
                              </p>
                              <div className="mt-3">
                                <div className="text-4xl font-mono font-bold text-orange-800">
                                  {Math.floor(timeLeft / 60)}:
                                  {(timeLeft % 60).toString().padStart(2, "0")}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Sequence Round Options */}
                      {roundType === "sequence" &&
                        currentQuestion.options &&
                        currentState === "options_shown" && (
                          <div className="space-y-3 mb-4">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                              <p className="text-purple-800 font-semibold">
                                🔢 Sequence Round - Click options in the order
                                given by the team:
                              </p>
                              <p className="text-purple-700 text-sm mt-1">
                                Selected sequence:{" "}
                                {sequenceAnswers
                                  .map((i) => String.fromCharCode(65 + i))
                                  .join(" → ")}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {currentQuestion.options.map((option, index) => (
                                <Button
                                  key={index}
                                  variant={
                                    sequenceAnswers.includes(index)
                                      ? "default"
                                      : "outline"
                                  }
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
                                  <span className="quiz-font">{String.fromCharCode(65 + index)}. {option}</span>
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
                      {roundType === "visual_rapid_fire" &&
                        currentState === "options_shown" && (
                          <div className="text-center mb-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <p className="text-green-800 font-semibold text-xl quiz-font">
                                Visual Rapid Fire - 1 Minute
                              </p>
                              <p className="text-green-700 mt-2 quiz-font">
                                Press 'O' to show next image. Image {currentImageIndex + 1} of {currentQuestion?.imageUrls?.length || 0}
                              </p>
                              {currentQuestion?.imageUrls?.[currentImageIndex] && (
                                <div className="mt-4 relative">
                                  <img 
                                    src={currentQuestion.imageUrls[currentImageIndex]} 
                                    alt={`Visual Rapid Fire Image ${currentImageIndex + 1}`}
                                    className="max-w-5xl max-h-[36rem] md:max-h-[42rem] object-contain mx-auto rounded-lg shadow-lg"
                                    onLoad={() => console.log(`Image ${currentImageIndex + 1} loaded`)}
                                    onError={() => console.error(`Failed to load image ${currentImageIndex + 1}`)}
                                  />

                                  {!imagesPreloaded[currentImageIndex] && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                                      <div className="text-gray-500">Loading...</div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Answer Display */}
                      {currentState === "answer_shown" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-800 mb-2">
                            Correct Answer:
                          </h4>
                          <p className="text-green-700">
                            {typeof currentQuestion.correctAnswer === "string"
                              ? currentQuestion.correctAnswer
                              : currentQuestion.options?.[
                                  currentQuestion.correctAnswer as number
                                ]}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rapid Fire Timer Display for Admin */}
                  {/* {roundType === "rapid_fire" && currentState === "options_shown" && (
                    <div className="text-center mb-6">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                        <h3 className="text-orange-800 font-semibold text-2xl mb-4">
                          Rapid Fire Round - Question {currentQuestionIndex + 1} of 3
                        </h3>
                        <div className="text-6xl font-mono font-bold text-orange-800 mb-4">
                          {Math.floor(timeLeft / 60)}:
                          {(timeLeft % 60).toString().padStart(2, "0")}
                        </div>
                        <p className="text-orange-700 text-lg">
                          Questions asked orally by anchor. Award points using team buttons below.
                        </p>
                      </div>
                    </div>
                  )} */}

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
                        <h3 className="text-xl font-bold mb-4">
                          Sequence Comparison
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <p className="font-semibold text-gray-700">
                              Team's Answer:
                            </p>
                            <p className="text-lg">
                              {sequenceAnswers
                                .map((i) => String.fromCharCode(65 + i))
                                .join(" → ")}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">
                              Correct Answer:
                            </p>
                            <p className="text-lg text-green-600">
                              {Array.isArray(currentQuestion.correctAnswer)
                                ? currentQuestion.correctAnswer
                                    .map((i: number) =>
                                      String.fromCharCode(65 + i)
                                    )
                                    .join(" → ")
                                : "A → B → C → D"}
                            </p>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              onClick={toggleSequenceModal}
                              variant="outline"
                            >
                              Close
                            </Button>
                            <Button
                              onClick={() => {
                                toggleSequenceModal();
                                setState("answer_shown");
                              }}
                            >
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
                    <h2 className="text-2xl font-bold mb-4">
                      Competition Ready
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Press keyboard shortcuts to control the presentation:
                    </p>
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-left">
                      <div className="bg-blue-50 p-3 rounded">
                        <kbd className="bg-blue-200 px-2 py-1 rounded text-sm font-mono">
                          Q
                        </kbd>
                        <span className="ml-2">Show Question</span>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <kbd className="bg-green-200 px-2 py-1 rounded text-sm font-mono">
                          O
                        </kbd>
                        <span className="ml-2">Show Options & Start Timer</span>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded">
                        <kbd className="bg-yellow-200 px-2 py-1 rounded text-sm font-mono">
                          A
                        </kbd>
                        <span className="ml-2">
                          Show Answer (Buzzer/Rapid Fire only)
                        </span>
                      </div>
                      <div className="bg-purple-50 p-3 rounded">
                        <kbd className="bg-purple-200 px-2 py-1 rounded text-sm font-mono">
                          T
                        </kbd>
                        <span className="ml-2">Toggle Timer</span>
                      </div>
                      <div className="bg-red-50 p-3 rounded">
                        <kbd className="bg-red-200 px-2 py-1 rounded text-sm font-mono">
                          N
                        </kbd>
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
                            ? "bg-gray-400 cursor-not-allowed"
                            : roundType === "mcq" && selectedOption !== null
                            ? isOptionCorrect
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "bg-red-600 hover:bg-red-700 text-white cursor-not-allowed"
                            : ""
                        }`}
                        onClick={() =>
                          handleAwardPoints(
                            team._id,
                            getCurrentRoundPoints()
                          )
                        }
                        disabled={
                          !currentQuestion ||
                          (roundType === "mcq" &&
                            selectedOption !== null &&
                            !isOptionCorrect)
                        }
                      >
                        +{getCurrentRoundPoints()}
                        {roundType === "mcq" &&
                          selectedOption !== null &&
                          (isOptionCorrect ? " ✓" : " ✗")}
                      </Button>
                      {(roundType === "buzzer" || getCurrentRoundNegativeMarking()) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleAwardPoints(
                              team._id,
                              -getCurrentRoundPoints()
                            )
                          }
                          disabled={!currentQuestion}
                        >
                          -{getCurrentRoundPoints()}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score Display Modal - Outside presentation for admin screen */}
        {!isPresenting && (
          <Dialog open={showScoreModal} onOpenChange={setShowScoreModal}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">

              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  Current Scores -{" "}
                  {currentPhase === "league"
                    ? "League"
                    : currentPhase === "semi_final"
                    ? "Semi-Final"
                    : "Final"}{" "}
                  Phase
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {competition?.groups?.map((group) => (
                  <div key={group._id} className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      {group.name}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-2 text-left">
                              Rank
                            </th>
                            <th className="border border-gray-300 px-4 py-2 text-left">
                              Team Name
                            </th>
                            <th className="border border-gray-300 px-4 py-2 text-left">
                              School
                            </th>
                            <th className="border border-gray-300 px-4 py-2 text-center">
                              Score
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.teams
                            ?.map((team) => ({
                              ...team,
                              score:
                                teamScores[team._id] || team.totalScore || 0,
                            }))
                            ?.sort((a, b) => b.score - a.score)
                            ?.map((team, index) => (
                              <tr
                                key={team._id}
                                className={`${
                                  index === 0
                                    ? "bg-yellow-50"
                                    : index === 1
                                    ? "bg-gray-50"
                                    : index === 2
                                    ? "bg-orange-50"
                                    : "bg-white"
                                } hover:bg-blue-50`}
                              >
                                <td className="border border-gray-300 px-4 py-2">
                                  <span className="flex items-center">
                                    <span className="text-xl mr-2">
                                      {index === 0
                                        ? "🥇"
                                        : index === 1
                                        ? "🥈"
                                        : index === 2
                                        ? "🥉"
                                        : `${index + 1}.`}
                                    </span>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="border border-gray-300 px-4 py-2 font-semibold">
                                  {team.name}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-gray-600">
                                  {team.school.name}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-center">
                                  <span className="text-xl font-bold text-blue-600">
                                    {team.score}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button onClick={() => setShowScoreModal(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Round Summary Modal - Admin screen */}
        {!isPresenting && (
          <Dialog open={showRoundSummaryModal} onOpenChange={setShowRoundSummaryModal}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                  {(completedRoundInfo?.name || completedRoundInfo?.type?.toString().toUpperCase() || "Round")} Complete - {currentPhase === "league" ? "League" : currentPhase === "semi_final" ? "Semi-Final" : "Final"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                  <p className="text-indigo-800">
                    Great job! Here's the current standing for <span className="font-semibold">{currentGroup?.name}</span> after this round.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {currentGroup?.teams
                    ?.map((team) => ({
                      ...team,
                      score: teamScores[team._id] ?? team.totalScore ?? 0,
                    }))
                    ?.sort((a, b) => b.score - a.score)
                    ?.map((team, index) => (
                      <div
                        key={team._id}
                        className={`flex justify-between items-center p-4 rounded-lg border ${
                          index === 0
                            ? "bg-yellow-50 border-yellow-300"
                            : index === 1
                            ? "bg-gray-50 border-gray-300"
                            : index === 2
                            ? "bg-orange-50 border-orange-300"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                          </span>
                          <div>
                            <h4 className="font-semibold">{team.name}</h4>
                            <p className="text-sm text-gray-600">{team.school.name}</p>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{team.score}</div>
                      </div>
                    ))}
                </div>
              </div>
              <DialogFooter className="flex gap-3">
                <Button variant="outline" onClick={() => setShowRoundSummaryModal(false)}>Close</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleContinueToNextRound}>
                  Continue to Next Round
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Group Summary Modal */}
        <Dialog
          open={showGroupSummaryModal}
          onOpenChange={setShowGroupSummaryModal}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                Phase 1 Complete - {currentGroup?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 text-lg mb-2">
                  🎉 Buzzer Round Completed!
                </h3>
                <p className="text-green-700">
                  All rounds in Phase 1 have been completed for this group.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4">Final Scores</h3>
                <div className="grid grid-cols-1 gap-3">
                  {currentGroup?.teams
                    ?.map((team) => ({
                      ...team,
                      score: teamScores[team._id] || 0,
                    }))
                    ?.sort((a, b) => b.score - a.score)
                    ?.map((team, index) => (
                      <div
                        key={team._id}
                        className={`flex justify-between items-center p-4 rounded-lg border ${
                          index === 0
                            ? "bg-yellow-50 border-yellow-300"
                            : index === 1
                            ? "bg-gray-50 border-gray-300"
                            : index === 2
                            ? "bg-orange-50 border-orange-300"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">
                            {index === 0
                              ? "🥇"
                              : index === 1
                              ? "🥈"
                              : index === 2
                              ? "🥉"
                              : `${index + 1}.`}
                          </span>
                          <div>
                            <h4 className="font-semibold">{team.name}</h4>
                            <p className="text-sm text-gray-600">
                              {team.school.name}
                            </p>
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
      <div
        ref={presentRef}
        tabIndex={0}
        onKeyDown={(event) => {
          // Handle keyboard shortcuts directly on presentation screen
          if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement
          ) {
            return;
          }

          const key = event.key.toLowerCase();
          event.preventDefault();

          switch (key) {
            case "q":
              if (!currentQuestion && competition && currentGroup) {
                const firstRound = getCurrentRound();
                setRoundType(firstRound.type as any);
                loadQuestions(firstRound.type, currentPhase);
              } else if (currentQuestion) {
                handleQuestionToggle();
              }
              break;
            case "o":
              if (roundType === "visual_rapid_fire" && currentState === "options_shown") {
                handleNextImage();
              } else {
                handleOptionsToggle();
              }
              break;
            case "a":
              if (currentQuestion) {
                if (roundType === "sequence" && showSequenceModal) {
                  handleSequenceReveal();
                } else if (roundType === "media") {
                  handleMediaAnswerToggle();
                } else {
                  handleAnswerToggle();
                }
              }
              break;
            case "t":
              handleTimerToggle();
              break;
            case "n":
              if (currentQuestion) {
                stopAllAudio();
                setState("idle");
                handleNextQuestion();
              }
              break;
            case "p":
              if (currentQuestionIndex > 0) {
                stopAllAudio();
                setState("idle");
                handlePrevQuestion();
              }
              break;
            case "escape":
              exitPresentationMode();
              break;
            case "arrowleft":
            case "[":
              // Previous round
              if (currentRoundIndex > 0) {
                previousRound();
              }
              break;
            case "arrowright":
            case "]":
              // Next round
              const rounds = phaseStructure[currentPhase as keyof typeof phaseStructure];
              if (currentRoundIndex < rounds.length - 1) {
                nextRound();
              }
              break;
          }
        }}
        className={`${
          isPresenting ? "block" : "hidden"
        } fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white z-50 outline-none`}
      >
        {/* Round Summary Modal - Presentation overlay */}
        {isPresenting && showRoundSummaryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[80] p-6">
            <div className="bg-gradient-to-br from-indigo-700 to-purple-700 rounded-2xl p-8 w-full max-w-4xl text-white shadow-2xl">
              <div className="flex items-center justify-center mb-6">
                <Trophy className="w-10 h-10 mr-3 text-yellow-300" />
                <h2 className="text-3xl font-bold">
                  {(completedRoundInfo?.name || completedRoundInfo?.type?.toString().toUpperCase() || "Round")} Complete - {currentPhase === "league" ? "League" : currentPhase === "semi_final" ? "Semi-Final" : "Final"}
                </h2>
              </div>
              <p className="text-center text-lg text-indigo-100 mb-6">
                Current standings for <span className="font-semibold text-white">{currentGroup?.name}</span>
              </p>
              <div className="space-y-3">
                {currentGroup?.teams
                  ?.map((team) => ({
                    ...team,
                    score: teamScores[team._id] ?? team.totalScore ?? 0,
                  }))
                  ?.sort((a, b) => b.score - a.score)
                  ?.map((team, index) => (
                    <div
                      key={team._id}
                      className={`flex justify-between items-center p-4 rounded-xl border-2 ${
                        index === 0
                          ? "bg-yellow-500/20 border-yellow-300"
                          : index === 1
                          ? "bg-gray-500/20 border-gray-300"
                          : index === 2
                          ? "bg-orange-500/20 border-orange-300"
                          : "bg-white/10 border-white/20"
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-3xl mr-4">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                        </span>
                        <div>
                          <h4 className="text-2xl font-bold text-white">{team.name}</h4>
                          <p className="text-sm text-indigo-200">{team.school.name}</p>
                        </div>
                      </div>
                      <div className="text-3xl font-extrabold text-yellow-300">{team.score}</div>
                    </div>
                  ))}
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowRoundSummaryModal(false)} className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                  Close
                </Button>
                <Button onClick={handleContinueToNextRound} className="bg-blue-500 hover:bg-blue-600 text-white">
                  Continue to Next Round
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Final Winner Modal - Presentation overlay */}
        {isPresenting && showFinalWinnerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[90] p-6">
            <div className="bg-gradient-to-br from-purple-700 to-pink-700 rounded-2xl p-10 w-full max-w-4xl text-white shadow-2xl text-center">
              <div className="flex items-center justify-center mb-6">
                <Trophy className="w-12 h-12 mr-3 text-yellow-300" />
                <h2 className="text-4xl font-extrabold">Final Complete</h2>
              </div>
              {!winnerRevealed ? (
                <>
                  <p className="text-2xl text-indigo-100 mb-4">Press 'A' to reveal the Winner</p>
                  <p className="text-indigo-200">Keep the suspense! 🎉</p>
                </>
              ) : (
                <>
                  <p className="text-xl text-indigo-100 mb-2">Champion</p>
                  <h3 className="text-6xl font-extrabold text-yellow-300 mb-2">
                    {currentGroup?.teams.find((t) => t._id === finalWinnerTeamId)?.name || "Winner"}
                  </h3>
                  <p className="text-lg text-indigo-100">
                    {currentGroup?.teams.find((t) => t._id === finalWinnerTeamId)?.school?.name || ""}
                  </p>
                </>
              )}
              <div className="mt-10 flex justify-center gap-3">
                <Button variant="outline" onClick={() => setShowFinalWinnerModal(false)} className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[100]">
            <div className="confetti-container">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'][Math.floor(Math.random() * 6)]
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="h-full flex flex-col">
          {/* Presentation Header */}
          <div className="bg-gradient-to-r from-purple-800 to-blue-800 p-4 flex justify-between items-center shadow-lg">
            <div className="flex items-center space-x-6">
              <h1 className="text-4xl md:text-5xl font-extrabold">{competition.name}</h1>
              <div className="flex items-center space-x-4 text-lg">
                <Badge variant="secondary" className="px-3 py-1">
                  {currentPhase === "league"
                    ? "League"
                    : currentPhase === "semi_final"
                    ? "Semi-Final"
                    : "Final"}
                </Badge>
                {tieBreakerMode && (
                  <Badge className="px-3 py-1 bg-red-500 hover:bg-red-600">Tie-breaker</Badge>
                )}
                {getCurrentRoundNegativeMarking() && (
                  <Badge className="px-3 py-1 bg-orange-500 hover:bg-orange-600">Negative Marking</Badge>
                )}
                <span className="text-gray-300">|</span>
                <span className="text-white">{currentGroup?.name}</span>
                {currentQuestion && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-white">
                      Q{currentQuestionIndex + 1} of Q{questions.length} - {roundType.toUpperCase()}
                    </span>
                  </>
                )}
              </div>
            </div>
            <img
              src="/logo.png"
              alt="Quiz Competition Logo"
              className="w-32 h-24 mx-auto object-contain"
            />
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setShowScoreModal(true)}
                variant="outline"
                size="sm"
                className="bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400 hover:border-yellow-400 font-bold"
              >
                Show Scores
              </Button>
              <Button onClick={exitPresentationMode} variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>


          {/* Presentation Content */}
          <div className="flex-1 flex flex-col">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">

              {/* Show content based on round type and state */}
              {roundType === "rapid_fire" &&
              currentState === "options_shown" ? (
                <div className="text-center space-y-8">
                  <h2 className="text-8xl font-bold text-orange-400">
                    Rapid Fire Round
                  </h2>
                  <p className="text-3xl text-gray-300">
                    Questions asked orally by anchor
                  </p>
                </div>
              ) : currentQuestion &&
                (currentState === "question_shown" ||
                  currentState === "options_shown" ||
                  currentState === "timer_running" ||
                  currentState === "answer_shown") ? (
                <div className="text-center w-full space-y-8">
                  {/* Question Text - Full Width */}
                  {!(roundType === "media" && currentState === "options_shown") && (
                    <h2 className="text-6xl font-bold quiz-font leading-tight">
                      {currentQuestion.question}
                    </h2>
                  )}

                  {/* Media removed from here - only show on O press */}
                  {/* Media Display */}
                  {currentQuestion?.mediaUrl &&
                    currentState === "options_shown" && (
                      <div className="mt-6 flex justify-center">
                        {mediaLoading && (
                          <div className="flex items-center space-x-2 text-blue-600">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span>Loading media...</span>
                          </div>
                        )}
                        {!mediaLoading && (
                          <>
                            {currentQuestion.mediaType === "image" && (
                              <img
                                src={currentQuestion.mediaUrl}
                                alt="Question media"
                                className="max-w-5xl max-h-[36rem] md:max-h-[42rem] object-contain rounded-lg shadow-lg"
                                onLoad={() => {
                                  console.log(
                                    "Image loaded, starting timer for",
                                    roundType
                                  );
                                  if (currentState === "options_shown") {
                                    startTimer(roundType === "media" ? 15 : 60);
                                    playTimerAudio(); // Play timer sound
                                  }
                                }}
                              />
                            )}
                            {currentQuestion.mediaType === "audio" && (
                              <audio
                                controls
                                className="w-full max-w-md"
                                onCanPlayThrough={() => {
                                  console.log(
                                    "Audio loaded, starting timer for",
                                    roundType
                                  );
                                  if (currentState === "options_shown") {
                                    startTimer(15);
                                    playTimerAudio(); // Play timer sound
                                  }
                                }}
                              >
                                <source
                                  src={currentQuestion.mediaUrl}
                                  type="audio/mpeg"
                                />
                                Your browser does not support the audio element.
                              </audio>
                            )}
                            {currentQuestion.mediaType === "video" && (
                              <video
                                controls
                                className="max-w-5xl max-h-[36rem] md:max-h-[42rem] rounded-lg shadow-lg"
                                onCanPlayThrough={() => {
                                  console.log(
                                    "Video loaded, starting timer for",
                                    roundType
                                  );
                                  if (currentState === "options_shown") {
                                    startTimer(15);
                                    playTimerAudio(); // Play timer sound
                                  }
                                }}
                              >
                                <source
                                  src={currentQuestion.mediaUrl}
                                  type="video/mp4"
                                />
                                Your browser does not support the video element.
                              </video>
                            )}
                          </>
                        )}
                      </div>
                    )}

                  {/* MCQ Options in presentation - Grid layout with full width */}
                  {roundType === "mcq" &&
                    currentQuestion?.options &&
                    currentState === "options_shown" && (
                      <div className="w-full grid grid-cols-2 gap-6">
                        {currentQuestion.options.map((option, index) => (
                          <div
                            key={index}
                            onClick={() => handleOptionSelect(option, index)}
                            className={`border-4 rounded-xl p-8 cursor-pointer transition-colors text-5xl font-bold ${
                              (typeof currentQuestion.correctAnswer === "string"
                                ? option === currentQuestion.correctAnswer
                                : index === currentQuestion.correctAnswer) &&
                              (showCorrectAnswer || selectedOption !== null)
                                ? "bg-green-600 border-green-400 text-white"
                                : selectedOption === index &&
                                  !(typeof currentQuestion.correctAnswer ===
                                  "string"
                                    ? option === currentQuestion.correctAnswer
                                    : index === currentQuestion.correctAnswer)
                                ? "bg-red-600 border-red-400 text-white"
                                : "border-yellow-400 border-opacity-80 hover:border-yellow-300 hover:bg-yellow-200 hover:text-black bg-gray-800 bg-opacity-90 text-white"
                            }`}
                          >
                            <span className="font-bold text-5xl mr-4">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <span className="quiz-font text-5xl">{option}</span>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Buzzer Round Team Selection in Presentation */}
                  {roundType === "buzzer" &&
                    currentState === "options_shown" && (
                      <div className="mt-8 space-y-6">
                        <div className="grid grid-cols-3 gap-6">
                          {(tieBreakerMode
                            ? currentGroup?.teams?.filter((team) => activeTieTeamIds.includes(team._id))
                            : currentGroup?.teams
                          )?.map((team) => (
                            <div
                              key={team._id}
                              onClick={() => setSelectedTeam(team._id)}
                              className={`border-2 rounded-lg p-6 text-center cursor-pointer transition-colors ${
                                selectedTeam === team._id
                                  ? "bg-blue-500 border-blue-400 text-white"
                                  : "border-gray-400 hover:border-blue-400 bg-white text-black"
                              }`}
                            >
                              <div className="font-bold text-2xl">
                                {team.name}
                              </div>
                              <div className="text-lg opacity-75 mt-2">
                                Score: {teamScores[team._id] || 0}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Answer Options after team selection */}
                        {selectedTeam && currentQuestion.options && (
                          <div className="mt-6">
                            <div className="grid grid-cols-2 gap-4">
                              {currentQuestion.options.map((option, index) => (
                                <div
                                  key={index}
                                  onClick={() =>
                                    handleBuzzerAnswer(option, index)
                                  }
                                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors text-xl ${
                                    selectedOption === index
                                      ? (
                                          typeof currentQuestion.correctAnswer ===
                                          "string"
                                            ? option ===
                                              currentQuestion.correctAnswer
                                            : index ===
                                              currentQuestion.correctAnswer
                                        )
                                        ? "bg-green-500 border-green-400 text-white"
                                        : "bg-red-500 border-red-400 text-white"
                                        : "border-gray-400 bg-white text-black hover:border-blue-400 hover:bg-blue-50 hover:text-black"
                                  }`}
                                >
                                  <span className="quiz-font">{String.fromCharCode(65 + index)}. {option}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Visual Rapid Fire in Presentation */}
                  {roundType === "visual_rapid_fire" &&
                    currentQuestion?.imageUrls &&
                    currentState === "options_shown" && (
                      <div className="text-center">
                        <h2 className="text-4xl font-bold mb-6 text-purple-400">
                          Visual Rapid Fire - Image {currentImageIndex + 1}/
                          {currentQuestion.imageUrls.length}
                        </h2>
                        <div className="relative">
                          {imagesPreloaded[currentImageIndex] ? (
                            <img
                              src={currentQuestion.imageUrls[currentImageIndex]}
                              alt={`Visual rapid fire ${currentImageIndex + 1}`}
                              className="max-w-6xl max-h-[42rem] md:max-h-[48rem] object-contain rounded-lg shadow-lg mx-auto"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-[42rem] w-full max-w-6xl mx-auto bg-gray-200 rounded-lg">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading image...</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-xl text-gray-300 mt-4">
                          Press O to cycle through images
                        </p>
                      </div>
                    )}

                  {/* Sequence Round in Presentation */}
                  {roundType === "sequence" && showSequenceModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[70]">
                      <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 text-black">
                        <h2 className="text-3xl font-bold mb-6 text-center">
                          Sequence Round
                        </h2>
                        <div className="text-2xl font-bold mb-4 text-center">
                          {currentQuestion?.question}
                        </div>
                        
                        {(currentQuestion as any)?.sequenceSteps && (
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            {(currentQuestion as any).sequenceSteps.map((step: string, index: number) => (
                              <div
                                key={index}
                                className={`border-2 rounded-lg p-4 text-center transition-all ${
                                  index < sequenceRevealStep
                                    ? "bg-blue-100 border-blue-400"
                                    : "bg-gray-100 border-gray-300"
                                }`}
                              >
                                <div className="font-bold text-lg mb-2">
                                  Step {index + 1}
                                </div>
                                {index < sequenceRevealStep ? (
                                  <div className="text-lg">{step}</div>
                                ) : (
                                  <div className="text-gray-400">Hidden</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-center">
                          <p className="text-lg text-gray-600 mb-4">
                            Press A to reveal next step or show answer
                          </p>
                          {sequenceRevealStep >= ((currentQuestion as any)?.sequenceSteps?.length || 0) && (
                            <div className="bg-green-100 border border-green-400 rounded-lg p-4">
                              <h3 className="font-bold text-xl mb-2">Answer:</h3>
                              <p className="text-xl">{(currentQuestion as any)?.answer}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Answer in presentation */}
                  {currentState === "answer_shown" && currentQuestion && (
                    <div className="bg-green-600 border-4 border-green-400 rounded-xl p-12 text-5xl">
                      <h3 className="font-bold mb-6 quiz-font">Correct Answer:</h3>
                      <p className="quiz-font">
                        {typeof currentQuestion.correctAnswer === "string"
                          ? currentQuestion.correctAnswer
                          : currentQuestion.options?.[
                              currentQuestion.correctAnswer as number
                            ]}
                      </p>
                    </div>
                  )}
                </div>
                ) : (
                <div className="text-center">
                  <h2 className="text-6xl font-bold mb-4">Ready</h2>
                  <p className="text-2xl text-gray-400">
                    Press Q to show question
                  </p>
                </div>
              )}
            </div>

            {/* Team Scores and Controls in presentation - Kid-friendly colors */}
            {currentGroup && (
              <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-8 border-t-4 border-yellow-400">
                <div className="flex justify-around items-center">
                  {(tieBreakerMode
                    ? currentGroup.teams?.filter((team) => activeTieTeamIds.includes(team._id))
                    : currentGroup.teams
                  )?.map((team) => (
                    <div key={team._id} className="text-center bg-black bg-opacity-40 rounded-xl p-6 backdrop-blur-sm border-2 border-white border-opacity-30">
                      <h3 className="text-4xl font-bold mb-4 text-white">{team.name}</h3>
                      <p className="text-6xl font-mono font-bold mb-4 text-yellow-300">
                        {teamScores[team._id] || 0}
                      </p>
                      {/* Quick scoring buttons in presentation */}
                      <div className="flex gap-2">
                        <Button
                          size="lg"
                          onClick={() =>
                            handleAwardPoints(
                              team._id,
                              getCurrentRoundPoints()
                            )
                          }
                          disabled={
                            !currentQuestion ||
                            (roundType === "mcq" && selectedOption !== null && !isOptionCorrect) ||
                            (tieBreakerMode && !activeTieTeamIds.includes(team._id))
                          }
                          className="text-lg px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold"
                        >
                          +{getCurrentRoundPoints()}
                          {roundType === "mcq" && selectedOption !== null && (
                            isOptionCorrect ? " ✓" : " ✗"
                          )}
                        </Button>
                        {(roundType === "buzzer" || getCurrentRoundNegativeMarking()) && (
                          <Button
                            size="lg"
                            onClick={() =>
                              handleAwardPoints(
                                team._id,
                                -getCurrentRoundPoints()
                              )
                            }
                            disabled={!currentQuestion || (tieBreakerMode && !activeTieTeamIds.includes(team._id))}
                            className="text-lg px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold"
                          >
                            -{getCurrentRoundPoints()}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-4 left-4 text-sm text-gray-400">
            Q: Question | O: Options | A: Answer | T: Timer | N: Next | ←/→: Rounds
          </div>

          {/* Score Display Modal - Inside presentation for presentation screen */}
          {showScoreModal && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center">
                      <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                      Current Scores -{" "}
                      {currentPhase === "league"
                        ? "League"
                        : currentPhase === "semi_final"
                        ? "Semi-Final"
                        : "Final"}{" "}
                      Phase
                    </h2>
                    <Button
                      onClick={() => setShowScoreModal(false)}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Close
                    </Button>
                  </div>

                  <div className="space-y-8">
                    {competition?.groups?.map((group) => (
                      <div key={group._id} className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 pb-2">
                          {group.name}
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border-2 border-gray-400 text-lg">
                            <thead>
                              <tr className="bg-blue-600 text-white">
                                <th className="border border-gray-400 px-6 py-4 text-left font-bold">
                                  Sr No.
                                </th>
                                <th className="border border-gray-400 px-6 py-4 text-left font-bold">
                                  Team Name
                                </th>
                                <th className="border border-gray-400 px-6 py-4 text-left font-bold">
                                  School
                                </th>
                                <th className="border border-gray-400 px-6 py-4 text-center font-bold">
                                  Score
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.teams
                                ?.map((team) => ({
                                  ...team,
                                  score:
                                    teamScores[team._id] ||
                                    team.totalScore ||
                                    0,
                                }))
                                ?.sort((a, b) => b.score - a.score)
                                ?.map((team, index) => (
                                  <tr
                                    key={team._id}
                                    className={`${
                                      index === 0
                                        ? "bg-yellow-100 border-yellow-400"
                                        : index === 1
                                        ? "bg-gray-100 border-gray-400"
                                        : index === 2
                                        ? "bg-orange-100 border-orange-400"
                                        : "bg-white"
                                    } hover:bg-blue-50 transition-colors`}
                                  >
                                    <td className="border border-gray-400 px-6 py-4">
                                      <span className="flex items-center text-lg">
                                        <span className="text-2xl mr-3">
                                          {index === 0
                                            ? "🥇"
                                            : index === 1
                                            ? "🥈"
                                            : index === 2
                                            ? "🥉"
                                            : ""}
                                        </span>
                                        <span className="font-bold text-black">
                                          {index + 1}
                                        </span>
                                      </span>
                                    </td>
                                    <td className="border border-gray-400 px-6 py-4 font-bold text-lg text-black">
                                      {team.name}
                                    </td>
                                    <td className="border border-gray-400 px-6 py-4 text-black">
                                      {team.school.name}
                                    </td>
                                    <td className="border border-gray-400 px-6 py-4 text-center">
                                      <span className="text-2xl font-bold text-blue-600">
                                        {team.score}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sequence Modal */}
      {showSequenceModal && (
        <Dialog open={showSequenceModal} onOpenChange={toggleSequenceModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Sequence Comparison - Press 'A' to reveal step by step</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6">
              {/* Left side - Correct Sequence */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-green-600">Correct Sequence</h3>
                {sequenceComparison.correct.map((correctIndex, idx) => {
                  const option = currentQuestion?.options?.[correctIndex];
                  const isRevealed = idx < sequenceRevealStep;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded border transition-all duration-500 ${
                        isRevealed
                          ? "bg-green-50 border-green-200 opacity-100"
                          : "bg-gray-100 border-gray-200 opacity-50"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-green-600">
                          {idx + 1}.
                        </span>
                        <span className={isRevealed ? "text-black" : "text-gray-400"}>
                          {isRevealed 
                            ? `${String.fromCharCode(65 + correctIndex)}. ${option}`
                            : "???"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right side - Selected Sequence */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-blue-600">Team's Answer</h3>
                {sequenceComparison.selected.map((selectedIndex, idx) => {
                  const option = currentQuestion?.options?.[selectedIndex];
                  const isRevealed = idx < sequenceRevealStep;
                  const isCorrect = idx < sequenceComparison.correct.length && 
                                   selectedIndex === sequenceComparison.correct[idx];
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded border transition-all duration-500 ${
                        isRevealed
                          ? isCorrect
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                          : "bg-gray-100 border-gray-200 opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`font-bold ${
                            isRevealed 
                              ? isCorrect ? "text-green-600" : "text-red-600"
                              : "text-gray-400"
                          }`}>
                            {idx + 1}.
                          </span>
                          <span className={isRevealed ? "text-black" : "text-gray-400"}>
                            {isRevealed 
                              ? `${String.fromCharCode(65 + selectedIndex)}. ${option}`
                              : "???"}
                          </span>
                        </div>
                        {isRevealed && (
                          <Badge variant={isCorrect ? "default" : "destructive"}>
                            {isCorrect ? "✓" : "✗"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Step {sequenceRevealStep} of {Math.max(sequenceComparison.correct.length, sequenceComparison.selected.length)} revealed
              </p>
              {sequenceRevealStep >= Math.max(sequenceComparison.correct.length, sequenceComparison.selected.length) && (
                <p className="text-lg font-semibold mt-2">
                  All steps revealed! Press 'A' to continue.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button onClick={toggleSequenceModal} variant="outline">Close</Button>
              <Button onClick={handleSequenceReveal}>
                Reveal Next Step
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <audio ref={timerAudioRef} preload="auto">
        <source src="/15s_timer.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={rightAnswerAudioRef} preload="auto">
        <source src="/right_answer.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={wrongAnswerAudioRef} preload="auto">
        <source src="/wrong_answer.mp3" type="audio/mpeg" />
      </audio>

      {/* Confetti CSS */}
      <style jsx>{`
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti-fall 3s linear infinite;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
