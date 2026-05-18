import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),

  logout: async () => {
    try {
      await fetch('http://localhost:5003/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {}
    localStorage.removeItem('user');
    localStorage.removeItem('targetRole');
    set({ user: null, isLoading: false });
  },

  checkAuth: () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        set({ user: JSON.parse(savedUser), isLoading: false });
        return;
      }
      set({ user: null, isLoading: false });
    } catch (error) {
      localStorage.removeItem('user');
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
    try {
      const targetRole = localStorage.getItem('targetRole');
      if (targetRole) {
        set({ targetRole: JSON.parse(targetRole) });
      }
    } catch (e) {}
  },
}));