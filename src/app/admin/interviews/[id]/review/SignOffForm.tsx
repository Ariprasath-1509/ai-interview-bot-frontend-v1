"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SignOffForm({
  interviewId,
  defaultVerdict,
  defaultNote,
  signedOff,
  signOffAction,
}: {
  interviewId: string;
  defaultVerdict?: string;
  defaultNote?: string;
  signedOff: boolean;
  signOffAction: (formData: FormData) => void;
}) {
  const [verdict, setVerdict] = useState<string>(defaultVerdict || "");

  return (
    <form action={signOffAction} className="grid gap-4">
      <input type="hidden" name="interviewId" value={interviewId} />
      <input type="hidden" name="verdict" value={verdict} />

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[var(--text-primary)]">Verdict</label>
        <Select value={verdict || "NONE"} onValueChange={(val) => setVerdict(val === "NONE" ? "" : val)}>
          <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-10 font-medium focus:border-[#6D28D9]">
            <SelectValue placeholder="Select a verdict..." />
          </SelectTrigger>
          <SelectContent className="max-h-44 z-50">
            <SelectItem value="NONE" className="text-xs font-semibold text-[var(--text-secondary)]">
              Select a verdict...
            </SelectItem>
            <SelectItem value="READY" className="text-xs font-semibold">Ready</SelectItem>
            <SelectItem value="NEEDS_1_WEEK_PREP" className="text-xs font-semibold">Needs 1-week prep</SelectItem>
            <SelectItem value="NEEDS_RESKILLING" className="text-xs font-semibold">Needs reskilling</SelectItem>
            <SelectItem value="MISMATCH_WITH_JD" className="text-xs font-semibold">Mismatch with JD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[var(--text-primary)]">Note (required)</label>
        <textarea
          name="note"
          required
          defaultValue={defaultNote ?? ""}
          placeholder="Explain rationale for sign-off / override…"
          className="w-full min-h-[90px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs font-medium text-[var(--text-primary)] focus:border-[#6D28D9] focus:outline-none"
        />
      </div>

      <div className="pt-1">
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          {signedOff ? "Update sign-off" : "Sign off"}
        </button>
      </div>
    </form>
  );
}
