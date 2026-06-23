import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import QuestionBankCategoriesClient from "./QuestionBankCategoriesClient";

export default function QuestionBankCategoriesPage() {
  return (
    <AppShell title="Categories" subtitle="Manage classification categories for AI digest constraint">
      <div className="mb-4">
        <Link
          href="/admin/questionbank"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
      <QuestionBankCategoriesClient />
    </AppShell>
  );
}