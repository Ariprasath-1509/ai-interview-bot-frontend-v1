'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  questionDifficulty: string; // '' = auto (derived from mode) | EASY | MEDIUM | HARD
  assessmentType: 'CLIENT_INTERVIEW' | 'ONBOARDING';
  customDurationMinutes: number | null;
  includeProgrammingQuestions: boolean;
  candidateId?: string;
  clientId?: string;
  selectedQuestionIds?: string;
  scheduledAt?: string | null;
  expiresAt?: string | null;
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
  yoePortrayed?: number;
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
  { value: 'SCREENING', label: 'SCREENING (15min)', duration: 15 },
  { value: 'L1', label: 'L1 (20min)', duration: 20 },
  { value: 'L2', label: 'L2 (25min)', duration: 25 },
  { value: 'L3', label: 'L3 (30min)', duration: 30 },
  { value: 'L4', label: 'L4 (30min)', duration: 30 }
];

interface CreateInterviewClientProps {
  candidateId?: string;
  clientId?: string;
  searchParams: { [key: string]: string | string[] | undefined };
  features?: Record<string, boolean>;
}

export function CreateInterviewClient({ candidateId, clientId, searchParams, features = {} }: CreateInterviewClientProps) {
  const clientsEnabled = features.CLIENTS !== false;
  const questionBankEnabled = features.QUESTION_BANK !== false;
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
    questionDifficulty: '',
    assessmentType: 'CLIENT_INTERVIEW',
    customDurationMinutes: null,
    includeProgrammingQuestions: true,
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
        const confidence = (fieldsPopulated.includes('engineerEmail') && fieldsPopulated.length >= 4) ? 'high' : (fieldsPopulated.includes('engineerEmail') || fieldsPopulated.includes('engineerName')) ? 'medium' : 'low';
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

  const selectCandidate = async (candidate: Candidate) => {
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
    
    const summaryText = candidate.resumeSummary || (candidate as any).summary || (candidate as any).aiSummary || (candidate as any).resume_summary || (candidate as any).reviewSummary;
    if (summaryText) {
      updatedData.resumeSummary = summaryText;
      fieldsPopulated.push('resumeSummary');
    }
    
    setFormData(updatedData);
    setAutoFillApplied(true);
    setAutoFilledFields(fieldsPopulated);
    setAutoFillConfidence('high');
    
    // Fetch matching clients for this candidate
    if (clientsEnabled) fetchMatchingClients(candidate);

    // If resumeSummary was not attached in search payload, fetch auto-fill preview from backend
    if (!summaryText && candidate.id) {
      try {
        const response = await fetch(`/api/recruiter/interviews/auto-fill/preview?candidateId=${candidate.id}`, { credentials: 'include' });
        if (response.ok) {
          const previewData = await response.json();
          if (previewData.resumeSummary) {
            setFormData(prev => ({ ...prev, resumeSummary: previewData.resumeSummary }));
            setAutoFilledFields(prev => Array.from(new Set([...prev, 'resumeSummary'])));
          }
        }
      } catch (err) {
        console.error('Failed to fetch candidate resume summary:', err);
      }
    }
    
    toast('Candidate selected and form auto-filled', 'success');
  };

  // Client matching functions
  const fetchMatchingClients = async (candidate: Candidate) => {
    setSearchingClients(true);
    try {
      const params = new URLSearchParams();
      if (candidate.skillSet) params.set('candidateSkillSet', candidate.skillSet);
      if (candidate.yoePortrayed != null) params.set('candidateYoe', String(candidate.yoePortrayed));

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
        const candidateYoe = candidate.yoePortrayed ?? 0;

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
      const confidence = (fieldsPopulated.includes('engineerEmail') && fieldsPopulated.length >= 4) ? 'high' : (fieldsPopulated.includes('engineerEmail') || fieldsPopulated.includes('engineerName')) ? 'medium' : 'low';
      setAutoFillConfidence(confidence);
      toast('Form auto-filled with candidate and client data', 'success');
    } else if (formData.candidateId || formData.clientId) {
      // If no URL params but candidateId/clientId exists, trigger auto-fill
      triggerAutoFillAsync();
    }
    
    // Load all clients on component mount (only if CLIENTS feature is enabled)
    if (clientsEnabled) fetchAllClientsForInterview();
  }, []);

  const handleInputChange = (field: keyof InterviewFormData, value: string | number | boolean | null) => {
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
        ...(formData.scheduledAt ? { scheduledAt: new Date(formData.scheduledAt).toISOString() } : {}),
        ...(formData.expiresAt ? { expiresAt: new Date(formData.expiresAt).toISOString() } : {}),
      };
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch('/api/recruiter/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
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
        const confidence = (fieldsPopulated.includes('engineerEmail') && fieldsPopulated.length >= 4) ? 'high' : (fieldsPopulated.includes('engineerEmail') || fieldsPopulated.includes('engineerName')) ? 'medium' : 'low';
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

  const isOnboarding = formData.assessmentType === 'ONBOARDING';

  return (
    <div className="mx-auto w-full max-w-7xl">
      {(formData.candidateId || formData.clientId) && !autoFillApplied && (
        <div className="mb-6 flex justify-end">
          <Button
            onClick={triggerAutoFill}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Auto-Fill Form
          </Button>
        </div>
      )}

      {/* Auto-fill Indicator */}
      <AutoFillIndicator
        isActive={autoFillApplied}
        fieldsPopulated={autoFilledFields}
        confidence={autoFillConfidence}
        onRevert={handleRevertAutoFill}
        className="mb-6"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Interview Type */}
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
          <div className="panel-header panel-header-accent-purple flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Interview Type
            </h3>
            <Link
              href="/admin/interviews/bulk-create"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs font-bold text-[var(--text-primary)] shadow-2xs transition-all hover:bg-[var(--surface-subtle)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              Bulk Create
            </Link>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-all duration-200 ${
                  formData.assessmentType === 'CLIENT_INTERVIEW'
                    ? 'border-purple-500/40 bg-purple-500/10 shadow-2xs ring-1 ring-purple-500/30'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-purple-300/40 hover:bg-[var(--surface-subtle)]/60'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <input
                    type="radio"
                    name="assessmentType"
                    checked={formData.assessmentType === 'CLIENT_INTERVIEW'}
                    onChange={() => handleInputChange('assessmentType', 'CLIENT_INTERVIEW')}
                    className="h-4 w-4 accent-purple-600"
                  />
                  Client Interview
                </span>
                <span className="text-xs text-[var(--text-secondary)] font-medium">JD-based, scored against a client's role with the full assessment report.</span>
              </label>
              <label
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-all duration-200 ${
                  formData.assessmentType === 'ONBOARDING'
                    ? 'border-teal-500/40 bg-teal-500/10 shadow-2xs ring-1 ring-teal-500/30'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-teal-300/40 hover:bg-[var(--surface-subtle)]/60'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <input
                    type="radio"
                    name="assessmentType"
                    checked={formData.assessmentType === 'ONBOARDING'}
                    onChange={() => handleInputChange('assessmentType', 'ONBOARDING')}
                    className="h-4 w-4 accent-teal-600"
                  />
                  Onboarding Assessment
                </span>
                <span className="text-xs text-[var(--text-secondary)] font-medium">Checks basic understanding of one concept you specify — no client, single simple score.</span>
              </label>
            </div>
          </div>
        </div>

        {/* Candidate Search */}
        <div className="panel-card !overflow-visible relative z-30 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
          <div className="panel-header panel-header-accent-blue rounded-t-2xl">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Search Candidate (Optional)
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="relative z-50">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search candidates by name or email..."
                    value={candidateSearch}
                    onChange={(e) => {
                      setCandidateSearch(e.target.value);
                      searchCandidates(e.target.value);
                    }}
                    className="pr-10 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20"
                  />
                  {searchingCandidates && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-[var(--text-secondary)]" />
                  )}
                </div>
                {selectedCandidate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearCandidateSelection}
                    className="flex items-center gap-1 rounded-xl border-[var(--border)] text-xs font-semibold"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
              
              {/* Search Results */}
              {showCandidateResults && candidateResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  {candidateResults.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="p-3.5 hover:bg-[var(--surface-subtle)] cursor-pointer border-b border-[var(--border)] last:border-b-0 transition-colors"
                      onClick={() => selectCandidate(candidate)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-[var(--text-primary)]">{candidate.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{candidate.email}</p>
                          {candidate.skillSet && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
                              {candidate.skillSet} • {candidate.yoePortrayed || 0} years exp
                            </p>
                          )}
                        </div>
                        {candidate.resumeSummary && (
                          <Badge variant="outline" className="text-[10px] font-bold border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300">
                            Resume Available
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {showCandidateResults && candidateResults.length === 0 && !searchingCandidates && candidateSearch.trim() && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl p-3.5">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">No candidates found</p>
                </div>
              )}
            </div>
            
            {selectedCandidate && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/25 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-purple-700 dark:text-purple-300">Selected Candidate</span>
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {selectedCandidate.name} ({selectedCandidate.email})
                </p>
                {selectedCandidate.skillSet && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
                    {selectedCandidate.skillSet} • {selectedCandidate.yoePortrayed || 0} years experience
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Client Selection - Show all clients when no candidate selected */}
        {clientsEnabled && !isOnboarding && !selectedCandidate && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
            <div className="panel-header panel-header-accent-emerald rounded-t-2xl">
              <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
                <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Available Client Positions
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {searchingClients && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span>Loading clients...</span>
                </div>
              )}
              {!searchingClients && clientResults.length === 0 && (
                <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-xl">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">No clients available</p>
                </div>
              )}
              {!searchingClients && clientResults.length > 0 && (
                <Select
                  value={selectedClient?.id || "NONE"}
                  onValueChange={(val) => {
                    if (val === "NONE") {
                      clearClientSelection();
                    } else {
                      const c = clientResults.find((client) => client.id === val);
                      if (c) selectClient(c);
                    }
                  }}
                >
                  <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-12 font-medium focus:border-[#6D28D9]">
                    <SelectValue placeholder="Select a client position..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 z-50">
                    <SelectItem value="NONE" className="text-xs font-semibold text-[var(--text-secondary)]">
                      Select a client position...
                    </SelectItem>
                    {clientResults.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="text-xs font-semibold py-2">
                        <div className="flex items-center justify-between gap-4 w-full">
                          <span className="font-bold text-[var(--text-primary)]">{client.clientName}</span>
                          <span className="text-xs text-[var(--text-secondary)] font-medium truncate">{client.jdRole}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedClient && (
                <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/25 rounded-xl mt-2">
                  <div>
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-300">Selected Client Position</p>
                    <p className="text-sm font-extrabold text-[var(--text-primary)]">{selectedClient.clientName} - {selectedClient.jdRole}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={clearClientSelection} className="flex items-center gap-1 rounded-xl text-xs font-semibold">
                    <X className="h-4 w-4" /> Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Client Selection - Show matching clients for selected candidate */}
        {clientsEnabled && !isOnboarding && selectedCandidate && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
            <div className="panel-header panel-header-accent-emerald rounded-t-2xl">
              <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
                <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Matching Client Positions
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {searchingClients && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span>Finding matches...</span>
                </div>
              )}

              {!searchingClients && clientResults.length === 0 && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{clientsMessage || 'No client positions found.'}</p>
                </div>
              )}

              {!searchingClients && clientResults.length > 0 && (
                <Select
                  value={selectedClient?.id || "NONE"}
                  onValueChange={(val) => {
                    if (val === "NONE") {
                      clearClientSelection();
                    } else {
                      const c = clientResults.find((client) => client.id === val);
                      if (c) selectClient(c);
                    }
                  }}
                >
                  <SelectTrigger className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs h-12 font-medium focus:border-[#6D28D9]">
                    <SelectValue placeholder="Select a matching client position..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 z-50">
                    <SelectItem value="NONE" className="text-xs font-semibold text-[var(--text-secondary)]">
                      Select a matching client position...
                    </SelectItem>
                    {clientResults.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="text-xs font-semibold py-2">
                        <div className="flex items-center justify-between gap-4 w-full">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-primary)]">{client.clientName}</span>
                            {client.matchLabel && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
                                {client.matchLabel}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[var(--text-secondary)] font-medium truncate">{client.jdRole}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedClient && (
                <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/25 rounded-xl mt-2">
                  <div>
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-300">Selected Client Position</p>
                    <p className="text-sm font-extrabold text-[var(--text-primary)]">{selectedClient.clientName} - {selectedClient.jdRole}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={clearClientSelection} className="flex items-center gap-1 rounded-xl text-xs font-semibold">
                    <X className="h-4 w-4" /> Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Candidate Information */}
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
          <div className="panel-header panel-header-accent-purple">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Candidate Information
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="engineerEmail" className="font-bold text-xs text-[var(--text-primary)]">Email *</Label>
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
                  className={`rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 ${
                    autoFilledFields.includes('engineerEmail') && !manuallyEdited.has('engineerEmail') ? 'border-purple-300 bg-purple-500/10' : ''
                  }`}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="engineerName" className="font-bold text-xs text-[var(--text-primary)]">Full Name *</Label>
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
                  className={`rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 ${
                    autoFilledFields.includes('engineerName') && !manuallyEdited.has('engineerName') ? 'border-purple-300 bg-purple-500/10' : ''
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="resumeSummary" className="font-bold text-xs text-[var(--text-primary)]">Resume Summary *</Label>
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
                className={`rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 ${
                  autoFilledFields.includes('resumeSummary') && !manuallyEdited.has('resumeSummary') ? 'border-purple-300 bg-purple-500/10' : ''
                }`}
              />
              {!formData.resumeSummary && !selectedCandidate && (
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 flex items-center gap-1 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Search for a candidate above to auto-populate resume summary
                </p>
              )}
              {selectedCandidate && !selectedCandidate.resumeSummary && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1 font-medium dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Selected candidate has no resume summary in database
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Job Description / Concept */}
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
          <div className="panel-header panel-header-accent-indigo">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              {isOnboarding ? 'Concept / Topic' : 'Job Description'}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="jdTitle" className="font-bold text-xs text-[var(--text-primary)]">{isOnboarding ? 'Concept / Topic *' : 'Job Title *'}</Label>
                <FieldAutoFillIndicator
                  isAutoFilled={autoFilledFields.includes('jdTitle') && !manuallyEdited.has('jdTitle')}
                  confidence={autoFillConfidence}
                />
              </div>
              <Input
                id="jdTitle"
                value={formData.jdTitle}
                onChange={(e) => handleInputChange('jdTitle', e.target.value)}
                placeholder={isOnboarding ? 'Java Collections' : 'Senior Backend Engineer'}
                required
                className={`rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 ${
                  autoFilledFields.includes('jdTitle') && !manuallyEdited.has('jdTitle') ? 'border-purple-300 bg-purple-500/10' : ''
                }`}
              />
            </div>

            <div>
              <Label htmlFor="jdText" className="font-bold text-xs text-[var(--text-primary)] mb-2 block">{isOnboarding ? 'Concept description' : 'Job Description'}</Label>
              <Textarea
                id="jdText"
                value={formData.jdText}
                onChange={(e) => handleInputChange('jdText', e.target.value)}
                placeholder={isOnboarding
                  ? 'What the candidate should understand — key points, scope, and anything to explicitly cover or avoid...'
                  : 'Detailed job requirements, responsibilities, and qualifications...'}
                rows={6}
                className="rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20"
              />
            </div>

            {!isOnboarding && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="focusAreas" className="font-bold text-xs text-[var(--text-primary)]">Focus Areas</Label>
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
                  className={`rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 ${
                    autoFilledFields.includes('focusAreas') && !manuallyEdited.has('focusAreas') ? 'border-purple-300 bg-purple-500/10' : ''
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Interview Configuration */}
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
          <div className="panel-header panel-header-accent-purple">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Interview Configuration
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <div className="flex items-center justify-between mb-2 min-h-5">
                  <Label htmlFor="interviewMode" className="font-bold text-xs text-[var(--text-primary)]">Interview Mode</Label>
                  <FieldAutoFillIndicator
                    isAutoFilled={autoFilledFields.includes('interviewMode') && !manuallyEdited.has('interviewMode')}
                    confidence={autoFillConfidence}
                  />
                </div>
                <Select value={formData.interviewMode} onValueChange={handleModeChange}>
                  <SelectTrigger className={`rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] ${
                    autoFilledFields.includes('interviewMode') && !manuallyEdited.has('interviewMode') ? 'border-purple-300 bg-purple-500/10' : ''
                  }`}>
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
                <div className="flex items-center mb-2 min-h-5">
                  <Label htmlFor="customDuration" className="font-bold text-xs text-[var(--text-primary)]">Duration (minutes)</Label>
                </div>
                <Input
                  id="customDuration"
                  type="number"
                  value={formData.customDurationMinutes || ''}
                  onChange={(e) => handleInputChange('customDurationMinutes', parseInt(e.target.value) || null)}
                  placeholder="Custom duration"
                  min={5}
                  max={120}
                  className="rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <div className="flex items-center mb-2 min-h-5">
                  <Label htmlFor="questionDifficulty" className="font-bold text-xs text-[var(--text-primary)]">Question Difficulty</Label>
                </div>
                <Select
                  value={formData.questionDifficulty || 'AUTO'}
                  onValueChange={(v) => handleInputChange('questionDifficulty', v === 'AUTO' ? '' : v)}
                >
                  <SelectTrigger id="questionDifficulty" className="rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">Auto (based on mode)</SelectItem>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] p-3 text-xs font-semibold text-[var(--text-secondary)]">
              <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>
                {formData.interviewMode} mode · {formData.customDurationMinutes || INTERVIEW_MODES.find(m => m.value === formData.interviewMode)?.duration || 15} minutes ·{' '}
                {formData.questionDifficulty ? `${formData.questionDifficulty.charAt(0)}${formData.questionDifficulty.slice(1).toLowerCase()} questions` : 'difficulty set by mode'}
              </span>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 cursor-pointer hover:border-purple-300/40 transition-colors">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-purple-600"
                checked={formData.includeProgrammingQuestions}
                onChange={(e) => handleInputChange('includeProgrammingQuestions', e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-bold text-[var(--text-primary)]">Include programming questions</span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)] font-medium">
                  When enabled, the interview may include a coding slot with a code editor and test cases.
                  Leave unchecked for theory-only interviews.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="scheduledAt" className="font-bold text-xs text-[var(--text-primary)]">Available from (optional)</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt ?? ''}
                  onChange={(e) => handleInputChange('scheduledAt', e.target.value || null)}
                  className="rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                />
                <p className="text-xs text-[var(--text-secondary)] font-medium">Candidate cannot access before this time</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiresAt" className="font-bold text-xs text-[var(--text-primary)]">Expires at (optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt ?? ''}
                  onChange={(e) => handleInputChange('expiresAt', e.target.value || null)}
                  className="rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                />
                <p className="text-xs text-[var(--text-secondary)] font-medium">Link becomes inaccessible after this time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question Bank Selection — not applicable to onboarding or when QUESTION_BANK feature is disabled */}
        {questionBankEnabled && !isOnboarding && (
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
          <div className="panel-header panel-header-accent-blue">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Question Selection (Optional)
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <p className="rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] p-3.5 text-xs font-semibold text-[var(--text-secondary)]">
              Optionally pin specific questions — pick them from the question bank here, or add your own in the next section. Leave both off to let the AI generate everything.
            </p>

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
                className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] cursor-pointer"
              >
                {useQuestionBank
                  ? <CheckSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  : <Square className="h-5 w-5 text-[var(--text-secondary)]" />}
                Select from Question Bank
              </button>
            </div>

            {useQuestionBank && (
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  The AI will pick randomly from your selected questions. Once all are used, it continues generating questions until the timer ends.
                </p>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                  <Input
                    placeholder="Search questions..."
                    value={bankSearch}
                    className="pl-9 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20"
                    onChange={e => {
                      setBankSearch(e.target.value);
                      if (bankSearchTimer.current) clearTimeout(bankSearchTimer.current);
                      bankSearchTimer.current = setTimeout(() => fetchBankQuestions(e.target.value), 400);
                    }}
                  />
                </div>

                {/* Question list */}
                <div className="border border-[var(--border)] rounded-xl max-h-64 overflow-y-auto bg-[var(--surface)]">
                  {bankLoading && (
                    <div className="flex items-center justify-center p-4 gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" /> Loading questions...
                    </div>
                  )}
                  {!bankLoading && bankQuestions.length === 0 && (
                    <p className="p-4 text-xs font-medium text-[var(--text-secondary)]">No questions found.</p>
                  )}
                  {!bankLoading && bankQuestions.map(q => {
                    const isSelected = selectedQuestions.some(s => s.id === q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestion(q)}
                        className={`flex items-start gap-3 p-3.5 cursor-pointer border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-subtle)] transition-colors ${
                          isSelected ? 'bg-purple-500/10' : ''
                        }`}
                      >
                        {isSelected
                          ? <CheckSquare className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                          : <Square className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2">{q.text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {q.category && <span className="text-[11px] font-medium text-[var(--text-secondary)]">{q.category}</span>}
                            <Badge variant="outline" className={`text-[10px] font-bold ${
                              q.relevancyLabel === 'HIGH' ? 'border-emerald-500/30 text-emerald-700 bg-emerald-500/10 dark:text-emerald-300'
                              : q.relevancyLabel === 'MEDIUM' ? 'border-amber-500/30 text-amber-700 bg-amber-500/10 dark:text-amber-300'
                              : 'border-[var(--border)] text-[var(--text-secondary)]'
                            }`}>{q.relevancyLabel}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected summary */}
                {selectedQuestions.length > 0 && (
                  <div className="p-3.5 bg-purple-500/10 border border-purple-500/25 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedQuestions([])}
                        className="text-xs font-bold text-purple-600 underline dark:text-purple-400 cursor-pointer"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedQuestions.map(q => (
                        <span
                          key={q.id}
                          className="inline-flex items-center gap-1.5 bg-[var(--surface)] border border-purple-500/30 rounded-lg px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-2xs"
                        >
                          {q.text.substring(0, 40)}{q.text.length > 40 ? '…' : ''}
                          <button type="button" onClick={e => { e.stopPropagation(); toggleQuestion(q); }}>
                            <X className="h-3 w-3 text-[var(--text-secondary)] hover:text-red-500" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Manual Custom Questions */}
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
          <div className="panel-header panel-header-accent-purple">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <List className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Manual Custom Questions (Optional)
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const next = !useManualQuestions;
                  setUseManualQuestions(next);
                  if (next) setUseQuestionBank(false);
                }}
                className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] cursor-pointer"
              >
                {useManualQuestions
                  ? <CheckSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  : <Square className="h-5 w-5 text-[var(--text-secondary)]" />}
                Add your own custom questions
              </button>
            </div>

            {useManualQuestions && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--text-secondary)] font-medium">
                  Add custom questions that will be asked during the interview. The AI will use these questions in order before generating additional ones if time permits.
                </p>

                {/* Quick Paste Section */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">Quick Paste (One question per line)</Label>
                  <Textarea
                    placeholder="Paste multiple questions here, one per line...&#10;Example:&#10;Explain the difference between abstract class and interface in Java&#10;How do you handle exceptions in Spring Boot?&#10;What is dependency injection?"
                    value={quickPasteText}
                    onChange={(e) => setQuickPasteText(e.target.value)}
                    rows={4}
                    className="font-mono text-xs rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                  />
                  <Button
                    type="button"
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
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-200 hover:opacity-95 hover:shadow-md active:scale-[0.98] disabled:from-purple-600/35 disabled:via-violet-600/35 disabled:to-indigo-600/35 disabled:text-white/50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Parse & Add Questions
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[var(--border)]" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
                    <span className="bg-[var(--surface)] px-3.5 text-[var(--text-secondary)]">Or add individually</span>
                  </div>
                </div>

                {/* Individual Question Entry */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[var(--text-primary)]">Add Single Question</Label>
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
                      className="flex-1 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                    />
                    <Button
                      type="button"
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
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all duration-200 hover:opacity-95 hover:shadow-md active:scale-[0.98] disabled:from-purple-600/35 disabled:via-violet-600/35 disabled:to-indigo-600/35 disabled:text-white/50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Questions List */}
                {manualQuestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-[var(--text-primary)]">
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
                        className="text-xs font-bold text-red-600 hover:text-red-700"
                      >
                        Clear All
                      </Button>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--surface)]">
                      {manualQuestions.map((question, index) => (
                        <div key={index} className="p-3.5 hover:bg-[var(--surface-subtle)] group transition-colors">
                          {editingIndex === index ? (
                            <div className="flex gap-2">
                              <Input
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="flex-1 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
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
                                className="rounded-xl"
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
                                className="rounded-xl"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-bold text-[var(--text-secondary)] mt-0.5 shrink-0">Q{index + 1}</span>
                              <p className="flex-1 text-xs font-medium text-[var(--text-primary)]">{question}</p>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingIndex(index);
                                    setEditingText(question);
                                  }}
                                  className="h-7 w-7 p-0 rounded-lg"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-purple-600" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setManualQuestions(prev => prev.filter((_, i) => i !== index));
                                    toast('Question removed', 'success');
                                  }}
                                  className="h-7 w-7 p-0 rounded-lg"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-3.5 bg-purple-500/10 border border-purple-500/25 rounded-xl">
                      <p className="text-xs text-[var(--text-primary)] font-medium">
                        <strong>Note:</strong> These {manualQuestions.length} question{manualQuestions.length !== 1 ? 's' : ''} will be asked in order during the interview. If time remains after all custom questions, the AI will generate additional questions.
                      </p>
                    </div>
                  </div>
                )}

                {manualQuestions.length === 0 && (
                  <div className="p-5 border-2 border-dashed border-[var(--border)] rounded-xl text-center">
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">No custom questions added yet</p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 opacity-75">Use quick paste or add questions individually above</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            className="rounded-xl border-[var(--border)] px-5 py-2.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            Cancel
          </Button>
          
          <Button 
            type="submit" 
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#7C3AED] to-[#4C1D95] px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
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