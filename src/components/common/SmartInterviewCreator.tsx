'use client';

import { useState, useEffect } from 'react';
import { Zap, Users, Target, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface MatchResult {
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  feedbackScore: number;
  questionRelevanceScore: number;
  matchingSummary: string;
}

interface SmartInterviewCreatorProps {
  positionId?: number;
  positionTitle?: string;
  onInterviewCreated?: (interviewId: number) => void;
}

export function SmartInterviewCreator({ positionId, positionTitle, onInterviewCreated }: SmartInterviewCreatorProps) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState<number | null>(null);

  useEffect(() => {
    if (positionId && isOpen) {
      findMatches();
    }
  }, [positionId, isOpen]);

  const findMatches = async () => {
    if (!positionId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/matching/find-matches/${positionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMatches(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to find candidate matches",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createInterviewForCandidate = async (match: MatchResult) => {
    setCreating(match.candidateId);
    try {
      const token = localStorage.getItem('token');
      
      // Get position details for auto-fill
      const positionResponse = await fetch(`/api/recruiter/positions/${positionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!positionResponse.ok) {
        throw new Error('Failed to get position details');
      }
      
      const position = await positionResponse.json();
      
      // Create interview with auto-filled data
      const interviewData = {
        engineerEmail: match.candidateEmail,
        engineerName: match.candidateName,
        jdTitle: position.title,
        jdText: position.description,
        focusAreas: position.requiredSkills.join(', '),
        resumeSummary: `Candidate matched with ${match.overallScore}% compatibility. Strong in: ${getTopSkills(match)}`,
        interviewMode: getRecommendedMode(position.experienceLevel),
        positionId: positionId
      };

      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(interviewData)
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: `Interview created for ${match.candidateName}`,
        });
        
        if (onInterviewCreated) {
          onInterviewCreated(data.id);
        }
        
        setIsOpen(false);
      } else {
        throw new Error('Failed to create interview');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create interview",
        variant: "destructive"
      });
    } finally {
      setCreating(null);
    }
  };

  const getTopSkills = (match: MatchResult): string => {
    const scores = [
      { name: 'Technical Skills', score: match.skillsScore },
      { name: 'Experience', score: match.experienceScore },
      { name: 'Past Performance', score: match.feedbackScore }
    ];
    
    return scores
      .filter(s => s.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(s => s.name)
      .join(', ') || 'Multiple areas';
  };

  const getRecommendedMode = (experienceLevel: string): string => {
    switch (experienceLevel) {
      case 'JUNIOR': return 'SCREENING';
      case 'MID': return 'L1';
      case 'SENIOR': return 'L2';
      case 'LEAD': return 'L3';
      default: return 'SCREENING';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (!positionId) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Zap className="h-4 w-4 mr-2" />
          Smart Interview Creation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            AI-Matched Candidates for {positionTitle}
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3">Finding best candidate matches...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.length > 0 ? (
              <>
                <div className="text-sm text-gray-600 mb-4">
                  Found {matches.length} potential candidates. Click "Create Interview" to auto-fill interview details.
                </div>
                {matches.map((match) => (
                  <Card key={match.candidateId} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{match.candidateName}</CardTitle>
                          <p className="text-sm text-gray-600">{match.candidateEmail}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={`text-lg px-3 py-1 ${getScoreColor(match.overallScore)}`}>
                            {match.overallScore}% Match
                          </Badge>
                          {match.overallScore >= 85 && (
                            <div className="flex items-center mt-1 text-yellow-600">
                              <Star className="h-4 w-4 mr-1 fill-current" />
                              <span className="text-xs font-medium">Top Match</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-600">Skills</div>
                          <div className={`text-xl font-bold ${getScoreColor(match.skillsScore).split(' ')[0]}`}>
                            {match.skillsScore}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-600">Experience</div>
                          <div className={`text-xl font-bold ${getScoreColor(match.experienceScore).split(' ')[0]}`}>
                            {match.experienceScore}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-600">Performance</div>
                          <div className={`text-xl font-bold ${getScoreColor(match.feedbackScore).split(' ')[0]}`}>
                            {match.feedbackScore}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-600">Relevance</div>
                          <div className={`text-xl font-bold ${getScoreColor(match.questionRelevanceScore).split(' ')[0]}`}>
                            {match.questionRelevanceScore}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700">{match.matchingSummary}</p>
                      </div>
                      
                      <Button 
                        onClick={() => createInterviewForCandidate(match)}
                        disabled={creating === match.candidateId}
                        className="w-full"
                      >
                        {creating === match.candidateId ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating Interview...
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4 mr-2" />
                            Create Interview
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
                <p className="text-gray-500">
                  No candidates currently match the requirements for this position.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}