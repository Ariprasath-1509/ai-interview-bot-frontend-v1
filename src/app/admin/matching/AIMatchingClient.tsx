'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, TrendingUp, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/common/Toast';

interface Client {
  id: string;
  clientName: string;
  jdRole: string;
  jdDescription: string;
  positionsVacant: number;
  marketCandidatesNeeded: number;
  benchB2bCandidatesNeeded: number;
  status: string;
  benchReviewed: boolean;
  recruitmentReviewed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CandidateMatch {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  skillSet: string;
  yoeActual: number;
  rating: string;
  candidateStatus: string;
  noOfInterviews: number;
  matchScore: number;
  matchRationale: string;
  strengths: string[];
  concerns: string[];
  lastInterviewDate: string;
  lastVerdict: string;
  avgScore: number;
}

interface MatchingResponse {
  matches: CandidateMatch[];
  totalFound: number;
  clientId: string;
  source: string;
}

export default function AIMatchingClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [matchingResults, setMatchingResults] = useState<MatchingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('BENCH_B2B');
  const [maxCandidates, setMaxCandidates] = useState(10);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recruiter/clients', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched clients data:', data); // Debug log
        setClients(data);
      } else {
        console.error('Failed to fetch clients, status:', response.status);
        toast('Failed to fetch clients', 'error');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast('Error fetching clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  const triggerMatching = async (source: string) => {
    if (!selectedClient) return;
    
    setMatchingLoading(true);
    try {
      const response = await fetch('/api/recruiter/matching/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          clientId: selectedClient.id,
          source: source,
          maxCandidates: maxCandidates
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMatchingResults(data);
        toast(`Found ${data.totalFound} matching candidates`, 'success');
      } else {
        const error = await response.json();
        toast(error.error || 'Failed to find matching candidates', 'error');
      }
    } catch (error) {
      toast('Error during candidate matching', 'error');
    } finally {
      setMatchingLoading(false);
    }
  };

  const createInterviewWithAutoFill = async (candidate: CandidateMatch) => {
    try {
      // First get auto-fill preview
      const previewResponse = await fetch(
        `/api/recruiter/interviews/auto-fill/preview?candidateId=${candidate.candidateId}&clientId=${selectedClient?.id}`,
        { credentials: 'include' }
      );

      if (previewResponse.ok) {
        const previewData = await previewResponse.json();
        
        // Navigate to interview creation with pre-filled data
        const queryParams = new URLSearchParams({
          candidateId: candidate.candidateId,
          clientId: selectedClient?.id || '',
          engineerEmail: previewData.engineerEmail || '',
          engineerName: previewData.engineerName || '',
          jdTitle: previewData.jdTitle || '',
          suggestedMode: previewData.suggestedMode || 'SCREENING',
          focusAreas: previewData.focusAreas || '',
          resumeSummary: previewData.resumeSummary || ''
        });

        router.push(`/admin/interviews/create?${queryParams.toString()}`);
      } else {
        toast('Failed to get auto-fill preview', 'error');
      }
    } catch (error) {
      toast('Error creating interview', 'error');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getRatingBadge = (rating: string) => {
    const colors = {
      ASSET: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LIABILITY: 'bg-red-100 text-red-800'
    };
    return colors[rating as keyof typeof colors] || 'bg-zinc-100 text-zinc-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            AI Candidate Matching
            {selectedClient && (
              <span className="text-blue-600"> - {selectedClient.clientName}</span>
            )}
          </h1>
          <p className="text-zinc-600 mt-2">
            {selectedClient 
              ? `Find the best candidates for ${selectedClient.jdRole} at ${selectedClient.clientName}` 
              : 'Find the best candidates for client positions using AI-powered matching'
            }
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/clients')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Button>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Client Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">No client positions available</p>
              <p className="text-sm mb-4">Create a new client position to start matching candidates</p>
              <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
                <h4 className="font-medium text-blue-900 mb-2">Quick Setup:</h4>
                <p className="text-sm text-blue-800 mb-3">
                  Sample clients should be available after running database migrations.
                </p>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                >
                  Refresh Page
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {clients.map((client) => (
                <Card 
                  key={client.id} 
                  className={`cursor-pointer transition-all border-2 ${
                    selectedClient?.id === client.id 
                      ? 'border-blue-500 bg-blue-50 shadow-lg' 
                      : 'border-zinc-200 hover:border-zinc-300 hover:shadow-md'
                  }`}
                  onClick={() => setSelectedClient(client)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-zinc-900 mb-1">
                          {client.clientName || 'Unnamed Client'}
                        </h3>
                        <h4 className="font-semibold text-lg text-blue-600 mb-2">
                          {client.jdRole || 'No Role Specified'}
                        </h4>
                        <Badge 
                          variant={client.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className={client.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {client.status}
                        </Badge>
                      </div>
                      {selectedClient?.id === client.id && (
                        <CheckCircle className="h-6 w-6 text-blue-500" />
                      )}
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-zinc-700 line-clamp-3 leading-relaxed">
                        {client.jdDescription && client.jdDescription.trim() !== '' 
                          ? client.jdDescription 
                          : 'No job description available'
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-zinc-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-zinc-900">{client.positionsVacant || 0}</div>
                        <div className="text-xs text-zinc-600">Total Positions</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {(client.benchB2bCandidatesNeeded || 0) + (client.marketCandidatesNeeded || 0)}
                        </div>
                        <div className="text-xs text-zinc-600">Candidates Needed</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-600">BENCH/B2B Candidates:</span>
                        <span className="font-semibold text-orange-600">
                          {client.benchB2bCandidatesNeeded || 0} needed
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-600">MARKET Candidates:</span>
                        <span className="font-semibold text-purple-600">
                          {client.marketCandidatesNeeded || 0} needed
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-200">
                      <div className="flex justify-between items-center text-xs text-zinc-500">
                        <span>Created: {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'Unknown'}</span>
                        <div className="flex gap-2">
                          {client.benchReviewed && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              Bench ✓
                            </Badge>
                          )}
                          {client.recruitmentReviewed && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                              Recruitment ✓
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matching Controls - Show message when no client selected */}
      {!selectedClient && clients.length > 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-zinc-300" />
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Select a Client Position</h3>
            <p className="text-zinc-600">
              Choose a client position above to start AI-powered candidate matching
            </p>
          </CardContent>
        </Card>
      )}

      {/* Matching Controls */}
      {selectedClient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              AI Matching Configuration
            </CardTitle>
            <p className="text-sm text-zinc-600 mt-1">
              Configure matching parameters for <span className="font-semibold text-blue-600">
                {selectedClient?.clientName || 'Selected Client'}
              </span> - {selectedClient?.jdRole || 'Position'}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700">Candidate Source</label>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BENCH_B2B">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        BENCH/B2B for {selectedClient?.clientName || 'Client'} ({selectedClient?.benchB2bCandidatesNeeded || 0} needed)
                      </div>
                    </SelectItem>
                    <SelectItem value="MARKET">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        MARKET for {selectedClient?.clientName || 'Client'} ({selectedClient?.marketCandidatesNeeded || 0} needed)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500">
                  {selectedSource === 'BENCH_B2B' 
                    ? `Internal bench and B2B candidates for ${selectedClient?.clientName || 'selected client'}` 
                    : `External market candidates for ${selectedClient?.clientName || 'selected client'}`
                  }
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700">Maximum Results</label>
                <Input
                  type="number"
                  value={maxCandidates}
                  onChange={(e) => setMaxCandidates(parseInt(e.target.value) || 10)}
                  min={1}
                  max={50}
                  className="w-full"
                />
                <p className="text-xs text-zinc-500">
                  AI will return top {maxCandidates} matching candidates
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={() => triggerMatching(selectedSource)}
                  disabled={matchingLoading}
                  className="w-full flex items-center justify-center gap-2 h-10"
                  size="lg"
                >
                  {matchingLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Finding Matches...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      Find AI Matches
                    </>
                  )}
                </Button>
                <p className="text-xs text-zinc-500 text-center">
                  Find best matches for {selectedClient?.clientName || 'selected client'}
                </p>
              </div>
            </div>

            {selectedClient && (
              <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-zinc-900 mb-1">
                      {selectedClient?.clientName || 'Selected Client'}
                    </h4>
                    <h5 className="font-semibold text-blue-600 mb-3">
                      {selectedClient?.jdRole || 'Position'}
                    </h5>
                    <p className="text-sm text-zinc-700 mb-4 leading-relaxed">
                      {selectedClient?.jdDescription && selectedClient.jdDescription.trim() !== '' 
                        ? selectedClient.jdDescription 
                        : 'No detailed job description available'
                      }
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="font-semibold text-zinc-900">{selectedClient.positionsVacant || 0}</div>
                        <div className="text-zinc-600">Total Positions</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="font-semibold text-orange-600">{selectedClient.benchB2bCandidatesNeeded || 0}</div>
                        <div className="text-zinc-600">BENCH/B2B</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <div className="font-semibold text-purple-600">{selectedClient.marketCandidatesNeeded || 0}</div>
                        <div className="text-zinc-600">MARKET</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <Badge variant={selectedClient.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {selectedClient.status}
                        </Badge>
                        <div className="text-zinc-600 mt-1">Status</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Matching Tips */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                AI Matching Tips
              </h5>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• AI analyzes candidate skills, experience, and interview performance</li>
                <li>• Higher match scores indicate better alignment with job requirements</li>
                <li>• Review strengths and concerns before creating interviews</li>
                <li>• Consider recent interview performance and learning trajectory</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matching Results */}
      {matchingResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>AI Matching Results</span>
                <Badge variant="outline" className="ml-2">
                  {matchingResults.totalFound} candidates found
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={matchingResults.source === 'BENCH_B2B' ? 'default' : 'secondary'}
                  className={matchingResults.source === 'BENCH_B2B' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'}
                >
                  {matchingResults.source === 'BENCH_B2B' ? 'BENCH/B2B' : 'MARKET'} Source
                </Badge>
              </div>
            </CardTitle>
            {matchingResults.totalFound > 0 && (
              <p className="text-sm text-zinc-600 mt-1">
                Candidates are ranked by AI match score based on skills, experience, and interview performance
              </p>
            )}
          </CardHeader>
          <CardContent>
            {matchingResults.totalFound === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-zinc-300" />
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">No Matching Candidates Found</h3>
                <p className="text-zinc-600 mb-4">
                  No {matchingResults.source === 'BENCH_B2B' ? 'BENCH/B2B' : 'MARKET'} candidates match the requirements for this position.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg text-left max-w-md mx-auto">
                  <h4 className="font-medium text-blue-900 mb-2">Suggestions:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Try the other candidate source ({matchingResults.source === 'BENCH_B2B' ? 'MARKET' : 'BENCH/B2B'})</li>
                    <li>• Increase the maximum results limit</li>
                    <li>• Review job requirements for flexibility</li>
                    <li>• Consider candidates with transferable skills</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {matchingResults.matches.map((candidate) => (
                <Card key={candidate.candidateId} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{candidate.candidateName}</h3>
                        <p className="text-zinc-600">{candidate.candidateEmail}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getRatingBadge(candidate.rating)}>
                            {candidate.rating}
                          </Badge>
                          <Badge variant="outline">{candidate.skillSet}</Badge>
                          <span className="text-sm text-zinc-500">
                            {candidate.yoeActual} years exp
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-2xl font-bold px-3 py-1 rounded-lg ${getScoreColor(candidate.matchScore)}`}>
                          {Math.round(candidate.matchScore * 100)}%
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Match Score</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Strengths
                        </h4>
                        <ul className="text-sm space-y-1">
                          {candidate.strengths.map((strength, idx) => (
                            <li key={idx} className="text-green-600">• {strength}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Concerns
                        </h4>
                        <ul className="text-sm space-y-1">
                          {candidate.concerns.map((concern, idx) => (
                            <li key={idx} className="text-orange-600">• {concern}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="bg-zinc-50 p-3 rounded-lg mb-4">
                      <p className="text-sm font-medium mb-1">AI Rationale:</p>
                      <p className="text-sm text-zinc-700">{candidate.matchRationale}</p>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-zinc-500">
                        <span>Interviews: {candidate.noOfInterviews}</span>
                        {candidate.lastVerdict && (
                          <span className="ml-4">Last: {candidate.lastVerdict}</span>
                        )}
                        {candidate.avgScore && (
                          <span className="ml-4">Avg Score: {candidate.avgScore.toFixed(1)}</span>
                        )}
                      </div>
                      
                      <Button 
                        onClick={() => createInterviewWithAutoFill(candidate)}
                        className="flex items-center gap-2"
                      >
                        Create Interview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}