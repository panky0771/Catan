import { create } from 'zustand';

type ModalType = 'trade' | 'devCard' | 'yearOfPlenty' | 'monopoly' | 'steal' | 'discard' | 'rules' | null;

interface UIState {
  activeModal: ModalType;
  showRules: boolean;
  showChat: boolean;
  diceAnimating: boolean;
  lastRoll: [number, number] | null;

  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  toggleRules: () => void;
  toggleChat: () => void;
  triggerDiceAnimation: (roll: [number, number]) => void;
  clearDiceAnimation: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  showRules: false,
  showChat: true,
  diceAnimating: false,
  lastRoll: null,

  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  toggleRules: () => set((s) => ({ showRules: !s.showRules })),
  toggleChat: () => set((s) => ({ showChat: !s.showChat })),
  triggerDiceAnimation: (roll) => set({ diceAnimating: true, lastRoll: roll }),
  clearDiceAnimation: () => set({ diceAnimating: false }),
}));
