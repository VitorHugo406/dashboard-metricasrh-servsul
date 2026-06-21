import { useEffect, useState } from "react";
import type { Config } from "./types";

const KEY = "reimb_config_v1";
const THEME_KEY = "reimb_theme";

export function loadConfig(): Config {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function saveConfig(c: Config) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(c));
}

export function useConfig(): [Config, (c: Config) => void] {
  const [c, setC] = useState<Config>(() => loadConfig());
  const update = (next: Config) => { setC(next); saveConfig(next); };
  return [c, update];
}

export function useDarkMode(): [boolean, (v: boolean) => void] {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark];
}
