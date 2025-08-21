"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  Trophy,
  Users,
  Clock,
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
} from "@/components/ui/alert-dialog";

interface Question {
  _id: string;
  question: string;
  type: "mcq" | "media" | "rapid_fire";
  options?: string[];
  correctAnswer?: string | number;
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
  const [roundType, setRoundType] = useState<"mcq" | "media" | "rapid_fire">(
    "mcq"
  );
  const [teamScores, setTeamScores] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [isRoundActive, setIsRoundActive] = useState(false);
  // Timed reveal state
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Presentation mode
  const [presenting, setPresenting] = useState(false);
  const presentRef = useRef<HTMLDivElement | null>(null);
  // Per-question selection & awarding state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isOptionCorrect, setIsOptionCorrect] = useState<boolean | null>(null);
  const [awardedTeamId, setAwardedTeamId] = useState<string | null>(null);
  const [noQuestionsForType, setNoQuestionsForType] = useState<
    "mcq" | "media" | "rapid_fire" | null
  >(null);

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
          initializeTeamScores(
            data.data.groups[0].teams,
            data.data.teamScores || []
          );
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch competition",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (index: number) => {
    if (!currentQuestion || selectedOption !== null) return; // allow only first click
    setSelectedOption(index);
    const chosen = currentQuestion.options?.[index];
    const ans = currentQuestion.correctAnswer;
    let correct = false;
    if (typeof ans === "number") {
      correct = index === ans;
    } else if (typeof ans === "string") {
      const a = ans.trim().toLowerCase();
      const b = (chosen || "").trim().toLowerCase();
      correct = a === b;
    }
    setIsOptionCorrect(!!correct);
  };

  const handleAwardTeam = async (teamId: string) => {
    if (!currentQuestion) return;
    // For MCQ, require an option selection first. For Media/Rapid Fire, allow direct awarding.
    if (roundType === "mcq" && selectedOption === null) return;
    if (awardedTeamId) return; // already awarded for this question
    // In MCQ, award only if correct; in Media/Rapid Fire, admin click implies correctness.
    const pts =
      roundType === "mcq"
        ? isOptionCorrect
          ? currentQuestion.points
          : 0
        : currentQuestion.points;
    const newTotal = (teamScores[teamId] || 0) + pts;
    if (pts > 0) {
      setTeamScores((prev) => ({ ...prev, [teamId]: newTotal }));
      toast({
        title: "Points Awarded",
        description: `+${pts} to selected team`,
      });
    } else {
      toast({ title: "Incorrect", description: "0 points awarded" });
    }
    setAwardedTeamId(teamId);

    // Persist to competition-scoped scores
    try {
      await fetch(`/api/competitions/${competitionId}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, delta: pts }),
      });
    } catch (e) {
      toast({
        title: "Warning",
        description:
          "Failed to persist competition score immediately. It will remain in the UI.",
        variant: "destructive",
      });
    }
  };

  const initializeTeamScores = (
    teams: Team[],
    compTeamScores: { team: string; score: number }[] = []
  ) => {
    const map: Record<string, number> = {};
    for (const ts of compTeamScores) {
      map[String(ts.team)] = ts.score || 0;
    }
    const scores: { [key: string]: number } = {};
    teams.forEach((team) => {
      scores[team._id] = map[team._id] ?? 0;
    });
    setTeamScores(scores);
  };

  const fetchQuestions = async (
    type: string,
    count: number = 6
  ): Promise<number> => {
    try {
      // Use competition-scoped endpoint to prevent repeats within this competition
      const response = await fetch(
        `/api/competitions/${competitionId}/questions?type=${type}&count=${count}`
      );
      const data = await response.json();
      if (data.success) {
        const questions = (data.data || []).slice(0, count);
        setCurrentQuestions(questions);
        setCurrentQuestionIndex(0);
        if (!questions.length) {
          toast({
            title: "No questions available",
            description:
              "No unused questions of this type remain for this competition.",
            variant: "destructive",
          });
          setNoQuestionsForType(type as "mcq" | "media" | "rapid_fire");
        } else {
          setNoQuestionsForType(null);
        }
        return questions.length;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch questions",
        variant: "destructive",
      });
    }
    return 0;
  };

  const startRound = async (type: "mcq" | "media" | "rapid_fire") => {
    setRoundType(type);
    const count = await fetchQuestions(type);
    const hasQuestions = count > 0;
    setIsRoundActive(hasQuestions);
    if (hasQuestions) {
      toast({
        title: "Round Started",
        description: `${type.toUpperCase()} round has begun`,
      });
    }
  };

  const resetUsage = async (type: "mcq" | "media" | "rapid_fire") => {
    try {
      const res = await fetch(`/api/competitions/${competitionId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Usage reset",
          description: `Cleared ${type.toUpperCase()} usage for this competition.`,
        });
        // If current round matches, refetch questions and update state
        if (roundType === type) {
          const count = await fetchQuestions(type);
          setIsRoundActive(count > 0);
        }
        setNoQuestionsForType(null);
      } else {
        toast({
          title: "Failed",
          description: data.error || "Could not reset usage",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to reset usage",
        variant: "destructive",
      });
    }
  };

  // Show question + answer for 15 seconds
  const revealForSeconds = (seconds: number = 15) => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(true);
    setCountdown(seconds);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const hideNow = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
    setCountdown(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Keep presenting state in sync with Fullscreen API
  useEffect(() => {
    const handler = () => {
      const isFs = !!document.fullscreenElement;
      setPresenting(isFs);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const enterPresentation = async () => {
    if (presentRef.current && !document.fullscreenElement) {
      await presentRef.current.requestFullscreen().catch(() => {});
      setPresenting(true);
    }
  };

  const exitPresentation = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      setPresenting(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      // reset per-question state
      setSelectedOption(null);
      setIsOptionCorrect(null);
      setAwardedTeamId(null);
      hideNow();
    } else {
      endRound();
    }
  };

  const endRound = () => {
    setIsRoundActive(false);
    // reset per-question state
    setSelectedOption(null);
    setIsOptionCorrect(null);
    setAwardedTeamId(null);
    toast({
      title: "Round Completed",
      description: "Round has ended. Review scores and proceed to next round.",
    });
  };

  const resetCompetitionScores = async () => {
    try {
      await fetch(`/api/competitions/${competitionId}/scores`, { method: "DELETE" });
      // Reset local team scores to 0 for current group
      if (currentGroup) {
        const zeros: Record<string, number> = {};
        currentGroup.teams.forEach((t) => (zeros[t._id] = 0));
        setTeamScores(zeros);
      } else {
        setTeamScores({});
      }
      setAwardedTeamId(null);
      setSelectedOption(null);
      setIsOptionCorrect(null);
      toast({ title: "Scores Reset", description: "All competition scores cleared." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to reset scores", variant: "destructive" });
    }
  };

  const awardPoints = (teamId: string, points: number) => {
    setTeamScores((prev) => ({
      ...prev,
      [teamId]: (prev[teamId] || 0) + points,
    }));
    toast({
      title: "Points Awarded",
      description: `${points} points awarded to team`,
    });
  };

  const advanceToNextStage = async () => {
    if (!currentGroup) return;

    // Get winning teams (top teams from current stage)
    const sortedTeams = currentGroup.teams
      .map((team) => ({ ...team, score: teamScores[team._id] || 0 }))
      .sort((a, b) => b.score - a.score);

    let winningTeams: string[] = [];
    let nextStage = "";

    if (currentGroup.stage === "group") {
      // From group stage, take top 1 team per group
      winningTeams = [sortedTeams[0]._id];
      nextStage = "semi_final";
    } else if (currentGroup.stage === "semi_final") {
      // From semi-final, take top 1 team per group
      winningTeams = [sortedTeams[0]._id];
      nextStage = "final";
    }

    try {
      const response = await fetch(
        `/api/competitions/${competitionId}/advance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: nextStage,
            winningTeams,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: `Teams advanced to ${nextStage.replace("_", " ")} stage`,
        });
        fetchCompetition();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to advance teams",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-36" />
            <div>
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-48 mt-2" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main area skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-60" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Skeleton className="h-9 w-40" />
                  <Skeleton className="h-9 w-44" />
                  <Skeleton className="h-9 w-40" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-52" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
                <div className="flex justify-between pt-4 border-t">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24 mt-2" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-8" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
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
                Current Group: {currentGroup?.name} | Round{" "}
                {currentGroup?.currentRound || 1} of{" "}
                {currentGroup?.maxRounds || 3}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isRoundActive ? (
                <div className="flex flex-wrap gap-4">
                  <Button onClick={() => startRound("mcq")}>
                    Start MCQ Round
                  </Button>
                  <Button onClick={() => startRound("media")}>
                    Start Media Round
                  </Button>
                  <Button onClick={() => startRound("rapid_fire")}>
                    Start Rapid Fire
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <Button onClick={nextQuestion} disabled={!currentQuestion}>
                    Next Question
                  </Button>
                  <Button variant="outline" onClick={endRound}>
                    End Round
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      onClick={() => revealForSeconds(15)}
                      disabled={!currentQuestion}
                    >
                      {isVisible ? `Showing (${countdown}s)` : "Show for 15s"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={hideNow}
                      disabled={!isVisible}
                    >
                      Hide Now
                    </Button>
                    {!presenting ? (
                      <Button
                        variant="secondary"
                        onClick={enterPresentation}
                        disabled={!currentQuestion}
                      >
                        Presentation Mode
                      </Button>
                    ) : (
                      <Button variant="destructive" onClick={exitPresentation}>
                        Exit Presentation
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inline no-questions message with reset confirmation */}
          {!isRoundActive && noQuestionsForType && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  No questions available
                </CardTitle>
                <CardDescription>
                  No unused questions of this type remain for this competition.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      Reset {noQuestionsForType.replace("_", " ")} usage now
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset question usage?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear the used flags for the{" "}
                        {noQuestionsForType.replace("_", " ")} round in this
                        competition so they can be selected again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => resetUsage(noQuestionsForType)}
                      >
                        Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}

          {/* Current Question */}
          {isRoundActive && currentQuestion && (
            <Card
              ref={presentRef}
              className={
                presenting
                  ? "fixed inset-0 z-50 bg-black text-white overflow-auto"
                  : ""
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className={presenting ? "text-2xl" : ""}>
                    Question {currentQuestionIndex + 1} of{" "}
                    {currentQuestions.length}
                  </span>
                  <div className="flex items-center gap-3">
                    {isVisible && (
                      <span
                        className={
                          presenting
                            ? "text-xl font-semibold"
                            : "text-sm font-semibold"
                        }
                      >
                        Time left: {countdown}s
                      </span>
                    )}
                    <Badge>{roundType.toUpperCase()}</Badge>
                  </div>
                </CardTitle>
                {presenting && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => revealForSeconds(15)}
                      disabled={!currentQuestion}
                    >
                      Show for 15s
                    </Button>
                    <Button
                      variant="outline"
                      className="text-black dark:text-white"
                      onClick={hideNow}
                      disabled={!isVisible}
                    >
                      Hide Now
                    </Button>
                    <Button onClick={nextQuestion} disabled={!currentQuestion}>
                      Next Question
                    </Button>
                    <Button
                      variant="outline"
                      className="text-black dark:text-white"
                      onClick={endRound}
                    >
                      End Round
                    </Button>
                    <Button variant="destructive" onClick={exitPresentation}>
                      Exit Presentation
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent
                className={
                  presenting ? "space-y-6 max-w-5xl mx-auto mt-10 p-6" : "space-y-4"
                }
              >
                {isVisible ? (
                  <>
                    <div
                      className={
                        presenting
                          ? "text-5xl font-semibold"
                          : "text-lg font-medium"
                      }
                    >
                      {currentQuestion.question}
                    </div>

                    {currentQuestion.mediaUrl && (
                      <div
                        className={
                          presenting
                            ? "rounded-lg p-4 bg-neutral-900"
                            : "border rounded-lg p-4"
                        }
                      >
                        {currentQuestion.mediaType === "image" && (
                          <img
                            src={currentQuestion.mediaUrl}
                            alt="Question media"
                            className={
                              presenting
                                ? "max-w-full h-auto mx-auto"
                                : "max-w-full h-auto"
                            }
                          />
                        )}
                        {currentQuestion.mediaType === "audio" && (
                          <audio controls className="w-full">
                            <source src={currentQuestion.mediaUrl} />
                          </audio>
                        )}
                        {currentQuestion.mediaType === "video" && (
                          <video
                            controls
                            className={
                              presenting
                                ? "w-full max-h-[70vh] mx-auto"
                                : "w-full max-h-96"
                            }
                          >
                            <source src={currentQuestion.mediaUrl} />
                          </video>
                        )}
                      </div>
                    )}

                    {currentQuestion.options && (
                      <div
                        className={
                          presenting
                            ? "grid grid-cols-2 gap-4 pt-5"
                            : "grid grid-cols-2 gap-2"
                        }
                      >
                        {currentQuestion.options.map((option, index) => {
                          const isSelected = selectedOption === index;
                          const correctSelected =
                            isSelected && isOptionCorrect === true;
                          const wrongSelected =
                            isSelected && isOptionCorrect === false;
                          const base = presenting
                            ? "p-5 rounded-lg cursor-pointer select-none"
                            : "p-3 border rounded-lg cursor-pointer select-none";
                          const stateCls = correctSelected
                            ? " border-2 border-green-500 ring-2 ring-green-500"
                            : wrongSelected
                            ? " border-2 border-red-500 ring-2 ring-red-500"
                            : presenting
                            ? " bg-neutral-900"
                            : "";
                          return (
                            <div
                              key={index}
                              className={`${base}${stateCls}`}
                              onClick={() =>
                                isVisible ? handleOptionClick(index) : undefined
                              }
                              role="button"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={
                                    presenting
                                      ? "font-bold text-3xl"
                                      : "font-medium"
                                  }
                                >
                                  {String.fromCharCode(65 + index)}.
                                </span>
                                <span className={presenting ? "text-3xl" : ""}>
                                  {option}
                                </span>
                                {correctSelected && (
                                  <Check
                                    className={
                                      presenting
                                        ? "text-green-400 h-7 w-7 ml-auto"
                                        : "text-green-600 h-4 w-4 ml-auto"
                                    }
                                  />
                                )}
                                {wrongSelected && (
                                  <X
                                    className={
                                      presenting
                                        ? "text-red-400 h-7 w-7 ml-auto"
                                        : "text-red-600 h-4 w-4 ml-auto"
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {roundType === "rapid_fire" && (
                      <div className="text-center">
                        <p
                          className={
                            presenting
                              ? "opacity-70 text-xl"
                              : "text-muted-foreground"
                          }
                        >
                          Admin will ask the question. Click on team that
                          answers correctly.
                        </p>
                      </div>
                    )}

                    <div
                      className={
                        presenting
                          ? "flex justify-between items-center pt-6 border-t border-neutral-800"
                          : "flex justify-between items-center pt-4 border-t"
                      }
                    >
                      <span
                        className={
                          presenting
                            ? "text-xl opacity-80"
                            : "text-sm text-muted-foreground"
                        }
                      >
                        Points: {currentQuestion.points}
                      </span>
                      {/* Intentionally not showing the answer */}
                      {selectedOption !== null && (
                        <span
                          className={
                            isOptionCorrect
                              ? presenting
                                ? "text-2xl font-semibold text-green-400"
                                : "text-sm font-medium text-green-600"
                              : presenting
                              ? "text-2xl font-semibold text-red-400"
                              : "text-sm font-medium text-red-600"
                          }
                        >
                          {isOptionCorrect ? "Correct" : "Wrong"}
                        </span>
                      )}
                    </div>

                    {presenting && currentGroup && (
                      <div className="mt-6">
                        <div className="grid grid-cols-2 gap-3">
                          {currentGroup.teams.map((team) => (
                            <Button
                              key={team._id}
                              className={`justify-between ${
                                awardedTeamId === team._id ? "opacity-70" : ""
                              }`}
                              variant={
                                awardedTeamId === team._id
                                  ? "secondary"
                                  : "default"
                              }
                              onClick={() => handleAwardTeam(team._id)}
                              disabled={
                                (roundType === "mcq" && selectedOption === null) ||
                                !!awardedTeamId
                              }
                            >
                              <span>
                                {team.name} ({team.college.code})
                              </span>
                              <span className="font-semibold">
                                {roundType === "mcq"
                                  ? isOptionCorrect
                                    ? `+${currentQuestion.points}`
                                    : "+0"
                                  : `+${currentQuestion.points}`}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className={
                      presenting
                        ? "text-center opacity-70 text-xl"
                        : "text-center text-muted-foreground"
                    }
                  >
                    Question is hidden. Click "Show for 15s" to reveal.
                  </div>
                )}
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
                  const group = competition?.groups.find(
                    (g: any) => g._id === value
                  );
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
                {currentGroup.teams.map((team) => {
                  const isThisAwarded = awardedTeamId === team._id;
                  const canAward =
                    isRoundActive &&
                    !!currentQuestion &&
                    (roundType !== "mcq" || selectedOption !== null) &&
                    !awardedTeamId;
                  return (
                    <div
                      key={team._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {team.college.code}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">
                          {teamScores[team._id] || 0}
                        </span>
                        {isRoundActive && currentQuestion && (
                          <Button
                            size="sm"
                            variant={isThisAwarded ? "secondary" : "default"}
                            disabled={!canAward}
                            onClick={() => handleAwardTeam(team._id)}
                            title={
                              roundType === "mcq" && selectedOption === null
                                ? "Select an option first"
                                : awardedTeamId
                                ? "Already awarded"
                                : ""
                            }
                          >
                            {roundType === "mcq"
                              ? isOptionCorrect
                                ? `+${currentQuestion.points}`
                                : "+0"
                              : `+${currentQuestion.points}`}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                className="w-full mb-3"
                variant="destructive"
                onClick={resetCompetitionScores}
                disabled={isRoundActive}
              >
                Reset Competition Scores
              </Button>
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
