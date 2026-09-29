import { AppShell } from "@/app/components/AppShell";
import { ResumeClient } from "./ResumeClient";
import { FileText, Sparkles, ShieldCheck } from "lucide-react";

export default function ResumePage() {
  return (
    <AppShell title="My Resume" subtitle="Upload & manage your technical resume (PDF, DOC, DOCX)">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Glassmorphic Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/90 via-indigo-900/80 to-slate-900/90 p-6 text-white shadow-lg backdrop-blur-sm">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-purple-500/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md shadow-inner">
                <FileText className="h-6 w-6 text-purple-200" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-extrabold tracking-tight text-white">
                    Candidate Resume & Documents
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/30">
                    <Sparkles className="h-3 w-3 text-purple-300" />
                    AI Resume Parser
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-xs sm:text-sm leading-relaxed text-purple-100/90 font-medium">
                  Upload your updated resume to extract skills, work history, and match with prospective client job descriptions.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                Encrypted & Secure Storage
              </span>
            </div>
          </div>
        </div>

        <ResumeClient />
      </div>
    </AppShell>
  );
}
