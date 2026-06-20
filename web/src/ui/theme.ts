const KEY = "cruscotto-theme";
export type Theme = "light" | "dark";

export function getTheme(): Theme {
  return (document.documentElement.getAttribute("data-theme") as Theme) || "light";
}

export function setTheme(t: Theme): void {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* storage non disponibile */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
