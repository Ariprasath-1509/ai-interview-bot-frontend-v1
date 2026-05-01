'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  email: string;
  batch: string;
  source: string;
  rating: string;
  skillSet: string;
}

export default function ExistingCredentialsDownload() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/candidates', {
        credentials: 'include',
      });
      const data = await response.json();
      setCandidates(data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadAllCredentials = async () => {
    if (candidates.length === 0) return;

    setDownloading(true);
    try {
      const response = await fetch('/api/auth/candidates/existing-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          candidateIds: candidates.map(c => c.id)
        }),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all_candidate_credentials_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download credentials');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Download All Candidate Credentials
        </CardTitle>
        <CardDescription>
          Download login credentials for all candidates (passwords will show as "Password Reset Required")
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {loading ? 'Loading candidates...' : `${candidates.length} candidates available`}
          </div>
          <Button
            onClick={downloadAllCredentials}
            disabled={candidates.length === 0 || downloading || loading}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Downloading...' : `Download All Credentials (${candidates.length})`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}