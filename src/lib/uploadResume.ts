export interface UploadResumeResult {
  ok: boolean;
  filename?: string;
  summary?: string;
  error?: string;
}

/** Shared by the single-candidate resume widget and the bulk-import resume flow — both just
 *  need "send this file for this candidate, tell me what happened." Proxies to interview-service's
 *  /resumes/upload via the existing Next.js route, which does storage + parsing + AI summary. */
export async function uploadResumeForCandidate(candidateId: string, file: File): Promise<UploadResumeResult> {
  try {
    const formData = new FormData();
    formData.append("resume", file);

    const response = await fetch(`/api/candidates/${candidateId}/resume`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return { ok: false, error: (result?.error as string) || "Upload failed" };
    }

    return {
      ok: true,
      filename: (result?.filename as string) || file.name,
      summary: (result?.summary as string) || undefined,
    };
  } catch (error) {
    console.error("Resume upload error:", error);
    return { ok: false, error: "Upload failed" };
  }
}
