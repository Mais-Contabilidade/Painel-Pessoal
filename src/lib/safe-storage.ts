import { createJSONStorage } from "zustand/middleware";

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const safeStorage = createJSONStorage(() =>
  typeof window === "undefined" ? noopStorage : window.localStorage
);
