// src/stores/mail.store.ts
import { create } from "zustand";

interface MailState {
    refreshKey: number;
    triggerRefresh: () => void;
}

export const useMailStore = create<MailState>((set) => ({
    refreshKey: 0,

    triggerRefresh: () => set((state) => ({
        refreshKey: state.refreshKey + 1
    })),
}));