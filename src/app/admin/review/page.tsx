import { AppShell } from "@/app/components/AppShell";
import InterviewReviewClient from "./ReviewClient";

export default function InterviewReviewPage() {
  return (
    <AppShell title="Interview Review" subtitle="Filter and manage all interviews.">
      <InterviewReviewClient />
    </AppShell>
  );
}
