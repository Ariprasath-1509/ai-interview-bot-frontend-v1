"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "br_tour_done";

export function useTour() {
  // Start as "seen" to avoid auto-triggering before localStorage is read
  const [hasSeen, setHasSeen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setHasSeen(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setHasSeen(true);
    }
  }, []);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setHasSeen(true);
  }, []);

  const startTour = useCallback(() => {
    setHasSeen(false);
  }, []);

  return { hasSeen, mounted, markSeen, startTour };
}
