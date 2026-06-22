import { useEffect, useState } from "react";

const THEME_KEY = "reimb_theme";

export function useDarkMode(): [boolean, (v: boolean) => void, boolean] {
  // Always start dark=true on SSR + initial render → no hydration mismatch.
  const [dark, setDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(THEME_KEY) : null;
    const initial = stored ? stored === "dark" : true;
    setDark(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", dark);
    if (mounted) localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark, mounted]);

  return [dark, setDark, mounted];
}

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}
