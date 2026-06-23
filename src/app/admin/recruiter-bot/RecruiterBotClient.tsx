'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Building2, Loader2, Trash2, ChevronDown, ChevronRight, BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';

interface Client {
  id: string;
  clientName: string;
  jdRole: string;
  docId?: string;
  jdFileName?: string;
}

interface QuestionItem {
  question_number?: number;
  question?: string;
  answer?: string;
  why_correct?: string;
  common_mistake?: string;
  section?: string;
  note?: string;
}

interface Message {
  role: 'user' | 'bot';
  content: string;
  parsedQuestions?: QuestionItem[];
  timestamp: Date;
}

function parseResponse(raw: string): { text: string; questions: QuestionItem[] } {
  let cleaned = raw.trim();

  // Try to parse the outer wrapper first (document service format)
  try {
    const outer = JSON.parse(cleaned);

    // Handle document service response: { docId, query, answer: [...], raw_llm: "..." }
    if (outer.answer && Array.isArray(outer.answer)) {
      // answer[0] might be a markdown-fenced JSON string
      let innerSource = outer.answer[0] || outer.raw_llm || '';
      if (typeof innerSource === 'string') {
        const parsed = tryParseJsonString(innerSource);
        if (parsed) return { text: '', questions: flattenSections(parsed) };
      }
      // If answer array contains objects directly (flat format)
      if (typeof outer.answer[0] === 'object') {
        return { text: '', questions: flattenSections(outer.answer) };
      }
    }

    // Try raw_llm field
    if (outer.raw_llm && typeof outer.raw_llm === 'string') {
      const parsed = tryParseJsonString(outer.raw_llm);
      if (parsed) return { text: '', questions: flattenSections(parsed) };
    }

    // Direct format: { answer: [...] } where answer contains objects
    if (outer.answer && Array.isArray(outer.answer) && outer.answer.length > 0 && typeof outer.answer[0] === 'object') {
      return { text: '', questions: flattenSections(outer.answer) };
    }
  } catch {}

  // Try the raw string itself as JSON
  const parsed = tryParseJsonString(cleaned);
  if (parsed) return { text: '', questions: flattenSections(parsed) };

  return { text: raw, questions: [] };
}

function tryParseJsonString(input: string): any[] | null {
  let s = stripMarkdownFences(input);

  // Find the JSON start
  const jsonStart = s.indexOf('{');
  if (jsonStart === -1) return null;
  s = s.slice(jsonStart);

  // Try to parse as-is
  try {
    const obj = JSON.parse(s);
    if (obj.answer && Array.isArray(obj.answer)) return obj.answer;
    return [obj];
  } catch {}

  // JSON might be truncated — try to salvage what we can
  // Find all complete question objects by looking for question_number patterns
  const questions: QuestionItem[] = [];
  const questionRegex = /"question_number"\s*:\s*(\d+)\s*,\s*"question"\s*:\s*"([^"]*(?:\\"[^"]*)*)"/g;
  let match;
  while ((match = questionRegex.exec(s)) !== null) {
    const qNum = parseInt(match[1]);
    const qText = match[2].replace(/\\"/g, '"');

    // Try to extract the answer for this question
    const afterMatch = s.slice(match.index);
    const answerMatch = afterMatch.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const whyMatch = afterMatch.match(/"why_correct"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const mistakeMatch = afterMatch.match(/"common_mistake"\s*:\s*"((?:[^"\\]|\\.)*)"/);

    questions.push({
      question_number: qNum,
      question: qText,
      answer: answerMatch ? answerMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : undefined,
      why_correct: whyMatch ? whyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : undefined,
      common_mistake: mistakeMatch ? mistakeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : undefined,
    });
  }

  // Also extract section headers
  const sectionRegex = /"section"\s*:\s*"([^"]*)"/g;
  const sections: QuestionItem[] = [];
  while ((match = sectionRegex.exec(s)) !== null) {
    const descMatch = s.slice(match.index).match(/"description"\s*:\s*"([^"]*)"/)
      || s.slice(match.index).match(/"note"\s*:\s*"([^"]*)"/)
    sections.push({ section: match[1], note: descMatch ? descMatch[1] : undefined });
  }

  if (questions.length > 0) {
    // Deduplicate sections (keep first occurrence)
    const seen = new Set<string>();
    const uniqueSections = sections.filter(s => {
      if (s.section && !seen.has(s.section)) { seen.add(s.section); return true; }
      return false;
    });
    return [...uniqueSections, ...questions];
  }

  return null;
}

function stripMarkdownFences(text: string): string {
  let s = text.trim();
  if (s.startsWith('```json')) s = s.slice(7);
  else if (s.startsWith('```')) s = s.slice(3);
  if (s.endsWith('```')) s = s.slice(0, -3);
  return s.trim();
}

