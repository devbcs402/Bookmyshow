import { create } from 'zustand';

const THEATRE_CONTEXT_KEY = 'theatre_portal_context';

const getInitialContext = () => {
  try {
    const raw = localStorage.getItem(THEATRE_CONTEXT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        selectedTheatreId: parsed.selectedTheatreId || null,
        selectedBranchId: parsed.selectedBranchId || null
      };
    }
  } catch (e) {
    console.error('Failed to parse cached theatre context', e);
  }
  return {
    selectedTheatreId: null,
    selectedBranchId: null
  };
};

export const useTheatreContextStore = create((set, get) => ({
  ...getInitialContext(),

  setSelectedTheatreId: (theatreId) => {
    const current = get();
    const updated = { ...current, selectedTheatreId: theatreId, selectedBranchId: null };
    localStorage.setItem(THEATRE_CONTEXT_KEY, JSON.stringify(updated));
    set(updated);
  },

  setSelectedBranchId: (branchId) => {
    const current = get();
    const updated = { ...current, selectedBranchId: branchId };
    localStorage.setItem(THEATRE_CONTEXT_KEY, JSON.stringify(updated));
    set(updated);
  },

  clearContext: () => {
    localStorage.removeItem(THEATRE_CONTEXT_KEY);
    set({ selectedTheatreId: null, selectedBranchId: null });
  }
}));

