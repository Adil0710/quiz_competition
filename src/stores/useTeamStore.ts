import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface School {
  _id: string;
  name: string;
  code: string;
}

interface Team {
  _id: string;
  name: string;
  school: School;
  members: Array<{
    name: string;
    email: string;
    phone: string;
    role: 'captain' | 'member';
  }>;
  totalScore?: number;
  currentStage?: string;
  createdAt: string;
}

interface TeamStore {
  teams: Team[];
  filteredTeams: Team[];
  schools: School[];
  loading: boolean;
  searchTerm: string;
  
  // Actions
  setTeams: (teams: Team[]) => void;
  setSchools: (schools: School[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchTerm: (term: string) => void;
  addTeam: (team: Team) => void;
  updateTeam: (id: string, team: Partial<Team>) => void;
  removeTeam: (id: string) => void;
  fetchTeams: () => Promise<void>;
  fetchSchools: () => Promise<void>;
}

export const useTeamStore = create<TeamStore>()(
  devtools(
    (set, get) => ({
      teams: [],
      filteredTeams: [],
      schools: [],
      loading: false,
      searchTerm: '',

      setTeams: (teams) => {
        set({ teams });
        get().setSearchTerm(get().searchTerm); // Re-apply filter
      },

      setSchools: (schools) => set({ schools }),

      setLoading: (loading) => set({ loading }),

      setSearchTerm: (term) => {
        const { teams } = get();
        const filtered = teams.filter(team => {
          const schoolName = team.school?.name?.toLowerCase() || '';
          const schoolCode = team.school?.code?.toLowerCase() || '';
          return (
            team.name.toLowerCase().includes(term.toLowerCase()) ||
            schoolName.includes(term.toLowerCase()) ||
            schoolCode.includes(term.toLowerCase())
          );
        });
        set({ searchTerm: term, filteredTeams: filtered });
      },

      addTeam: (team) => {
        const { teams } = get();
        const newTeams = [team, ...teams];
        set({ teams: newTeams });
        get().setSearchTerm(get().searchTerm); // Re-apply filter
      },

      updateTeam: (id, updatedTeam) => {
        const { teams } = get();
        const newTeams = teams.map(team =>
          team._id === id ? { ...team, ...updatedTeam } : team
        );
        set({ teams: newTeams });
        get().setSearchTerm(get().searchTerm); // Re-apply filter
      },

      removeTeam: (id) => {
        const { teams } = get();
        const newTeams = teams.filter(team => team._id !== id);
        set({ teams: newTeams });
        get().setSearchTerm(get().searchTerm); // Re-apply filter
      },

      fetchTeams: async () => {
        set({ loading: true });
        try {
          const response = await fetch('/api/teams');
          const data = await response.json();
          if (data.success) {
            get().setTeams(data.data);
          }
        } catch (error) {
          console.error('Failed to fetch teams:', error);
        } finally {
          set({ loading: false });
        }
      },

      fetchSchools: async () => {
        try {
          const response = await fetch('/api/schools');
          const data = await response.json();
          if (data.success) {
            get().setSchools(data.data);
          }
        } catch (error) {
          console.error('Failed to fetch schools:', error);
        }
      },
    }),
    { name: 'team-store' }
  )
);
