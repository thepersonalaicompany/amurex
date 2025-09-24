import { create } from 'zustand';

export const useUIStore = create((set) => ({
  currentTab: 'Transcript',
  setCurrentTab: (tab) => set({ currentTab: tab }),
}));