function flattenSections(sections: any[]): QuestionItem[] {
  const items: QuestionItem[] = [];
  for (const section of sections) {
    // Section header
    if (section.section) {
      items.push({ section: section.section, note: section.note });
    }
    // Questions array inside a section
    if (section.questions && Array.isArray(section.questions)) {
      for (const q of section.questions) {
        items.push({
          question_number: parseInt(q.number?.replace(/\D/g, '') || '0') || undefined,
          question: q.question,
          answer: q.answer,
          why_correct: q.why_correct,
          common_mistake: q.common_mistake,
        });
      }
    }
    // Coding challenges inside a section
    if (section.challenges && Array.isArray(section.challenges)) {
      for (const c of section.challenges) {
        items.push({
          question_number: undefined,
          question: `[${c.difficulty}] ${c.problem_title}`,
          answer: c.problem_statement + (c.python_solution ? '\n\nSolution:\n' + c.python_solution.replace(/\\n/g, '\n') : ''),
          why_correct: c.best_practices?.join('; '),
          common_mistake: c.edge_cases?.join('; '),
        });
      }
    }
    // Direct question item (flat format)
    if (section.question_number || section.question) {
      items.push(section);
    }
    // Skill summary section
    if (section.content && section.section) {
      const content = section.content;
      let note = '';
      if (content.technical_skills) note += 'Skills: ' + content.technical_skills.join(', ');
      if (content.seniority_level) note += '\nLevel: ' + content.seniority_level;
      items.push({ section: section.section, note });
    }
  }
  return items;
}

function QuestionCard({ item, index }: { item: QuestionItem; index: number }) {
  const [expanded, setExpanded] = useState(false);

  if (item.section || item.note) {
    return (
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 p-4">
        {item.section && <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-200">{item.section}</h3>}
        {item.note && <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{item.note}</p>}
      </div>
    );
  }

  if (!item.question) return null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
      >
        <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
          {item.question_number || index}
        </span>
        <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.question}</span>
        {expanded ? <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" /> : <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />}
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
          {item.answer && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Expected Answer</span>
              </div>
              <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed bg-emerald-50 dark:bg-emerald-950/10 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/20">
                {item.answer}
              </div>
            </div>
          )}

          {item.why_correct && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">Why This Is Correct</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-blue-50 dark:bg-blue-950/10 rounded-lg p-3 border border-blue-100 dark:border-blue-900/20">
                {item.why_correct}
              </p>
            </div>
          )}

          {item.common_mistake && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Common Mistakes</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-amber-50 dark:bg-amber-950/10 rounded-lg p-3 border border-amber-100 dark:border-amber-900/20">
                {item.common_mistake}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecruiterBotClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [query, setQuery] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/recruiter/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error('Failed to fetch clients:', e);
    } finally {
      setClientsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !query.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: query.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/recruiter/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          query: userMessage.content,
          systemPrompt: systemPrompt.trim() || undefined
        })
      });

      const data = await res.json();
      const rawResponse = data.response || data.error || 'No response received';
      const { text, questions } = parseResponse(rawResponse);

      const botMessage: Message = {
        role: 'bot',
        content: text || (questions.length > 0 ? `Generated ${questions.filter(q => q.question).length} questions` : rawResponse),
        parsedQuestions: questions.length > 0 ? questions : undefined,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', content: 'Failed to connect to the service.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const quickQueries = [
    'Generate 10 easy interview questions for this JD with answers',
    'Generate 5 hard technical questions for this JD',
    'Summarize the key skills required for this role',
    'What are the must-have vs nice-to-have requirements?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] gap-4">
      {/* Client Selector */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Select Client (with uploaded JD)</label>
            {clientsLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading clients...</div>
            ) : clients.length === 0 ? (
              <p className="text-sm text-zinc-500">No clients found. Create a client first.</p>
            ) : (
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="input-base"
              >
                <option value="">Choose a client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.clientName} — {c.jdRole}</option>
                ))}
              </select>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowPrompt(!showPrompt)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 whitespace-nowrap mt-4"
          >
            {showPrompt ? 'Hide' : 'System Prompt'}
          </button>
        </div>
        {showPrompt && (
          <input
            type="text"
            placeholder="Optional: e.g. You are a Senior Technical Interview Panel specializing in Java"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="input-base text-sm"
          />
        )}
        {selectedClient && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Building2 className="h-3.5 w-3.5" />
            <span>{selectedClient.clientName}</span>
            <span className="text-zinc-300 dark:text-zinc-600">•</span>
            <span>{selectedClient.jdRole}</span>
            {selectedClient.jdFileName ? (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                <span className="text-emerald-600">📄 {selectedClient.jdFileName}</span>
              </>
            ) : (
              <>
                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                <span className="text-amber-600 dark:text-amber-400">No JD file uploaded. Upload one via Client Management to use the bot.</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h3 className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">JD Assistant</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 max-w-md">
                Select a client and ask questions about their job description. Generate interview questions, summarize requirements, and more.
              </p>
              {selectedClientId && selectedClient?.docId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {quickQueries.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuery(q)}
                      className="text-left text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'bot' && (
                    <div className="shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
                    {msg.role === 'user' ? (
                      <div className="rounded-xl px-4 py-2.5 text-sm bg-blue-600 text-white">
                        {msg.content}
                      </div>
                    ) : msg.parsedQuestions && msg.parsedQuestions.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{msg.content}</p>
                        {msg.parsedQuestions.map((q, qi) => (
                          <QuestionCard key={qi} item={q} index={qi} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {msg.content}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="shrink-0 w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                      <User className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={!selectedClientId ? "Select a client first" : !selectedClient?.docId ? "Upload a JD file for this client first" : "Ask about the JD..."}
              disabled={!selectedClientId || !selectedClient?.docId || loading}
              className="input-base flex-1"
            />
            <button
              type="submit"
              disabled={!selectedClientId || !selectedClient?.docId || !query.trim() || loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
