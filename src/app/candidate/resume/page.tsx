import { AppShell } from "@/app/components/AppShell";
import { ResumeClient } from "./ResumeClient";

export default function ResumePage() {
  return (
    <AppShell title="My Resume" subtitle="Upload your resume (PDF, DOC, DOCX)">
      <ResumeClient />
    </AppShell>
  );
}
