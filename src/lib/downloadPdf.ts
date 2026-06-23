export async function downloadCandidateReview(candidateId: string, candidateName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/candidates/${candidateId}/review-summary/download`, {
      credentials: 'include',
    });

    if (response.status === 404) return { success: false, error: 'Candidate not found' };
    if (response.status === 403) return { success: false, error: 'You do not have permission to download this report' };
    if (!response.ok) return { success: false, error: 'Failed to generate PDF. Please try again.' };

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${candidateName.replace(/\s+/g, '_')}_Review_Summary.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}
