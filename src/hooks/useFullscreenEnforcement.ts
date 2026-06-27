"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  active: boolean;
  onExit?: (count: number) => void;
};

export function useFullscreenEnforcement({ active, onExit }: Options) {
  const [exitCount, setExitCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const onExitRef = useRef(onExit);
  const requestedRef = useRef(false);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const requestFullscreen = useCallback(async () => {
    if (typeof document === "undefined" || document.fullscreenElement) return true;
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      requestedRef.current = false;
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
