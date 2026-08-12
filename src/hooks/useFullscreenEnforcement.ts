"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  active: boolean;
  /** Attempt best-effort OS key capture (Windows/Meta key, Alt+Tab) via the Keyboard Lock
   *  API while in fullscreen. Chromium only; admin-configurable — pass false to fully
   *  revert to plain fullscreen with no key capture. */
  lockKeyboard?: boolean;
  onExit?: (count: number) => void;
};

export function useFullscreenEnforcement({ active, lockKeyboard = false, onExit }: Options) {
  const [exitCount, setExitCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const onExitRef = useRef(onExit);
  const requestedRef = useRef(false);
  const lockKeyboardRef = useRef(lockKeyboard);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    lockKeyboardRef.current = lockKeyboard;
  }, [lockKeyboard]);

  const requestFullscreen = useCallback(async () => {
    if (typeof document === "undefined" || document.fullscreenElement) return true;
    try {
      await document.documentElement.requestFullscreen();
      // Best-effort: Keyboard Lock API (Chromium only, requires fullscreen) can capture the
      // Windows/Meta key and Alt+Tab so they don't escape to the OS. Not supported in
      // Firefox/Safari, and Windows may still override it depending on system policy —
      // this reduces app-switching, it cannot guarantee it's blocked.
      if (lockKeyboardRef.current) {
        const nav = navigator as Navigator & { keyboard?: { lock?: (keys?: string[]) => Promise<void> } };
        if (nav.keyboard?.lock) {
          try {
            await nav.keyboard.lock(["MetaLeft", "MetaRight", "AltLeft", "AltRight", "Tab"]);
          } catch {
            /* unsupported or denied — ignore, fullscreen still applies */
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      requestedRef.current = false;
      const nav = navigator as Navigator & { keyboard?: { unlock?: () => void } };
      nav.keyboard?.unlock?.();
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => null);
      }
      return;
    }

    if (!requestedRef.current) {
      requestedRef.current = true;
      void requestFullscreen();
    }

    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs && active) {
        setExitCount((prev) => {
          const next = prev + 1;
          onExitRef.current?.(next);
          return next;
        });
      }
    };

    document.addEventListener("fullscreenchange", onChange);
    setIsFullscreen(!!document.fullscreenElement);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [active, requestFullscreen]);

  return { exitCount, isFullscreen, requestFullscreen };
}
