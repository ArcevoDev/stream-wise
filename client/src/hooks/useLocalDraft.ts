import { useEffect, useRef, useState } from "react";

/**
 * Autosave draft state to localStorage.
 *
 * Restores the saved draft on mount and writes every change to localStorage
 * (debounced). The draft is keyed per student so different accounts never
 * leak form state between sessions. Call `clear()` once the form is
 * successfully submitted so a resubmit/refresh can't re-post stale data.
 */
export function useLocalDraft<T>(key: string, initial: T, studentId?: string | null) {
  const storageKey = studentId ? `${key}:${studentId}` : key;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return initial;
      return { ...initial, ...(JSON.parse(raw) as Partial<T>) } as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        /* storage full / private mode: autosave is best-effort */
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [storageKey, value]);

  function clear(): void {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setValue(initial);
  }

  return [value, setValue, clear] as const;
}
