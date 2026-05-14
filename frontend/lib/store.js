import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),

  logout: () => {
    localStorage.removeItem('user');
    set({ user: null });
  },

  checkAuth: async () => {
    try {
      const response = await api.get('/api/auth/verify');
      set({ user: response.data.user, isLoading: false });
    } catch (error) {
      set({ user: null, isLoading: false });
    }
  },
}));

export const useAnalysisStore = create((set) => ({
  analyses: [],
  currentAnalysis: null,
  targetRole: null,
  targetRolePercentage: 0,
  isLoading: false,

  setAnalyses: (analyses) => set({ analyses }),
  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  setTargetRole: (targetRole) => {
    set({ targetRole });
    localStorage.setItem('targetRole', JSON.stringify(targetRole));
  },
  setTargetRolePercentage: (percentage) => set({ targetRolePercentage: percentage }),
  setLoading: (isLoading) => set({ isLoading }),

  hydrate: () => {
    const targetRole = localStorage.getItem('targetRole');
    if (targetRole) {
      set({ targetRole: JSON.parse(targetRole) });
    }
  },
}));
