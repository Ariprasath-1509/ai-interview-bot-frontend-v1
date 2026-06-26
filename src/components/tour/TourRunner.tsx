"use client";

import "driver.js/dist/driver.css";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTour } from "./useTour";
import { getTourSteps } from "./tourSteps";
import type { Driver } from "driver.js";

type Props = {
  role: string;
};

/** Click all nav group toggles that are currently closed so their links exist in the DOM. */
function expandCollapsedNavGroups(): HTMLButtonElement[] {
  const opened: HTMLButtonElement[] = [];
  document
    .querySelectorAll<HTMLButtonElement>("[data-navgroup-toggle]")
    .forEach((btn) => {
      if (btn.getAttribute("data-navgroup-open") === "false") {
        btn.click();
        opened.push(btn);
      }
    });
  return opened;
}

/** Collapse groups that we force-opened for the tour. */
function collapseNavGroups(buttons: HTMLButtonElement[]) {
  buttons.forEach((btn) => btn.click());
}

export function TourRunner({ role }: Props) {
  const { hasSeen, mounted, markSeen } = useTour();
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (hasSeen) return;

    let cancelled = false;
    let forcedOpen: HTMLButtonElement[] = [];

    const timer = setTimeout(async () => {
      if (cancelled) return;

      // Expand any collapsed nav groups so their links are in the DOM
      forcedOpen = expandCollapsedNavGroups();

      // Give React one frame to re-render the newly expanded groups
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (cancelled) return;

      const { driver } = await import("driver.js");
      if (cancelled) return;

      const steps = getTourSteps(role, pathname ?? "/");

      const visibleSteps = steps.filter((step) => {
        if (!step.element) return true;
        return !!document.querySelector(step.element as string);
      });

      if (visibleSteps.length === 0) {
        markSeen();
        collapseNavGroups(forcedOpen);
        return;
      }

      const driverObj = driver({
        showProgress: true,
        animate: true,
        smoothScroll: false,
        overlayOpacity: 0.5,
        stagePadding: 6,
        stageRadius: 8,
        allowClose: true,
        popoverClass: "br-tour-popover",
        progressText: "{{current}} of {{total}}",
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Got it!",
        onDestroyStarted: () => {
          markSeen();
          collapseNavGroups(forcedOpen);
          forcedOpen = [];
          driverObj.destroy();
        },
        steps: visibleSteps,
      });

      driverRef.current = driverObj;
      driverObj.drive();
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      driverRef.current?.destroy();
      driverRef.current = null;
      collapseNavGroups(forcedOpen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, hasSeen, role, pathname]);

  return null;
}
