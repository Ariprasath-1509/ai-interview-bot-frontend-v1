"use client";

import "driver.js/dist/driver.css";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { useTour } from "./useTour";
import { getTourSteps } from "./tourSteps";
import type { Driver } from "driver.js";

type Props = {
  role: string;
};

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

function collapseNavGroups(buttons: HTMLButtonElement[]) {
  buttons.forEach((btn) => btn.click());
}

export function TourButton({ role }: Props) {
  const { mounted, markSeen } = useTour();
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);

  if (!mounted) return null;

  async function handleClick() {
    driverRef.current?.destroy();

    const forcedOpen = expandCollapsedNavGroups();

    // Give React one frame to re-render expanded groups
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const { driver } = await import("driver.js");

    const steps = getTourSteps(role, pathname ?? "/");
    const visibleSteps = steps.filter((step) => {
      if (!step.element) return true;
      return !!document.querySelector(step.element as string);
    });

    if (visibleSteps.length === 0) {
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
        driverObj.destroy();
      },
      steps: visibleSteps,
    });

    driverRef.current = driverObj;
    driverObj.drive();
  }

  return (
    <button
      onClick={handleClick}
      title="Start platform tour"
      aria-label="Start platform tour"
      className="flex items-center justify-center rounded-full w-8 h-8 text-zinc-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:text-violet-300 dark:hover:bg-violet-950/40 transition-colors duration-150"
    >
      <HelpCircle size={18} />
    </button>
  );
}
