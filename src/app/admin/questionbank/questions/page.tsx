import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import QuestionBankQuestionsClient from "./QuestionBankQuestionsClient";

export default function QuestionBankQuestionsPage() {
  return (
    <AppShell title="Digest Ingestion" subtitle="Feed raw interview strings into the AI engine">
      <div className="mb-4">
        <Link
          href="/admin/questionbank"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
      <QuestionBankQuestionsClient />
    </AppShell>
  );
}