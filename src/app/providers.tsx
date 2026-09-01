"use client";

import { ThemeProvider } from "next-themes";
import { ToastProvider } from "@/components/common/Toast";
import { ConfirmProvider } from "@/components/common/ConfirmDialog";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AuthSessionGuard } from "@/components/AuthSessionGuard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <ToastProvider>
          <ConfirmProvider>
            <AuthSessionGuard />
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

