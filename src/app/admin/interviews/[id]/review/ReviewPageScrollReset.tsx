"use client";

import { useEffect } from "react";

/** Keeps admin review pages anchored at the top of the app-shell scroll container. */
export function ReviewPageScrollReset() {
  useEffect(() => {
    window.scrollTo(0, 0);

    const main = document.querySelector(".app-main-scroll");
    if (main instanceof HTMLElement) {
      main.scrollTop = 0;
    }
  }, []);

  return null;
}
