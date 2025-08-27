import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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
  totalSchools: number;
  totalTeams: number;
  totalQuestions: number;
  activeCompetitions: number;
}

interface CompetitionStore {
  competitions: Competition[];
  stats: Stats;
  loading: boolean;
  
  // Actions
  setCompetitions: (competitions: Competition[]) => void;
  setStats: (stats: Stats) => void;
  setLoading: (loading: boolean) => void;
  addCompetition: (competition: Competition) => void;
  updateCompetition: (id: string, competition: Partial<Competition>) => void;
  removeCompetition: (id: string) => void;
  fetchDashboardData: () => Promise<void>;
}

export const useCompetitionStore = create<CompetitionStore>()(
  devtools(
    (set, get) => ({
      competitions: [],
      stats: {
        totalSchools: 0,
        totalTeams: 0,
        totalQuestions: 0,
        activeCompetitions: 0
      },
      loading: false,

      setCompetitions: (competitions) => set({ competitions }),
      setStats: (stats) => set({ stats }),
      setLoading: (loading) => set({ loading }),

      addCompetition: (competition) => {
        const { competitions } = get();
        set({ competitions: [competition, ...competitions] });
      },

      updateCompetition: (id, updatedCompetition) => {
        const { competitions } = get();
        const newCompetitions = competitions.map(comp =>
          comp._id === id ? { ...comp, ...updatedCompetition } : comp
        );
        set({ competitions: newCompetitions });
      },

      removeCompetition: (id) => {
        const { competitions } = get();
        const newCompetitions = competitions.filter(comp => comp._id !== id);
        set({ competitions: newCompetitions });
      },

      fetchDashboardData: async () => {
        set({ loading: true });
        try {
          const [competitionsRes, schoolsRes, teamsRes, questionsRes] = await Promise.all([
            fetch('/api/competitions'),
            fetch('/api/schools'),
            fetch('/api/teams'),
            fetch('/api/questions')
          ]);

          const [competitionsData, schoolsData, teamsData, questionsData] = await Promise.all([
            competitionsRes.json(),
            schoolsRes.json(),
            teamsRes.json(),
            questionsRes.json()
          ]);

          if (competitionsData.success) {
            get().setCompetitions(competitionsData.data);
          }
          
          get().setStats({
            totalSchools: schoolsData.success ? schoolsData.data.length : 0,
            totalTeams: teamsData.success ? teamsData.data.length : 0,
            totalQuestions: questionsData.success ? questionsData.data.length : 0,
            activeCompetitions: competitionsData.success ? 
              competitionsData.data.filter((c: Competition) => c.status === 'ongoing').length : 0
          });
        } catch (error) {
          console.error('Failed to fetch dashboard data:', error);
        } finally {
          set({ loading: false });
        }
      },
    }),
    { name: 'competition-store' }
  )
);
