import { create } from "zustand";

export type GameState = "menu" | "playing" | "paused" | "gameover";

const HIGH_SCORE_KEY = "zombie-survival-best";

function loadHighScore() {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0);
}

export const MAG_SIZE = 30;

interface GameStore {
  state: GameState;
  score: number;
  highScore: number;
  wave: number;
  health: number;
  ammo: number;
  reserve: number;
  reloading: boolean;
  kills: number;
  remaining: number;
  waveBanner: string | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  gameOver: () => void;
  reset: () => void;
}

const fresh = {
  score: 0,
  wave: 0,
  health: 100,
  ammo: MAG_SIZE,
  reserve: 150,
  reloading: false,
  kills: 0,
  remaining: 0,
  waveBanner: null as string | null,
};

export const useGameStore = create<GameStore>((set) => ({
  state: "menu",
  highScore: loadHighScore(),
  ...fresh,
  start: () => set({ state: "playing", ...fresh }),
  pause: () => set({ state: "paused" }),
  resume: () => set({ state: "playing" }),
  gameOver: () =>
    set((s) => {
      const highScore = Math.max(s.highScore, s.score);
      if (typeof window !== "undefined")
        localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
      return { state: "gameover", highScore, health: 0 };
    }),
  reset: () => set({ state: "menu", ...fresh }),
}));
