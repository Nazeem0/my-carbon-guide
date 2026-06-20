import { useState, useEffect } from "react";

const DARK_KEY = "ecolog-dark-mode";

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DARK_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(DARK_KEY, String(dark));
    } catch {
      // ignore
    }
  }, [dark]);

  return { dark, setDark };
}
