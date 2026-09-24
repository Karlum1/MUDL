import { bangkokHour } from "@/lib/day";

export const THEME_KEY = "wm-theme-v2";
export type ThemePref = "auto" | "day" | "night";
export type ThemeMode = "day" | "night";

export function themeFromClock(now = new Date()): ThemeMode {
  const hour = bangkokHour(now);
  return hour >= 6 && hour < 18 ? "day" : "night";
}

export function resolveTheme(pref: ThemePref, now = new Date()): ThemeMode {
  return pref === "auto" ? themeFromClock(now) : pref;
}

function isPref(value: string | null): value is ThemePref {
  return value === "auto" || value === "day" || value === "night";
}

export const THEME_BOOT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");if(p!=="auto"&&p!=="day"&&p!=="night")p="auto";var t=p;if(p==="auto"){var h=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Bangkok",hour:"2-digit",hour12:false}).formatToParts(new Date()).find(function(x){return x.type==="hour";}).value);if(h===24)h=0;t=(h>=6&&h<18)?"day":"night";}document.documentElement.setAttribute("data-theme",t);document.documentElement.setAttribute("data-theme-pref",p);}catch(e){document.documentElement.setAttribute("data-theme","night");document.documentElement.setAttribute("data-theme-pref","auto");}})();`;

export function applyPref(pref: ThemePref) {
  const theme = resolveTheme(pref);
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-theme-pref", pref);
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* quota */
  }
  return theme;
}

export function readPref(): ThemePref {
  const attr = document.documentElement.getAttribute("data-theme-pref");
  if (isPref(attr)) return attr;
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (isPref(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function readTheme(): ThemeMode {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "day" || attr === "night") return attr;
  return resolveTheme(readPref());
}
