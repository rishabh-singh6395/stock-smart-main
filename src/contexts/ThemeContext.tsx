import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type FontChoice = "dm" | "space";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  font: FontChoice;
  setFont: (f: FontChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "sshub_theme";
const STORAGE_FONT = "sshub_font";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch (e) {}
    // prefer dark by default
    return "dark";
  });

  const [font, setFontState] = useState<FontChoice>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_FONT) as FontChoice | null;
      if (stored === "dm" || stored === "space") return stored;
    } catch (e) {}
    return "dm";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FONT, font);
    } catch (e) {}
    const root = document.documentElement;
    // set a data attribute to allow CSS to vary vars based on font
    root.setAttribute('data-font', font);
    // also update body font-family if desired
    if (font === 'space') {
      root.style.setProperty('--body-font', "'Space Grotesk', sans-serif");
    } else {
      root.style.setProperty('--body-font', "'DM Sans', sans-serif");
    }
  }, [font]);

  const toggle = () => setThemeState(t => (t === "dark" ? "light" : "dark"));
  const setTheme = (t: Theme) => setThemeState(t);
  const setFont = (f: FontChoice) => setFontState(f);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme, font, setFont }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export default ThemeProvider;
