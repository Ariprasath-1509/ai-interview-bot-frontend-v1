import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import QuestionBankEmailsClient from "./QuestionBankEmailsClient";

export default function QuestionBankEmailsPage() {
  return (
    <AppShell title="Email Notifications" subtitle="Send hand-picked questions to candidates via email">
      <div className="mb-4">
        <Link
          href="/admin/questionbank"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
      <QuestionBankEmailsClient />
    </AppShell>
  );
}