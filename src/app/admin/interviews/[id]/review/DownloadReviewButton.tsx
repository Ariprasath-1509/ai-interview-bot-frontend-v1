'use client';

import { useState } from 'react';
import { downloadCandidateReview } from '@/lib/downloadPdf';

export function DownloadReviewButton({ candidateId, candidateName }: { candidateId: string; candidateName: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const result = await downloadCandidateReview(candidateId, candidateName);
      if (!result.success) alert(result.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1 text-sm underline disabled:opacity-50"
      title="Download last 5 interviews as PDF"
    >
      {loading ? 'Generating…' : '📄 Download PDF'}
    </button>
  );
}
