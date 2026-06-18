'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, User, Briefcase, Clock, FileText, Upload, AlertTriangle, Search, X, BookOpen, CheckSquare, Square, Plus, Edit2, Trash2, List } from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { ResumeUploadWidget } from '@/components/resume/ResumeUploadWidget';
import { AutoFillIndicator, FieldAutoFillIndicator } from '@/components/resume/AutoFillIndicator';

interface InterviewFormData {
  engineerEmail: string;
  engineerName: string;
  jdTitle: string;
  jdText: string;
  focusAreas: string;
  resumeSummary: string;
  interviewMode: string;
  customDurationMinutes: number | null;
  candidateId?: string;
  clientId?: string;
  selectedQuestionIds?: string;
}

interface BankQuestion {
  id: string;
  text: string;
  category: string;
  relevancyLabel: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  resumeSummary?: string;
  skillSet?: string;
  yoeActual?: number;
}

interface Client {
  id: string;
  clientName: string;
  jdRole: string;
  jdText: string;
  focusAreas?: string;
  matchScore?: number;
  matchLabel?: 'STRONG' | 'GOOD' | 'PARTIAL' | 'AVAILABLE';
  matchReasons?: string[];
  recommendation?: string;
}

const INTERVIEW_MODES = [
  { value: 'SCREENING', label: 'SCREENING (5q, 15min)', duration: 15 },
  { value: 'L1', label: 'L1 (7q, 20min)', duration: 20 },
  { value: 'L2', label: 'L2 (8q, 25min)', duration: 25 },
  { value: 'L3', label: 'L3 (10q, 30min)', duration: 30 },
  { value: 'L4', label: 'L4 (10q, 30min)', duration: 30 }
];

interface CreateInterviewClientProps {
  candidateId?: string;
  clientId?: string;
  searchParams: { [key: string]: string | string[] | undefined };
}

