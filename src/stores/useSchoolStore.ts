import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface School {
  _id: string;
  name: string;
  code: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
}

interface SchoolStore {
  schools: School[];
  filteredSchools: School[];
  loading: boolean;
  searchTerm: string;
  
  // Actions
  setSchools: (schools: School[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchTerm: (term: string) => void;
  addSchool: (school: School) => void;
  updateSchool: (id: string, school: Partial<School>) => void;
  removeSchool: (id: string) => void;
  fetchSchools: () => Promise<void>;
}

export const useSchoolStore = create<SchoolStore>()(
  devtools(
    (set, get) => ({
      schools: [],
      filteredSchools: [],
      loading: false,
      searchTerm: '',

      setSchools: (schools) => {
        set({ schools });
        get().setSearchTerm(get().searchTerm); // Re-apply filter
      },

      setLoading: (loading) => set({ loading }),

      setSearchTerm: (term) => {
        const { schools } = get();
        const filtered = schools.filter(school =>
          school.name.toLowerCase().includes(term.toLowerCase()) ||
          school.code.toLowerCase().includes(term.toLowerCase()) ||
          school.contactEmail.toLowerCase().includes(term.toLowerCase()) ||
          school.address.toLowerCase().includes(term.toLowerCase())
        );
        set({ searchTerm: term, filteredSchools: filtered });
      },

      addSchool: (school) => {
        const { schools } = get();
        const newSchools = [school, ...schools];
        set({ schools: newSchools });
        get().setSearchTerm(get().searchTerm); // Re-apply filter
      },

      updateSchool: (id, updatedSchool) => {
        const { schools } = get();
        const newSchools = schools.map(school =>
          school._id === id ? { ...school, ...updatedSchool } : school
        );
        set({ schools: newSchools });
        get().setSearchTerm(get().searchTerm); // Re-apply filter
      },

      removeSchool: (id) => {
        const { schools } = get();
        const newSchools = schools.filter(school => school._id !== id);
        set({ schools: newSchools });
        get().setSearchTerm(get().searchTerm); // Re-apply filter
      },

      fetchSchools: async () => {
        set({ loading: true });
        try {
          const response = await fetch('/api/schools');
          const data = await response.json();
          if (data.success) {
            get().setSchools(data.data);
          }
        } catch (error) {
          console.error('Failed to fetch schools:', error);
        } finally {
          set({ loading: false });
        }
      },
    }),
    { name: 'school-store' }
  )
);
