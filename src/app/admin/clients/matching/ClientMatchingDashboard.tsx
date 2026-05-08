'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, RefreshCw, Download, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { Pagination, usePagination } from '@/components/common/Pagination';

interface MatchingSummary {
  totalMatches: number;
  highlyRecommended: number;
  recommended: number;
  consider: number;
  notSuitable: number;
  lastComputedAt: string | null;
  cached: boolean;
}

interface ClientOverview {
  clientId: string;
  clientName: string;
  jdRole: string;
  benchB2bSummary: MatchingSummary | null;
  marketSummary: MatchingSummary | null;
}

interface CandidateMatch {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  skillSet: string;
  yoeActual: number;
  rating: string;
  candidateStatus: string;
  matchScore: number;
  recommendation: string;
  strengths: string[];
  concerns: string[];
  rationale: string;
  lastInterviewDate: string | null;
  lastVerdict: string | null;
}

interface ClientMatchingResult {
  clientId: string;
  clientName: string;
  jdRole: string;
  source: string;
  matches: CandidateMatch[];
  summary: {
    totalCandidatesAnalyzed: number;
    highlyRecommended: number;
    recommended: number;
    consider: number;
    notSuitable: number;
  };
  computedAt: string;
  cacheSource: string;
}

export default function ClientMatchingDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOverview | null>(null);
  const [selectedSource, setSelectedSource] = useState<'BENCH_B2B' | 'MARKET'>('BENCH_B2B');
  const [matchDetails, setMatchDetails] = useState<ClientMatchingResult | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [candidateFilter, setCandidateFilter] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('candidateId');
    } catch {
      return null;
    }
  });
  const overviewPagination = usePagination(clients, 5);
  const {
    page: overviewPage,
    totalPages: overviewTotalPages,
    paginated: paginatedClients,
    setPage: setOverviewPage,
  } = overviewPagination;

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recruiter/clients/matching/overview', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      } else {
        toast('Failed to fetch client overview', 'error');
      }
    } catch (error) {
      toast('Error fetching overview', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const t = setTimeout(fetchOverview, 0);
    return () => clearTimeout(t);
  }, [fetchOverview]);

  // Reset overview paging when dataset changes.
  useEffect(() => {
    setOverviewPage(1);
  }, [clients, setOverviewPage]);

  const fetchMatchDetails = async (clientId: string, source: 'BENCH_B2B' | 'MARKET') => {
    setDetailsLoading(true);
    try {
      const response = await fetch(
        `/api/recruiter/clients/matching/${clientId}?source=${source}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setMatchDetails(data);
      } else {
        toast('Failed to fetch match details', 'error');
      }
    } catch (error) {
      toast('Error fetching match details', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const refreshMatches = async (clientId: string, source: 'BENCH_B2B' | 'MARKET') => {
    setRefreshing(`${clientId}-${source}`);
    try {
      const response = await fetch(
        `/api/recruiter/clients/matching/${clientId}/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ source })
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setMatchDetails(data);
        toast('Matches refreshed successfully', 'success');
        fetchOverview(); // Refresh overview
      } else {
        toast('Failed to refresh matches', 'error');
      }
    } catch (error) {
      toast('Error refreshing matches', 'error');
    } finally {
      setRefreshing(null);
    }
  };

  const exportToExcel = () => {
    if (!matchDetails) return;
    
    const csvContent = [
      ['Candidate Name', 'Email', 'Skill Set', 'Experience', 'Rating', 'Match Score', 'Recommendation', 'Strengths', 'Concerns'].join(','),
      ...matchDetails.matches.map(m => [
        m.candidateName,
        m.candidateEmail,
        m.skillSet,
        m.yoeActual,
        m.rating,
        (m.matchScore * 100).toFixed(0) + '%',
        m.recommendation,
        m.strengths.join('; '),
        m.concerns.join('; ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${matchDetails.clientName}-${matchDetails.source}-matches.csv`;
    a.click();
    toast('Exported to CSV', 'success');
  };

  const handleClientClick = (client: ClientOverview, source: 'BENCH_B2B' | 'MARKET') => {
    setSelectedClient(client);
    setSelectedSource(source);
    fetchMatchDetails(client.clientId, source);
  };

  // Filter matches by candidateId if provided
  const filteredMatchDetails = matchDetails && candidateFilter ? {
    ...matchDetails,
    matches: matchDetails.matches.filter(m => m.candidateId === candidateFilter),
    summary: {
      ...matchDetails.summary,
      totalCandidatesAnalyzed: matchDetails.matches.filter(m => m.candidateId === candidateFilter).length
    }
  } : matchDetails;

  const matches = filteredMatchDetails?.matches ?? [];
  const paginationState = usePagination(matches, 5);
  const { page, totalPages, paginated, setPage } = paginationState;

  // keep pagination in sync with external state changes (new client/source)
  useEffect(() => {
    setPage(1);
  }, [matchDetails, candidateFilter, setPage]);

  const getRecommendationBadge = (rec: string) => {
    const colors = {
      HIGHLY_RECOMMENDED: 'bg-green-100 text-green-800',
      RECOMMENDED: 'bg-blue-100 text-blue-800',
      CONSIDER: 'bg-yellow-100 text-yellow-800',
      NOT_SUITABLE: 'bg-red-100 text-red-800'
    };
    return colors[rec as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRatingBadge = (rating: string) => {
    const colors = {
      ASSET: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LIABILITY: 'bg-red-100 text-red-800'
    };
    return colors[rating as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Client Matching Dashboard</h1>
            {candidateFilter && (
              <Badge className="bg-purple-100 text-purple-800">
                Filtered for specific candidate
              </Badge>
            )}
          </div>
          <p className="text-gray-600 mt-2">
            AI-powered candidate matching with intelligent caching
          </p>
        </div>
        <div className="flex gap-2">
          {candidateFilter && (
            <Button 
              onClick={() => {
                setCandidateFilter(null);
                window.history.pushState({}, '', '/admin/clients/matching');
                fetchOverview();
              }} 
              variant="outline" 
              size="sm"
            >
              Clear Filter
            </Button>
          )}
          <Button onClick={fetchOverview} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Client Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {paginatedClients.map((client) => (
          <Card key={client.clientId} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold">{client.clientName}</div>
                  <div className="text-sm text-gray-600 font-normal">{client.jdRole}</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* BENCH/B2B Summary */}
              {client.benchB2bSummary && (
                <div 
                  className="p-4 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                  onClick={() => handleClientClick(client, 'BENCH_B2B')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="font-semibold text-gray-900">BENCH/B2B</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {client.benchB2bSummary.highlyRecommended}
                      </div>
                      <div className="text-xs text-gray-600">Highly Rec.</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {client.benchB2bSummary.recommended}
                      </div>
                      <div className="text-xs text-gray-600">Recommended</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {client.benchB2bSummary.consider}
                      </div>
                      <div className="text-xs text-gray-600">Consider</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {client.benchB2bSummary.totalMatches}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                  </div>
                  
                  {client.benchB2bSummary.lastComputedAt && (
                    <div className="text-xs text-gray-500 text-center">
                      Last updated: {new Date(client.benchB2bSummary.lastComputedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* MARKET Summary */}
              {client.marketSummary && (
                <div 
                  className="p-4 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => handleClientClick(client, 'MARKET')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="font-semibold text-gray-900">MARKET</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {client.marketSummary.highlyRecommended}
                      </div>
                      <div className="text-xs text-gray-600">Highly Rec.</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {client.marketSummary.recommended}
                      </div>
                      <div className="text-xs text-gray-600">Recommended</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {client.marketSummary.consider}
                      </div>
                      <div className="text-xs text-gray-600">Consider</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {client.marketSummary.totalMatches}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                  </div>
                  
                  {client.marketSummary.lastComputedAt && (
                    <div className="text-xs text-gray-500 text-center">
                      Last updated: {new Date(client.marketSummary.lastComputedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Pagination
        page={overviewPage}
        totalPages={overviewTotalPages}
        onPageChange={setOverviewPage}
      />

      {/* Match Details Panel */}
      {selectedClient && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {selectedClient.clientName} - {selectedClient.jdRole}
                <Badge className={selectedSource === 'BENCH_B2B' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'}>
                  {selectedSource === 'BENCH_B2B' ? 'BENCH/B2B' : 'MARKET'}
                </Badge>
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={() => refreshMatches(selectedClient.clientId, selectedSource)}
                  disabled={refreshing === `${selectedClient.clientId}-${selectedSource}`}
                  variant="outline"
                  size="sm"
                >
                  {refreshing === `${selectedClient.clientId}-${selectedSource}` ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
                <Button
                  onClick={exportToExcel}
                  disabled={!matchDetails}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
            {matchDetails && (
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                <span>Computed: {new Date(matchDetails.computedAt).toLocaleString()}</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {detailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredMatchDetails ? (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card className="bg-green-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {filteredMatchDetails.summary.highlyRecommended}
                      </div>
                      <div className="text-sm text-gray-600">Highly Recommended</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {filteredMatchDetails.summary.recommended}
                      </div>
                      <div className="text-sm text-gray-600">Recommended</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-yellow-600">
                        {filteredMatchDetails.summary.consider}
                      </div>
                      <div className="text-sm text-gray-600">Consider</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold text-gray-600">
                        {filteredMatchDetails.summary.totalCandidatesAnalyzed}
                      </div>
                      <div className="text-sm text-gray-600">Total Analyzed</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Candidate Table */}
                <div className="space-y-3">
                  {paginated.map((candidate) => (
                    <Card key={candidate.candidateId} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{candidate.candidateName}</h3>
                              <Badge className={getRecommendationBadge(candidate.recommendation)}>
                                {candidate.recommendation?.replace(/_/g, ' ') || 'N/A'}
                              </Badge>
                              <Badge className={getRatingBadge(candidate.rating)}>
                                {candidate.rating}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 space-x-4">
                              <span>{candidate.candidateEmail}</span>
                              <span>•</span>
                              <span>{candidate.skillSet}</span>
                              <span>•</span>
                              <span>{candidate.yoeActual} years exp</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">
                              {Math.round(candidate.matchScore * 100)}%
                            </div>
                            <div className="text-xs text-gray-500">Match Score</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <h4 className="font-medium text-green-700 mb-1 flex items-center gap-1 text-sm">
                              <CheckCircle className="h-4 w-4" />
                              Strengths
                            </h4>
                            <ul className="text-sm space-y-1">
                              {candidate.strengths.map((s, idx) => (
                                <li key={idx} className="text-green-600">• {s}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium text-orange-700 mb-1 flex items-center gap-1 text-sm">
                              <AlertCircle className="h-4 w-4" />
                              Concerns
                            </h4>
                            <ul className="text-sm space-y-1">
                              {candidate.concerns.map((c, idx) => (
                                <li key={idx} className="text-orange-600">• {c}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg text-sm">
                          <span className="font-medium">Rationale: </span>
                          <span className="text-gray-700">{candidate.rationale}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Select a client and source to view matching details</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