export function CreateInterviewClient({ candidateId, clientId, searchParams }: CreateInterviewClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [autoFillApplied, setAutoFillApplied] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState<string[]>([]);
  const [manuallyEdited, setManuallyEdited] = useState<Set<string>>(new Set());
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [autoFillConfidence, setAutoFillConfidence] = useState<'high' | 'medium' | 'low'>('high');
  
  // Candidate search state
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateResults, setCandidateResults] = useState<Candidate[]>([]);
  const [showCandidateResults, setShowCandidateResults] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  
  // Client search state
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchingClients, setSearchingClients] = useState(false);
  const [clientsMessage, setClientsMessage] = useState<string>('');

  // Question bank selection state
  const [useQuestionBank, setUseQuestionBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<BankQuestion[]>([]);
  const bankSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Manual custom questions state
  const [useManualQuestions, setUseManualQuestions] = useState(false);
  const [manualQuestions, setManualQuestions] = useState<string[]>([]);
  const [quickPasteText, setQuickPasteText] = useState('');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  
  const [formData, setFormData] = useState<InterviewFormData>({
    engineerEmail: '',
    engineerName: '',
    jdTitle: '',
    jdText: '',
    focusAreas: '',
    resumeSummary: '',
    interviewMode: 'SCREENING',
    customDurationMinutes: null,
    candidateId,
    clientId
  });

  // Fetch all clients for interview creation
  const fetchAllClientsForInterview = async () => {
    setSearchingClients(true);
    try {
      const response = await fetch('/api/recruiter/clients/for-interview', {
        credentials: 'include'
      });

      if (response.ok) {
        const clientsData = await response.json();
        
        const hasMatchingClients = clientsData.hasMatchingClients;
        const message = clientsData.message;
        const clients = clientsData.clients || [];
        
        // Transform clients — no candidate selected so no skill matching, just list them
        const transformedClients = clients.map((client: any) => ({
          id: client.id,
          clientName: client.clientName,
          jdRole: client.jdRole,
          jdText: client.jdDescription || '',
          focusAreas: client.focusAreas || '',
          matchLabel: 'AVAILABLE' as const,
          matchReasons: [],
        }));
        
        setClientResults(transformedClients);
        setClientsMessage(message || '');
        
        // Show message if no matching clients found
        if (!hasMatchingClients && message) {
          toast(message, 'info');
        }
      } else {
        setClientResults([]);
        setClientsMessage('Failed to load clients');
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      setClientResults([]);
      setClientsMessage('Error loading clients');
    } finally {
      setSearchingClients(false);
    }
  };

  const triggerAutoFillAsync = async () => {
    if (!formData.candidateId && !formData.clientId) {
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      if (formData.candidateId) queryParams.append('candidateId', formData.candidateId);
      if (formData.clientId) queryParams.append('clientId', formData.clientId);

      const response = await fetch(`/api/recruiter/interviews/auto-fill/preview?${queryParams.toString()}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const previewData = await response.json();
        
        const fieldsPopulated: string[] = [];
        const updatedData = { ...formData };
        
        if (previewData.engineerEmail) { updatedData.engineerEmail = previewData.engineerEmail; fieldsPopulated.push('engineerEmail'); }
        if (previewData.engineerName) { updatedData.engineerName = previewData.engineerName; fieldsPopulated.push('engineerName'); }
        if (previewData.jdTitle) { updatedData.jdTitle = previewData.jdTitle; fieldsPopulated.push('jdTitle'); }
        if (previewData.jdText) { updatedData.jdText = previewData.jdText; fieldsPopulated.push('jdText'); }
        if (previewData.focusAreas) { updatedData.focusAreas = previewData.focusAreas; fieldsPopulated.push('focusAreas'); }
        if (previewData.resumeSummary) { updatedData.resumeSummary = previewData.resumeSummary; fieldsPopulated.push('resumeSummary'); }
        if (previewData.suggestedMode) { updatedData.interviewMode = previewData.suggestedMode; fieldsPopulated.push('interviewMode'); }
        
        setFormData(updatedData);
        setAutoFillApplied(true);
        setAutoFilledFields(fieldsPopulated);
        
        // Determine confidence
        const confidence = fieldsPopulated.length >= 5 ? 'high' : fieldsPopulated.length >= 3 ? 'medium' : 'low';
        setAutoFillConfidence(confidence);
        
        toast('Form auto-filled with candidate data', 'success');
      }
    } catch (error) {
      console.error('Auto-fill failed:', error);
    }
  };

  // Candidate search functions
  const searchCandidates = async (query: string) => {
    if (!query.trim()) {
      setCandidateResults([]);
      setShowCandidateResults(false);
      return;
    }

    setSearchingCandidates(true);
    try {
      const response = await fetch(`/api/auth/candidates?search=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const candidates = await response.json();
        setCandidateResults(candidates);
        setShowCandidateResults(true);
      } else {
        setCandidateResults([]);
        setShowCandidateResults(false);
      }
    } catch (error) {
      console.error('Candidate search failed:', error);
      setCandidateResults([]);
      setShowCandidateResults(false);
    } finally {
      setSearchingCandidates(false);
    }
  };

  const selectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setCandidateSearch(candidate.name);
    setShowCandidateResults(false);
    
    // Auto-fill form with candidate data
    const fieldsPopulated: string[] = [];
    const updatedData = { ...formData };
    
    updatedData.engineerEmail = candidate.email;
    updatedData.engineerName = candidate.name;
    updatedData.candidateId = candidate.id;
    fieldsPopulated.push('engineerEmail', 'engineerName');
    
    if (candidate.resumeSummary) {
      updatedData.resumeSummary = candidate.resumeSummary;
      fieldsPopulated.push('resumeSummary');
    }
    
    setFormData(updatedData);
    setAutoFillApplied(true);
    setAutoFilledFields(fieldsPopulated);
    setAutoFillConfidence('high');
    
    // Fetch matching clients for this candidate
    fetchMatchingClients(candidate);
    
    toast('Candidate selected and form auto-filled', 'success');
  };

  // Client matching functions
  const fetchMatchingClients = async (candidate: Candidate) => {
    setSearchingClients(true);
    try {
      const params = new URLSearchParams();
      if (candidate.skillSet) params.set('candidateSkillSet', candidate.skillSet);
      if (candidate.yoeActual != null) params.set('candidateYoe', String(candidate.yoeActual));

      const response = await fetch(`/api/recruiter/clients/for-interview?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) { setClientResults([]); return; }

      const clientsData = await response.json();
      const clients: any[] = clientsData.clients || [];
      const hasMatches: boolean = clientsData.hasMatchingClients ?? false;

      // Backend already filtered and ordered (MATCHED first, YOE_SHORT second, SKILL_MISMATCH excluded)
      // Apply frontend label based on position in the list vs hasMatchingClients
      const matchedCount = hasMatches
        ? clients.filter((_: any, i: number) => i < (clientsData.totalClients ?? clients.length)).length
        : 0;

      const transformedClients: Client[] = clients.map((client: any, index: number) => {
        // Determine label: first batch are MATCHED (skill+yoe), rest are YOE_SHORT
        // We re-run the lightweight check client-side just for the label/reasons display
        const skillReqs: any[] = client.skillRequirements || [];
        const candidateSkill = candidate.skillSet ?? '';
        const candidateYoe = candidate.yoeActual ?? 0;

        let label: 'STRONG' | 'GOOD' | 'PARTIAL' | 'AVAILABLE' = 'AVAILABLE';
        const reasons: string[] = [];

        if (skillReqs.length > 0) {
          const matchingSkillReq = skillReqs.find((sr: any) => sr.skillSet === candidateSkill);
          if (matchingSkillReq) {
            reasons.push(`Skill match: ${candidateSkill.replace(/_/g, ' ')}`);
            const positions: any[] = matchingSkillReq.positions || [];
            const bestPos = positions.reduce((best: any, p: any) =>
              (p.minYoeRequired ?? 0) <= candidateYoe && (best === null || (p.minYoeRequired ?? 0) > (best.minYoeRequired ?? 0))
                ? p : best, null);
            if (bestPos) {
              const minYoe = bestPos.minYoeRequired ?? 0;
              const gap = candidateYoe - minYoe;
              if (gap >= 0) {
                label = gap >= 1 ? 'STRONG' : 'GOOD';
                reasons.push(`${candidateYoe} yrs meets ${minYoe}+ requirement`);
              } else {
                label = 'PARTIAL';
                reasons.push(`${candidateYoe} yrs (needs ${minYoe}+, ${Math.abs(gap).toFixed(1)} yrs short)`);
              }
            } else {
              // Skill matches but no position meets YOE
              const minRequired = Math.min(...positions.map((p: any) => p.minYoeRequired ?? 0));
              label = 'PARTIAL';
              reasons.push(`${candidateYoe} yrs (needs ${minRequired}+)`);
            }
          }
        } else {
          // Legacy client — no structured skill requirements
          label = 'AVAILABLE';
          reasons.push('No specific skill requirement set');
        }

        return {
          id: client.id,
          clientName: client.clientName,
          jdRole: client.jdRole,
          jdText: client.jdDescription || '',
          focusAreas: client.focusAreas || '',
          matchLabel: label,
          matchReasons: reasons,
        };
      });

      // Sort: STRONG → GOOD → PARTIAL → AVAILABLE
      const order: Record<string, number> = { STRONG: 0, GOOD: 1, PARTIAL: 2, AVAILABLE: 3 };
      transformedClients.sort((a, b) => (order[a.matchLabel ?? 'AVAILABLE'] ?? 3) - (order[b.matchLabel ?? 'AVAILABLE'] ?? 3));

      setClientResults(transformedClients);
      setClientsMessage(clientsData.message || '');
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      setClientResults([]);
    } finally {
      setSearchingClients(false);
    }
  };

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    
    // Auto-fill form with client data
    const fieldsPopulated: string[] = [];
    const updatedData = { ...formData };
    
    updatedData.jdTitle = client.jdRole;
    updatedData.jdText = client.jdText;
    updatedData.clientId = client.id;
    fieldsPopulated.push('jdTitle', 'jdText');
    
    if (client.focusAreas) {
      updatedData.focusAreas = client.focusAreas;
      fieldsPopulated.push('focusAreas');
    }
    
    setFormData(updatedData);
    setAutoFillApplied(true);
    
    // Remove old client fields and add new ones
    setAutoFilledFields(prev => {
      const clientFields = ['jdTitle', 'jdText', 'focusAreas'];
      const nonClientFields = prev.filter(field => !clientFields.includes(field));
      return [...new Set([...nonClientFields, ...fieldsPopulated])];
    });
    
    toast(`Selected: ${client.clientName} - ${client.jdRole}`, 'success');
  };

  const clearClientSelection = () => {
    setSelectedClient(null);
    
    // Clear client-related fields
    const updatedData = { ...formData };
    updatedData.jdTitle = '';
    updatedData.jdText = '';
    updatedData.focusAreas = '';
    updatedData.clientId = undefined;
    
    setFormData(updatedData);
    
    // Remove client fields from auto-filled list
    const clientFields = ['jdTitle', 'jdText', 'focusAreas'];
    setAutoFilledFields(prev => prev.filter(field => !clientFields.includes(field)));
  };

  const clearCandidateSelection = () => {
    setSelectedCandidate(null);
    setCandidateSearch('');
    setShowCandidateResults(false);
    
    // Clear candidate-related fields
    const updatedData = { ...formData };
    updatedData.engineerEmail = '';
    updatedData.engineerName = '';
    updatedData.resumeSummary = '';
    updatedData.candidateId = undefined;
    
    setFormData(updatedData);
    
    // Clear client selection and results when candidate is cleared
    setSelectedClient(null);
    setClientResults([]);
    setClientsMessage('');
    
    // Remove candidate fields from auto-filled list
    const candidateFields = ['engineerEmail', 'engineerName', 'resumeSummary'];
    setAutoFilledFields(prev => prev.filter(field => !candidateFields.includes(field)));
    
    // Check if we still have auto-filled fields
    const remainingFields = autoFilledFields.filter(field => !candidateFields.includes(field));
    setAutoFillApplied(remainingFields.length > 0);
  };

  useEffect(() => {
    // Auto-fill from URL parameters if available
    const urlParams = {
      engineerEmail: typeof searchParams.engineerEmail === 'string' ? searchParams.engineerEmail : undefined,
      engineerName: typeof searchParams.engineerName === 'string' ? searchParams.engineerName : undefined,
      jdTitle: typeof searchParams.jdTitle === 'string' ? searchParams.jdTitle : undefined,
      suggestedMode: typeof searchParams.suggestedMode === 'string' ? searchParams.suggestedMode : undefined,
      focusAreas: typeof searchParams.focusAreas === 'string' ? searchParams.focusAreas : undefined,
      resumeSummary: typeof searchParams.resumeSummary === 'string' ? searchParams.resumeSummary : undefined
    };

    let hasAutoFillData = false;
    const updatedFormData = { ...formData };

    const fieldsPopulated: string[] = [];
    Object.entries(urlParams).forEach(([key, value]) => {
      if (value) {
        hasAutoFillData = true;
        if (key === 'suggestedMode') {
          updatedFormData.interviewMode = value;
          fieldsPopulated.push('interviewMode');
        } else {
          (updatedFormData as Record<string, unknown>)[key] = value;
          fieldsPopulated.push(key);
        }
      }
    });

    if (hasAutoFillData) {
      setFormData(updatedFormData);
      setAutoFillApplied(true);
      setAutoFilledFields(fieldsPopulated);
      // Determine confidence based on number of fields populated
      const confidence = fieldsPopulated.length >= 5 ? 'high' : fieldsPopulated.length >= 3 ? 'medium' : 'low';
      setAutoFillConfidence(confidence);
      toast('Form auto-filled with candidate and client data', 'success');
    } else if (formData.candidateId || formData.clientId) {
      // If no URL params but candidateId/clientId exists, trigger auto-fill
      triggerAutoFillAsync();
    }
    
    // Load all clients on component mount
    fetchAllClientsForInterview();
  }, []);

  const handleInputChange = (field: keyof InterviewFormData, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Track manual edits
    if (autoFilledFields.includes(field as string)) {
      setManuallyEdited(prev => new Set(prev).add(field as string));
    }
  };

  const handleModeChange = (mode: string) => {
    const selectedMode = INTERVIEW_MODES.find(m => m.value === mode);
    setFormData(prev => ({
      ...prev,
      interviewMode: mode,
      customDurationMinutes: selectedMode ? selectedMode.duration : null
    }));
  };

  const fetchBankQuestions = async (search: string) => {
    setBankLoading(true);
    try {
      const params = new URLSearchParams({ size: '100' });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/questionbank/questions/for-interview?${params}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        const questions: BankQuestion[] = (json.data ?? []).map((q: any) => ({
          id: q.id,
          text: q.text,
          category: q.category ?? '',
          relevancyLabel: q.relevancyLabel ?? 'MEDIUM',
        }));
        setBankQuestions(questions);
      }
    } catch {
      // silent
    } finally {
      setBankLoading(false);
    }
  };

  const toggleQuestion = (q: BankQuestion) => {
    setSelectedQuestions(prev =>
      prev.some(s => s.id === q.id) ? prev.filter(s => s.id !== q.id) : [...prev, q]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.engineerEmail || !formData.engineerName || !formData.jdTitle || !formData.resumeSummary) {
      toast('Please fill in all required fields', 'error');
      return;
    }
    
    // Validate manual questions if enabled
    if (useManualQuestions && manualQuestions.length === 0) {
      toast('Please add at least one custom question', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        ...(useQuestionBank && selectedQuestions.length > 0
          ? { selectedQuestionIds: selectedQuestions.map(q => q.id).join(',') }
          : {}),
        ...(useManualQuestions && manualQuestions.length > 0
          ? { customQuestions: manualQuestions }
          : {}),
      };
      const response = await fetch('/api/recruiter/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        toast('Interview created successfully', 'success');
        router.push('/admin');
      } else {
        const error = await response.json();
        toast(error.error || 'Failed to create interview', 'error');
      }
    } catch (error) {
      toast('Error creating interview', 'error');
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoFill = async () => {
    if (!formData.candidateId && !formData.clientId) {
      toast('No candidate or client selected for auto-fill', 'error');
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      if (formData.candidateId) queryParams.append('candidateId', formData.candidateId);
      if (formData.clientId) queryParams.append('clientId', formData.clientId);

      const response = await fetch(`/api/recruiter/interviews/auto-fill/preview?${queryParams.toString()}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const previewData = await response.json();
        
        const fieldsPopulated: string[] = [];
        const updatedData = { ...formData };
        
        if (previewData.engineerEmail) { updatedData.engineerEmail = previewData.engineerEmail; fieldsPopulated.push('engineerEmail'); }
        if (previewData.engineerName) { updatedData.engineerName = previewData.engineerName; fieldsPopulated.push('engineerName'); }
        if (previewData.jdTitle) { updatedData.jdTitle = previewData.jdTitle; fieldsPopulated.push('jdTitle'); }
        if (previewData.jdText) { updatedData.jdText = previewData.jdText; fieldsPopulated.push('jdText'); }
        if (previewData.focusAreas) { updatedData.focusAreas = previewData.focusAreas; fieldsPopulated.push('focusAreas'); }
        if (previewData.resumeSummary) { updatedData.resumeSummary = previewData.resumeSummary; fieldsPopulated.push('resumeSummary'); }
        if (previewData.suggestedMode) { updatedData.interviewMode = previewData.suggestedMode; fieldsPopulated.push('interviewMode'); }
        
        setFormData(updatedData);
        setAutoFillApplied(true);
        setAutoFilledFields(fieldsPopulated);
        
        // Determine confidence
        const confidence = fieldsPopulated.length >= 5 ? 'high' : fieldsPopulated.length >= 3 ? 'medium' : 'low';
        setAutoFillConfidence(confidence);
        
        toast('Form auto-filled successfully', 'success');
      } else {
        toast('Failed to get auto-fill data', 'error');
      }
    } catch (error) {
      toast('Error during auto-fill', 'error');
    }
  };

  const handleResumeGenerated = (summary: string) => {
    setFormData(prev => ({ ...prev, resumeSummary: summary }));
    if (!autoFilledFields.includes('resumeSummary')) {
      setAutoFilledFields(prev => [...prev, 'resumeSummary']);
    }
    toast('Resume summary generated and applied', 'success');
  };

  const handleRevertAutoFill = () => {
    // Reset only auto-filled fields that haven't been manually edited
    const fieldsToReset = autoFilledFields.filter(field => !manuallyEdited.has(field));
    const resetData = { ...formData };
    
    fieldsToReset.forEach(field => {
      if (field === 'interviewMode') {
        resetData.interviewMode = 'SCREENING';
      } else if (field === 'customDurationMinutes') {
        resetData.customDurationMinutes = null;
      } else {
        (resetData as any)[field] = '';
      }
    });
    
    setFormData(resetData);
    setAutoFillApplied(false);
    setAutoFilledFields([]);
    setManuallyEdited(new Set());
    toast('Auto-fill reverted', 'success');
  };

  return (
    <div className="w-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {(formData.candidateId || formData.clientId) && !autoFillApplied && (
            <Button 
              onClick={triggerAutoFill}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Auto-Fill Form
            </Button>
          )}
        </div>
      </div>



      {/* Auto-fill Indicator */}
      <AutoFillIndicator
        isActive={autoFillApplied}
        fieldsPopulated={autoFilledFields}
        confidence={autoFillConfidence}
        onRevert={handleRevertAutoFill}
        className="mb-6"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Candidate Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Candidate (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search candidates by name or email..."
                    value={candidateSearch}
                    onChange={(e) => {
                      setCandidateSearch(e.target.value);
                      searchCandidates(e.target.value);
                    }}
                    className="pr-10"
                  />
                  {searchingCandidates && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
                  )}
                </div>
                {selectedCandidate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearCandidateSelection}
                    className="flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
              
              {/* Search Results */}
              {showCandidateResults && candidateResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {candidateResults.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="p-3 hover:bg-zinc-50 cursor-pointer border-b border-zinc-100 last:border-b-0"
                      onClick={() => selectCandidate(candidate)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-zinc-900">{candidate.name}</p>
                          <p className="text-sm text-zinc-600">{candidate.email}</p>
                          {candidate.skillSet && (
                            <p className="text-xs text-zinc-500 mt-1">
                              {candidate.skillSet} • {candidate.yoeActual || 0} years exp
                            </p>
                          )}
                        </div>
                        {candidate.resumeSummary && (
                          <Badge variant="outline" className="text-xs">
                            Resume Available
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {showCandidateResults && candidateResults.length === 0 && !searchingCandidates && candidateSearch.trim() && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg p-3">
                  <p className="text-sm text-zinc-500">No candidates found</p>
                </div>
              )}
            </div>
            
            {selectedCandidate && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Selected Candidate</span>
                </div>
                <p className="text-sm text-blue-800">
                  {selectedCandidate.name} ({selectedCandidate.email})
                </p>
                {selectedCandidate.skillSet && (
                  <p className="text-xs text-blue-600 mt-1">
                    {selectedCandidate.skillSet} • {selectedCandidate.yoeActual || 0} years experience
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Selection - Show all clients when no candidate selected */}
        {!selectedCandidate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Available Client Positions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {searchingClients && (
                <div className="flex items-center gap-2 text-zinc-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading clients...</span>
                </div>
              )}
              {!searchingClients && clientResults.length === 0 && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md">
                  <p className="text-sm text-zinc-600">No clients available</p>
                </div>
              )}
              {clientResults.map((client) => (
                <div
                  key={client.id}
                  onClick={() => selectedClient?.id === client.id ? clearClientSelection() : selectClient(client)}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    selectedClient?.id === client.id
                      ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/20'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-zinc-900">{client.clientName}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{client.jdRole}</p>
                    </div>
                    {selectedClient?.id === client.id && (
                      <span className="text-xs font-medium text-blue-600">Selected</span>
                    )}
                  </div>
                  {client.focusAreas && (
                    <p className="text-xs text-zinc-400 mt-1 truncate">Focus: {client.focusAreas}</p>
                  )}
                </div>
              ))}
              {selectedClient && (
                <Button type="button" variant="outline" size="sm" onClick={clearClientSelection} className="flex items-center gap-1">
                  <X className="h-4 w-4" /> Clear Selection
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Client Selection - Show matching clients for selected candidate */}
        {selectedCandidate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Matching Client Positions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {searchingClients && (
                <div className="flex items-center gap-2 text-zinc-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Finding matches...</span>
                </div>
              )}

              {!searchingClients && clientResults.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">{clientsMessage || 'No client positions found.'}</p>
                </div>
              )}

              {clientResults.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                const labelColors = {
                  STRONG:    'bg-emerald-100 text-emerald-700 border-emerald-200',
                  GOOD:      'bg-blue-100 text-blue-700 border-blue-200',
                  PARTIAL:   'bg-amber-100 text-amber-700 border-amber-200',
                  AVAILABLE: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                };
                const cardColors = {
                  STRONG:    isSelected ? 'border-emerald-400 bg-emerald-50' : 'border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50',
                  GOOD:      isSelected ? 'border-blue-400 bg-blue-50' : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50/50',
                  PARTIAL:   isSelected ? 'border-amber-400 bg-amber-50' : 'border-amber-100 hover:border-amber-200 hover:bg-amber-50/50',
                  AVAILABLE: isSelected ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50',
                };
                const label = client.matchLabel ?? 'AVAILABLE';
                return (
                  <div
                    key={client.id}
                    onClick={() => isSelected ? clearClientSelection() : selectClient(client)}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${cardColors[label]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-zinc-900">{client.clientName}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${labelColors[label]}`}>
                            {label}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-semibold text-blue-600">✓ Selected</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5">{client.jdRole}</p>
                        {client.focusAreas && (
                          <p className="text-xs text-zinc-400 mt-0.5 truncate">Focus: {client.focusAreas}</p>
                        )}
                        {client.matchReasons && client.matchReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {client.matchReasons.map((r, i) => (
                              <span key={i} className="text-[10px] bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-zinc-500">
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {selectedClient && (
                <Button type="button" variant="outline" size="sm" onClick={clearClientSelection} className="flex items-center gap-1">
                  <X className="h-4 w-4" /> Clear Selection
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        {/* Candidate Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Candidate Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="engineerEmail">Email *</Label>
                  <FieldAutoFillIndicator 
                    isAutoFilled={autoFilledFields.includes('engineerEmail') && !manuallyEdited.has('engineerEmail')}
                    confidence={autoFillConfidence}
                  />
                </div>
                <Input
                  id="engineerEmail"
                  type="email"
                  value={formData.engineerEmail}
                  onChange={(e) => handleInputChange('engineerEmail', e.target.value)}
                  placeholder="candidate@example.com"
                  required
                  className={autoFilledFields.includes('engineerEmail') && !manuallyEdited.has('engineerEmail') ? 'border-blue-300 bg-blue-50/50' : ''}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="engineerName">Full Name *</Label>
                  <FieldAutoFillIndicator 
                    isAutoFilled={autoFilledFields.includes('engineerName') && !manuallyEdited.has('engineerName')}
                    confidence={autoFillConfidence}
                  />
                </div>
                <Input
                  id="engineerName"
                  value={formData.engineerName}
                  onChange={(e) => handleInputChange('engineerName', e.target.value)}
                  placeholder="John Doe"
                  required
                  className={autoFilledFields.includes('engineerName') && !manuallyEdited.has('engineerName') ? 'border-blue-300 bg-blue-50/50' : ''}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="resumeSummary">Resume Summary *</Label>
                <FieldAutoFillIndicator 
                  isAutoFilled={autoFilledFields.includes('resumeSummary') && !manuallyEdited.has('resumeSummary')}
                  confidence={autoFillConfidence}
                />
              </div>
              <Textarea
                id="resumeSummary"
                value={formData.resumeSummary}
                onChange={(e) => handleInputChange('resumeSummary', e.target.value)}
                placeholder="Brief summary of candidate's experience, skills, and background..."
                rows={4}
                required
                className={autoFilledFields.includes('resumeSummary') && !manuallyEdited.has('resumeSummary') ? 'border-blue-300 bg-blue-50/50' : ''}
              />
              {!formData.resumeSummary && !selectedCandidate && (
                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Search for a candidate above to auto-populate resume summary
                </p>
              )}
              {selectedCandidate && !selectedCandidate.resumeSummary && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Selected candidate has no resume summary in database
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Job Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="jdTitle">Job Title *</Label>
                <FieldAutoFillIndicator 
                  isAutoFilled={autoFilledFields.includes('jdTitle') && !manuallyEdited.has('jdTitle')}
                  confidence={autoFillConfidence}
                />
              </div>
              <Input
                id="jdTitle"
                value={formData.jdTitle}
                onChange={(e) => handleInputChange('jdTitle', e.target.value)}
                placeholder="Senior Backend Engineer"
                required
                className={autoFilledFields.includes('jdTitle') && !manuallyEdited.has('jdTitle') ? 'border-blue-300 bg-blue-50/50' : ''}
              />
            </div>

            <div>
              <Label htmlFor="jdText">Job Description</Label>
              <Textarea
                id="jdText"
                value={formData.jdText}
                onChange={(e) => handleInputChange('jdText', e.target.value)}
                placeholder="Detailed job requirements, responsibilities, and qualifications..."
                rows={6}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="focusAreas">Focus Areas</Label>
                <FieldAutoFillIndicator 
                  isAutoFilled={autoFilledFields.includes('focusAreas') && !manuallyEdited.has('focusAreas')}
                  confidence={autoFillConfidence}
                />
              </div>
              <Input
                id="focusAreas"
                value={formData.focusAreas}
                onChange={(e) => handleInputChange('focusAreas', e.target.value)}
                placeholder="Java, Spring Boot, Microservices, System Design"
                className={autoFilledFields.includes('focusAreas') && !manuallyEdited.has('focusAreas') ? 'border-blue-300 bg-blue-50/50' : ''}
              />
            </div>
          </CardContent>
        </Card>

        {/* Interview Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Interview Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="interviewMode">Interview Mode</Label>
                  <FieldAutoFillIndicator 
                    isAutoFilled={autoFilledFields.includes('interviewMode') && !manuallyEdited.has('interviewMode')}
                    confidence={autoFillConfidence}
                  />
                </div>
                <Select value={formData.interviewMode} onValueChange={handleModeChange}>
                  <SelectTrigger className={autoFilledFields.includes('interviewMode') && !manuallyEdited.has('interviewMode') ? 'border-blue-300 bg-blue-50/50' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="customDuration">Duration (minutes)</Label>
                <Input
                  id="customDuration"
                  type="number"
                  value={formData.customDurationMinutes || ''}
                  onChange={(e) => handleInputChange('customDurationMinutes', parseInt(e.target.value) || null)}
                  placeholder="Custom duration"
                  min={5}
                  max={120}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <FileText className="h-4 w-4" />
              <span>
                {formData.interviewMode} mode includes{' '}
                {INTERVIEW_MODES.find(m => m.value === formData.interviewMode)?.label.match(/\d+q/)?.[0] || 'multiple'} questions
                and {formData.customDurationMinutes || INTERVIEW_MODES.find(m => m.value === formData.interviewMode)?.duration || 15} minutes duration
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Question Bank Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Question Selection (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-zinc-50 rounded-md">
              <span className="text-sm text-zinc-600">Choose one option:</span>
              <Badge variant="outline" className="text-xs">Question Bank</Badge>
              <span className="text-zinc-400">or</span>
              <Badge variant="outline" className="text-xs">Manual Entry</Badge>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const next = !useQuestionBank;
                  setUseQuestionBank(next);
                  if (next) {
                    setUseManualQuestions(false);
                    if (bankQuestions.length === 0) fetchBankQuestions('');
                  }
                }}
                className="flex items-center gap-2 text-sm font-medium"
              >
                {useQuestionBank
                  ? <CheckSquare className="h-5 w-5 text-blue-600" />
                  : <Square className="h-5 w-5 text-zinc-400" />}
                Select from Question Bank
              </button>
            </div>

            {useQuestionBank && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">
                  The AI will pick randomly from your selected questions. Once all are used, it continues generating questions until the timer ends.
                </p>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    placeholder="Search questions..."
                    value={bankSearch}
                    className="pl-9"
                    onChange={e => {
                      setBankSearch(e.target.value);
                      if (bankSearchTimer.current) clearTimeout(bankSearchTimer.current);
                      bankSearchTimer.current = setTimeout(() => fetchBankQuestions(e.target.value), 400);
                    }}
                  />
                </div>

                {/* Question list */}
                <div className="border border-zinc-200 rounded-md max-h-64 overflow-y-auto">
                  {bankLoading && (
                    <div className="flex items-center justify-center p-4 gap-2 text-zinc-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading questions...
                    </div>
                  )}
                  {!bankLoading && bankQuestions.length === 0 && (
                    <p className="p-4 text-sm text-zinc-500">No questions found.</p>
                  )}
                  {!bankLoading && bankQuestions.map(q => {
                    const isSelected = selectedQuestions.some(s => s.id === q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestion(q)}
                        className={`flex items-start gap-3 p-3 cursor-pointer border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        {isSelected
                          ? <CheckSquare className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                          : <Square className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-900 line-clamp-2">{q.text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {q.category && <span className="text-xs text-zinc-500">{q.category}</span>}
                            <Badge variant="outline" className={`text-xs ${
                              q.relevancyLabel === 'HIGH' ? 'border-green-300 text-green-700'
                              : q.relevancyLabel === 'MEDIUM' ? 'border-yellow-300 text-yellow-700'
                              : 'border-zinc-300 text-zinc-500'
                            }`}>{q.relevancyLabel}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected summary */}
                {selectedQuestions.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">
                        {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedQuestions([])}
                        className="text-xs text-blue-600 underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedQuestions.map(q => (
                        <span
                          key={q.id}
                          className="inline-flex items-center gap-1 bg-white border border-blue-200 rounded px-2 py-0.5 text-xs text-blue-800"
                        >
                          {q.text.substring(0, 40)}{q.text.length > 40 ? '…' : ''}
                          <button type="button" onClick={e => { e.stopPropagation(); toggleQuestion(q); }}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Custom Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Manual Custom Questions (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const next = !useManualQuestions;
                  setUseManualQuestions(next);
                  if (next) setUseQuestionBank(false);
                }}
                className="flex items-center gap-2 text-sm font-medium"
              >
                {useManualQuestions
                  ? <CheckSquare className="h-5 w-5 text-blue-600" />
                  : <Square className="h-5 w-5 text-zinc-400" />}
                Add your own custom questions
              </button>
            </div>

            {useManualQuestions && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500">
                  Add custom questions that will be asked during the interview. The AI will use these questions in order before generating additional ones if time permits.
                </p>

                {/* Quick Paste Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quick Paste (One question per line)</Label>
                  <Textarea
                    placeholder="Paste multiple questions here, one per line...&#10;Example:&#10;Explain the difference between abstract class and interface in Java&#10;How do you handle exceptions in Spring Boot?&#10;What is dependency injection?"
                    value={quickPasteText}
                    onChange={(e) => setQuickPasteText(e.target.value)}
                    rows={4}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const lines = quickPasteText
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0);
                      
                      if (lines.length === 0) {
                        toast('No questions found to parse', 'error');
                        return;
                      }
                      
                      setManualQuestions(prev => [...prev, ...lines]);
                      setQuickPasteText('');
                      toast(`Added ${lines.length} question${lines.length !== 1 ? 's' : ''}`, 'success');
                    }}
                    disabled={!quickPasteText.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Parse & Add Questions
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-zinc-500">Or add individually</span>
                  </div>
                </div>

                {/* Individual Question Entry */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Add Single Question</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a question and click Add..."
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newQuestionText.trim()) {
                          e.preventDefault();
                          setManualQuestions(prev => [...prev, newQuestionText.trim()]);
                          setNewQuestionText('');
                          toast('Question added', 'success');
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!newQuestionText.trim()) {
                          toast('Please enter a question', 'error');
                          return;
                        }
                        setManualQuestions(prev => [...prev, newQuestionText.trim()]);
                        setNewQuestionText('');
                        toast('Question added', 'success');
                      }}
                      disabled={!newQuestionText.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Questions List */}
                {manualQuestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Custom Questions ({manualQuestions.length})
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setManualQuestions([]);
                          toast('All questions cleared', 'success');
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Clear All
                      </Button>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto rounded-md border border-zinc-200 divide-y divide-zinc-100 dark:divide-zinc-800">
                      {manualQuestions.map((question, index) => (
                        <div key={index} className="p-3 hover:bg-zinc-50 group">
                          {editingIndex === index ? (
                            <div className="flex gap-2">
                              <Input
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (editingText.trim()) {
                                      const updated = [...manualQuestions];
                                      updated[index] = editingText.trim();
                                      setManualQuestions(updated);
                                      setEditingIndex(null);
                                      setEditingText('');
                                      toast('Question updated', 'success');
                                    }
                                  } else if (e.key === 'Escape') {
                                    setEditingIndex(null);
                                    setEditingText('');
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (editingText.trim()) {
                                    const updated = [...manualQuestions];
                                    updated[index] = editingText.trim();
                                    setManualQuestions(updated);
                                    setEditingIndex(null);
                                    setEditingText('');
                                    toast('Question updated', 'success');
                                  }
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingIndex(null);
                                  setEditingText('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-medium text-zinc-400 mt-1 shrink-0">Q{index + 1}</span>
                              <p className="flex-1 text-sm text-zinc-900">{question}</p>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingIndex(index);
                                    setEditingText(question);
                                  }}
                                  className="h-7 w-7 p-0"
                                >
                                  <Edit2 className="h-3 w-3 text-blue-600" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setManualQuestions(prev => prev.filter((_, i) => i !== index));
                                    toast('Question removed', 'success');
                                  }}
                                  className="h-7 w-7 p-0"
                                >
                                  <Trash2 className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs text-blue-800">
                        <strong>Note:</strong> These {manualQuestions.length} question{manualQuestions.length !== 1 ? 's' : ''} will be asked in order during the interview. If time remains after all custom questions, the AI will generate additional questions.
                      </p>
                    </div>
                  </div>
                )}

                {manualQuestions.length === 0 && (
                  <div className="p-4 border-2 border-dashed border-zinc-200 rounded-md text-center">
                    <p className="text-sm text-zinc-500">No custom questions added yet</p>
                    <p className="text-xs text-zinc-400 mt-1">Use quick paste or add questions individually above</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          
          <Button 
            type="submit" 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Create Interview
          </Button>
        </div>
      </form>
    </div>
  );
}