"use client";

import { useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/common/Toast";
import { ConfirmProvider } from "@/components/common/ConfirmDialog";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        forcedTheme={mounted ? undefined : "light"}
      >
        <ToastProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
