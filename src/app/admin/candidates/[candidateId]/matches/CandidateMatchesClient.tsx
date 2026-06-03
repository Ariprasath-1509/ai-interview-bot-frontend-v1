'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, RefreshCw, Users, TrendingUp, AlertCircle, CheckCircle, Building2, Briefcase, Clock } from 'lucide-react';
import { useToast } from '@/components/common/Toast';

interface CandidateClientMatch {
  clientId: string;
  clientName: string;
  jdRole: string;
  jdDescription: string;
  matchScore: number;
  recommendation: string;
  strengths: string[];
  concerns: string[];
  matchRationale: string;
  lastComputedAt: string;
  cacheSource: string;
  benchB2bCandidatesNeeded: number;
  marketCandidatesNeeded: number;
  clientStatus: string;
}

interface CandidateMatchingResult {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  skillSet: string;
  yoeActual: number;
  rating: string;
  candidateStatus: string;
  systemInterviewCount: number;
  matches: CandidateClientMatch[];
  totalClientsAnalyzed: number;
  matchingClientsCount: number;
  averageMatchScore: number;
  computedAt: string;
  cacheSource: string;
}

export default function CandidateMatchesClient({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [matchingResult, setMatchingResult] = useState<CandidateMatchingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'date'>('score');
  const [filterBy, setFilterBy] = useState<'all' | 'highly_recommended' | 'recommended' | 'consider' | 'not_suitable'>('all');

  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!candidateId || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchCandidateMatches();
  }, [candidateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCandidateMatches = useCallback(async (forceRefresh = false) => {
    if (!candidateId) return;
    
    try {
      setLoading(!forceRefresh);
      setRefreshing(forceRefresh);

      const url = forceRefresh 
        ? `/api/candidates/${candidateId}/client-matches`
        : `/api/candidates/${candidateId}/client-matches?forceRefresh=false`;

      const method = forceRefresh ? 'POST' : 'GET';

      const response = await fetch(url, {
        method,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setMatchingResult(data);
        if (forceRefresh) {
          toast('Matches refreshed successfully', 'success');
        }
      } else {
        const error = await response.json();
        toast(error.error || 'Failed to fetch candidate matches', 'error');
      }
    } catch (error) {
      toast('Error fetching candidate matches', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [candidateId, toast]);

  const createInterviewWithAutoFill = async (match: CandidateClientMatch) => {
    try {
      // Navigate to interview creation with pre-filled data
      const queryParams = new URLSearchParams({
        candidateId: candidateId,
        clientId: match.clientId,
        engineerEmail: matchingResult?.candidateEmail || '',
        engineerName: matchingResult?.candidateName || '',
        jdTitle: match.jdRole,
        suggestedMode: 'SCREENING', // Default mode
        focusAreas: '',
        resumeSummary: ''
      });

      router.push(`/admin/interviews/create?${queryParams.toString()}`);
    } catch (error) {
      toast('Error creating interview', 'error');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRecommendationBadge = (recommendation: string) => {
    const colors = {
      HIGHLY_RECOMMENDED: 'bg-green-100 text-green-800 border-green-300',
      RECOMMENDED: 'bg-blue-100 text-blue-800 border-blue-300',
      CONSIDER: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      NOT_SUITABLE: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[recommendation as keyof typeof colors] || 'bg-zinc-100 text-zinc-800';
  };

  const getRatingBadge = (rating: string) => {
    const colors = {
      ASSET: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LIABILITY: 'bg-red-100 text-red-800'
    };
    return colors[rating as keyof typeof colors] || 'bg-zinc-100 text-zinc-800';
  };

  const filteredAndSortedMatches = matchingResult?.matches
    ?.filter(match => {
      const matchesSearch = searchTerm === '' || 
                           match.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           match.jdRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           match.jdDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           match.matchRationale.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterBy === 'all' || 
                           match.recommendation.toLowerCase() === filterBy.toLowerCase();
      
      return matchesSearch && matchesFilter;
    })
    ?.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.matchScore - a.matchScore;
        case 'name':
          return a.clientName.localeCompare(b.clientName);
        case 'date':
          return new Date(b.lastComputedAt).getTime() - new Date(a.lastComputedAt).getTime();
        default:
          return 0;
      }
    }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!matchingResult) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-zinc-300" />
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">No Matching Data Available</h3>
          <p className="text-zinc-600 mb-4">Unable to load candidate matching information.</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/candidates')}
              className="flex items-center gap-2 hover:bg-blue-50 border-blue-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Candidates
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Client Matches
              </h1>
              <p className="text-zinc-600 dark:text-zinc-300 mt-1">
                AI-powered client matching for <span className="font-semibold text-blue-600">{matchingResult.candidateName}</span>
              </p>
            </div>
          </div>
          <Button
            onClick={() => fetchCandidateMatches(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Matches
          </Button>
        </div>

        {/* Candidate Summary Card */}
        <Card className="shadow-xl border-0 bg-gradient-to-r from-white to-blue-50 dark:from-slate-800 dark:to-slate-700">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{matchingResult.candidateName}</h2>
                  <p className="text-zinc-600 dark:text-zinc-300 text-lg">{matchingResult.candidateEmail}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <Badge className={`${getRatingBadge(matchingResult.rating)} px-3 py-1 text-sm font-semibold`}>
                      {matchingResult.rating}
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 text-sm font-semibold border-blue-200 text-blue-700">
                      {matchingResult.skillSet}
                    </Badge>
                    <span className="text-sm text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 px-3 py-1 rounded-full">
                      {matchingResult.yoeActual} years exp • {matchingResult.systemInterviewCount} interviews
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-center lg:text-right">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">
                      {matchingResult.matchingClientsCount}
                    </div>
                    <p className="text-sm text-zinc-500 font-medium">Matching Clients</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-600">
                      {Math.round(matchingResult.averageMatchScore * 100)}%
                    </div>
                    <p className="text-sm text-zinc-500 font-medium">Avg Match Score</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card className="card border-0 shadow-sm bg-gradient-to-r from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              🔍 Search & Filter Matches
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Search Bar */}
            <div className="mb-6">
              <Input
                placeholder="🔍 Search by client name, role, description, or AI analysis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 text-base border-zinc-200 focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-800"
              />
              {searchTerm && (
                <p className="text-sm text-zinc-500 mt-2">
                  Searching in: client names, job roles, descriptions, and AI analysis
                </p>
              )}
            </div>
            
            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Sort results
                </label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-full h-11 border-zinc-200 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Select sort option">
                      {sortBy === 'score' && 'Match score (high to low)'}
                      {sortBy === 'name' && 'Client name (A to Z)'}
                      {sortBy === 'date' && 'Last updated (recent first)'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Match score (high to low)</SelectItem>
                    <SelectItem value="name">Client name (A to Z)</SelectItem>
                    <SelectItem value="date">Last updated (recent first)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  🎯 Filter by Recommendation
                </label>
                <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                  <SelectTrigger className="w-full h-11 border-zinc-200 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Select filter option">
                      {filterBy === 'all' && '🎯 All Recommendations'}
                      {filterBy === 'highly_recommended' && '⭐ Highly Recommended'}
                      {filterBy === 'recommended' && '👍 Recommended'}
                      {filterBy === 'consider' && '🤔 Consider'}
                      {filterBy === 'not_suitable' && 'Not suitable'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🎯 All Recommendations</SelectItem>
                    <SelectItem value="highly_recommended">⭐ Highly Recommended</SelectItem>
                    <SelectItem value="recommended">👍 Recommended</SelectItem>
                    <SelectItem value="consider">🤔 Consider</SelectItem>
                    <SelectItem value="not_suitable">Not suitable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Results Summary */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-600">
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full font-medium">
                  <span className="font-semibold text-blue-700 dark:text-blue-300">{matchingResult.totalClientsAnalyzed}</span> total clients analyzed
                </span>
                <span className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full font-medium">
                  🎯 <span className="font-semibold text-green-700 dark:text-green-300">{filteredAndSortedMatches.length}</span> matches shown
                </span>
                <span className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-full font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-purple-700 dark:text-purple-300">
                    {matchingResult.cacheSource === 'cached' ? '💾 Cached' : '🤖 Fresh AI'}
                  </span>
                </span>
              </div>
              
              {(searchTerm || filterBy !== 'all') && (
                <Button 
                  onClick={() => { setSearchTerm(''); setFilterBy('all'); }}
                  variant="outline"
                  size="sm"
                  className="border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  🔄 Clear All Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Matches List */}
        {filteredAndSortedMatches.length === 0 ? (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-16">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
                <Building2 className="h-12 w-12 text-zinc-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">No Matching Clients Found</h3>
              <p className="text-zinc-600 dark:text-zinc-300 mb-6 max-w-md mx-auto">
                {searchTerm || filterBy !== 'all' 
                  ? 'Try adjusting your search or filter criteria to find more matches.' 
                  : 'This candidate doesn\'t match any active client requirements at the moment.'}
              </p>
              {(searchTerm || filterBy !== 'all') && (
                <Button 
                  onClick={() => { setSearchTerm(''); setFilterBy('all'); }}
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredAndSortedMatches.map((match, index) => (
              <Card key={match.clientId} className={`shadow-lg border-0 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                match.recommendation === 'HIGHLY_RECOMMENDED' ? 'ring-2 ring-green-200 bg-gradient-to-r from-green-50 to-white' :
                match.recommendation === 'RECOMMENDED' ? 'ring-2 ring-blue-200 bg-gradient-to-r from-blue-50 to-white' :
                'bg-white'
              }`}>
                <CardContent className="p-8">
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{match.clientName}</h3>
                        <Badge className={`${getRecommendationBadge(match.recommendation)} px-3 py-1 text-sm font-bold border-2`}>
                          {match.recommendation === 'HIGHLY_RECOMMENDED' ? '⭐ HIGHLY RECOMMENDED' :
                           match.recommendation === 'RECOMMENDED' ? '👍 RECOMMENDED' :
                           match.recommendation === 'CONSIDER' ? '🤔 CONSIDER' :
                           match.recommendation}
                        </Badge>
                        <Badge variant="outline" className={`px-3 py-1 text-sm font-semibold ${
                          match.clientStatus === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-zinc-50 text-zinc-700'
                        }`}>
                          {match.clientStatus === 'ACTIVE' ? 'Active' : match.clientStatus}
                        </Badge>
                      </div>
                      <h4 className="text-lg font-semibold text-blue-600 mb-3">{match.jdRole}</h4>
                      <p className="text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed line-clamp-3">
                        {match.jdDescription}
                      </p>
                    </div>
                    <div className="text-center lg:text-right">
                      <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl border-4 text-2xl font-bold shadow-lg ${
                        getScoreColor(match.matchScore)
                      }`}>
                        {Math.round(match.matchScore * 100)}%
                      </div>
                      <p className="text-sm text-zinc-500 font-medium mt-2">Match Score</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                      <h5 className="font-bold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Key Strengths
                      </h5>
                      <ul className="space-y-2">
                        {match.strengths.slice(0, 3).map((strength, idx) => (
                          <li key={idx} className="text-green-700 dark:text-green-300 flex items-start gap-2 text-sm">
                            <span className="text-green-500 mt-1 font-bold">✓</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                        {match.strengths.length > 3 && (
                          <li className="text-sm text-green-600 dark:text-green-400 font-medium">
                            +{match.strengths.length - 3} more strengths
                          </li>
                        )}
                      </ul>
                    </div>
                    
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl">
                      <h5 className="font-bold text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Areas of Concern
                      </h5>
                      <ul className="space-y-2">
                        {match.concerns.slice(0, 3).map((concern, idx) => (
                          <li key={idx} className="text-orange-700 dark:text-orange-300 flex items-start gap-2 text-sm">
                            <span className="mt-1 text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">Note</span>
                            <span>{concern}</span>
                          </li>
                        ))}
                        {match.concerns.length > 3 && (
                          <li className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                            +{match.concerns.length - 3} more concerns
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-xl mb-6">
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                      🤖 AI Analysis:
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{match.matchRationale}</p>
                  </div>

                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                      <span className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                        <Briefcase className="h-4 w-4" />
                        <span className="font-semibold">{match.benchB2bCandidatesNeeded}</span> BENCH/B2B needed
                      </span>
                      <span className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full">
                        <Users className="h-4 w-4" />
                        <span className="font-semibold">{match.marketCandidatesNeeded}</span> MARKET needed
                      </span>
                      <span className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-700 px-3 py-1 rounded-full">
                        <Clock className="h-4 w-4" />
                        {new Date(match.lastComputedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/clients/${match.clientId}`)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        View client
                      </Button>
                      <Button 
                        onClick={() => createInterviewWithAutoFill(match)}
                        className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg"
                      >
                        <Briefcase className="h-4 w-4 mr-2" />
                        Create Interview
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}