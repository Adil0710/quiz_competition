import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type RoundType = "mcq" | "media" | "buzzer" | "rapid_fire" | "sequence" | "visual_rapid_fire";

export type QuizState = 
  | "idle"           // Round not started
  | "question_shown" // Question displayed (Q pressed)
  | "options_shown"  // Options displayed (O pressed)
  | "answer_shown"   // Answer revealed (A pressed)
  | "timer_running"  // Timer active
  | "team_selection" // Waiting for team selection (buzzer round)
  | "sequence_input" // Collecting sequence answers
  | "modal_open";    // Modal for sequence comparison

export interface Question {
  _id: string;
  question: string;
  type: RoundType;
  options?: string[];
  correctAnswer?: string | number;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'video';
  points: number;
  phase: 'league' | 'semi_final' | 'final';
  imageUrls?: string[];
}

export interface Team {
  _id: string;
  name: string;
  school: { name: string; code: string };
  totalScore: number;
}

export interface QuizStore {
  // Current state
  currentState: QuizState;
  roundType: RoundType;
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  questions: Question[];
  
  // Timer state
  timeLeft: number;
  timerDuration: number;
  isTimerActive: boolean;
  
  // Team and scoring
  teams: Team[];
  teamScores: Record<string, number>;
  selectedTeamId: string | null;
  awardedTeamId: string | null;
  
  // MCQ specific
  selectedOption: number | null;
  isOptionCorrect: boolean | null;
  showCorrectAnswer: boolean;
  
  // Buzzer specific
  buzzerPressedTeams: string[];
  currentBuzzerTeam: string | null;
  
  // Sequence specific
  sequenceAnswers: number[];
  showSequenceModal: boolean;
  sequenceRevealStep: number;
  sequenceComparison: { correct: number[], selected: number[] };
  
  // Presentation mode
  isPresenting: boolean;
  
  // Actions
  setState: (state: QuizState) => void;
  setRoundType: (type: RoundType) => void;
  setCurrentQuestion: (question: Question | null) => void;
  setQuestions: (questions: Question[]) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  
  // Timer actions
  startTimer: (duration?: number) => void;
  stopTimer: () => void;
  updateTimer: () => void;
  
  // Team actions
  setTeams: (teams: Team[]) => void;
  updateTeamScore: (teamId: string, points: number) => void;
  setTeamScore: (teamId: string, score: number) => void;
  selectTeam: (teamId: string) => void;
  awardPoints: (teamId: string) => void;
  
  // MCQ actions
  selectOption: (index: number) => void;
  toggleCorrectAnswer: () => void;
  
  // Buzzer actions
  addBuzzerPress: (teamId: string) => void;
  clearBuzzerPresses: () => void;
  selectBuzzerTeam: (teamId: string) => void;
  
  // Sequence actions
  addSequenceAnswer: (optionIndex: number) => void;
  clearSequenceAnswers: () => void;
  toggleSequenceModal: () => void;
  nextSequenceReveal: () => void;
  resetSequenceReveal: () => void;
  setSequenceComparison: (correct: number[], selected: number[]) => void;
  
  // Presentation actions
  setPresenting: (presenting: boolean) => void;
  
  // Reset actions
  resetQuestion: () => void;
  resetRound: () => void;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  // Initial state
  currentState: "idle",
  roundType: "mcq",
  currentQuestion: null,
  currentQuestionIndex: 0,
  questions: [],
  
  // Timer initial state
  timeLeft: 0,
  timerDuration: 15,
  isTimerActive: false,
  
  // Team initial state
  teams: [],
  teamScores: {},
  selectedTeamId: null,
  awardedTeamId: null,
  
  // MCQ initial state
  selectedOption: null,
  isOptionCorrect: null,
  showCorrectAnswer: false,
  
  // Buzzer initial state
  buzzerPressedTeams: [],
  currentBuzzerTeam: null,
  
  // Sequence initial state
  sequenceAnswers: [],
  showSequenceModal: false,
  sequenceRevealStep: 0,
  sequenceComparison: { correct: [], selected: [] },
  
  // Presentation initial state
  isPresenting: false,
  
  // Actions
  setState: (state) => set({ currentState: state }),
  
  setRoundType: (type) => set({ roundType: type }),
  
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  
  setQuestions: (questions) => set({ 
    questions, 
    currentQuestionIndex: 0,
    currentQuestion: questions.length > 0 ? questions[0] : null 
  }),
  
  nextQuestion: () => {
    const { questions, currentQuestionIndex } = get();
    if (currentQuestionIndex < questions.length - 1) {
      set({ 
        currentQuestionIndex: currentQuestionIndex + 1,
        currentQuestion: questions[currentQuestionIndex + 1]
      });
      get().resetQuestion();
    }
  },
  
  prevQuestion: () => {
    const { questions, currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      set({
        currentQuestionIndex: currentQuestionIndex - 1,
        currentQuestion: questions[currentQuestionIndex - 1]
      });
      get().resetQuestion();
    }
  },
  
