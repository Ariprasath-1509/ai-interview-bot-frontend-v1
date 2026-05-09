import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import QuestionBankCompaniesClient from "./QuestionBankCompaniesClient";

export default function QuestionBankCompaniesPage() {
  return (
    <AppShell title="Companies" subtitle="Manage company directory manually">
      <div className="mb-4">
        <Link
          href="/admin/questionbank"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
      <QuestionBankCompaniesClient />
    </AppShell>
  );
}