  // Timer actions
  startTimer: (duration) => {
    const store = get();
    // If a duration is provided, start from that duration and set as new timerDuration
    if (typeof duration === "number") {
      set({
        timeLeft: duration,
        timerDuration: duration,
        isTimerActive: true,
        // Don't change currentState - keep it as options_shown
      });
      return;
    }

    // If no duration is provided, resume from remaining time if available,
    // otherwise use the last timerDuration (or 15s fallback)
    const nextTimeLeft = store.timeLeft > 0 ? store.timeLeft : (store.timerDuration || 15);
    set({
      timeLeft: nextTimeLeft,
      isTimerActive: true,
      // Don't change currentState - keep it as options_shown
    });
  },
  
  // Pause timer without resetting remaining time
  stopTimer: () => set({ isTimerActive: false }),
  
  updateTimer: () => {
    const { timeLeft, isTimerActive } = get();
    if (isTimerActive && timeLeft > 0) {
      set({ timeLeft: timeLeft - 1 });
    } else if (timeLeft <= 0) {
      set({ isTimerActive: false });
    }
  },
  
  // Team actions
  setTeams: (teams) => {
    const teamScores: Record<string, number> = {};
    teams.forEach(team => {
      teamScores[team._id] = team.totalScore || 0;
    });
    set({ teams, teamScores });
  },
  
  updateTeamScore: (teamId, points) => {
    const { teamScores } = get();
    set({
      teamScores: {
        ...teamScores,
        [teamId]: (teamScores[teamId] || 0) + points
      }
    });
  },

  setTeamScore: (teamId: string, score: number) => {
    const { teamScores } = get();
    set({
      teamScores: {
        ...teamScores,
        [teamId]: score
      }
    });
  },
  
  selectTeam: (teamId) => set({ selectedTeamId: teamId }),
  
  awardPoints: (teamId) => {
    const { currentQuestion, roundType, isOptionCorrect } = get();
    if (!currentQuestion) return;
    
    let points = 0;
    if (roundType === "mcq") {
      points = isOptionCorrect ? currentQuestion.points : 0;
    } else {
      points = currentQuestion.points;
    }
    
    get().updateTeamScore(teamId, points);
    set({ awardedTeamId: teamId });
  },
  
  // MCQ actions
  selectOption: (index) => {
    const { currentQuestion, isTimerActive } = get();
    if (!currentQuestion || !currentQuestion.options) return;
    
    const chosen = currentQuestion.options[index];
    const ans = currentQuestion.correctAnswer;
    let correct = false;
    
    if (typeof ans === "number") {
      correct = index === ans;
    } else if (typeof ans === "string") {
      correct = ans.trim().toLowerCase() === chosen.trim().toLowerCase();
    }
    
    set({ 
      selectedOption: index, 
      isOptionCorrect: correct,
      showCorrectAnswer: true, // Always show correct answer
      isTimerActive: false // Stop timer when option is selected
    });
  },
  
  toggleCorrectAnswer: () => {
    const { showCorrectAnswer } = get();
    set({ showCorrectAnswer: !showCorrectAnswer });
  },
  
  // Buzzer actions
  addBuzzerPress: (teamId) => {
    const { buzzerPressedTeams } = get();
    if (!buzzerPressedTeams.includes(teamId)) {
      set({ 
        buzzerPressedTeams: [...buzzerPressedTeams, teamId],
        currentState: "team_selection"
      });
    }
  },
  
  clearBuzzerPresses: () => set({ buzzerPressedTeams: [], currentBuzzerTeam: null }),
  
  selectBuzzerTeam: (teamId) => set({ currentBuzzerTeam: teamId }),
  
  // Sequence actions
  addSequenceAnswer: (optionIndex) => {
    const { sequenceAnswers } = get();
    set({ sequenceAnswers: [...sequenceAnswers, optionIndex] });
  },
  
  clearSequenceAnswers: () => set({ sequenceAnswers: [] }),
  
  toggleSequenceModal: () => {
    const { showSequenceModal } = get();
    set({ showSequenceModal: !showSequenceModal });
  },

  nextSequenceReveal: () => {
    const { sequenceRevealStep } = get();
    set({ sequenceRevealStep: sequenceRevealStep + 1 });
  },

  resetSequenceReveal: () => {
    set({ sequenceRevealStep: 0 });
  },

  setSequenceComparison: (correct: number[], selected: number[]) => {
    set({ sequenceComparison: { correct, selected } });
  },
  
  // Presentation actions
  setPresenting: (presenting) => set({ isPresenting: presenting }),
  
  // Reset actions
  resetQuestion: () => set({
    currentState: "idle",
    selectedOption: null,
    isOptionCorrect: null,
    showCorrectAnswer: false,
    selectedTeamId: null,
    awardedTeamId: null,
    buzzerPressedTeams: [],
    currentBuzzerTeam: null,
    sequenceAnswers: [],
    showSequenceModal: false,
    sequenceRevealStep: 0,
    sequenceComparison: { correct: [], selected: [] },
    timeLeft: 0,
    isTimerActive: false
  }),
  
  resetRound: () => {
    get().resetQuestion();
    set({
      currentQuestionIndex: 0,
      questions: [],
      currentQuestion: null
    });
  }
}));
