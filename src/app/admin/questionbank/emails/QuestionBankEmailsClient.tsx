"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Send, Mail, Search, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface Question {
  id: string;
  text: string;
  category: string;
}

interface PageResponse<T> {
  content: T[];
  page: {
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
  };
}

interface EmailLog {
  id: string;
  sentBy: string | null;
  subject: string;
  recipientCount: number;
  recipientEmails: string[];
  filters: Record<string, string> | null;
  sentAt: string;
}

const ROUNDS = ["L1", "L2", "L3", "L4", "HR"];
const ROUND_LABELS: Record<string, string> = {
  L1: "L1 - Technical",
  L2: "L2 - Technical",
  L3: "L3 - Manager",
  L4: "L4 - Director",
  HR: "HR Round",
};

export default function QuestionBankEmailsClient() {
  // Recipients
  const [candidates, setCandidates] = useState<UserProfile[]>([]);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());

  // Filters
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsCount, setQuestionsCount] = useState(0);

  // Message
  const [message, setMessage] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewerName, setInterviewerName] = useState("");

  // State
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial data fetch
  useEffect(() => {
    Promise.all([
      fetch("/api/questionbank/admin/users").then(r => r.json()),
      fetch("/api/questionbank/companies").then(r => r.json()),
      fetch("/api/questionbank/admin/email/logs?size=20").then(r => r.json()),
    ]).then(([usersData, companiesData, logsData]) => {
      if (usersData.success) setCandidates(usersData.data);
      if (companiesData.success) setCompanies(companiesData.data);
      if (logsData.success) setLogs(logsData.data.content);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  // Fetch questions when filters change
  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (company) params.set("company", company);
      if (round) params.set("round", round);
      params.set("size", "50");
      params.set("page", "0");

      const res = await fetch(`/api/questionbank/questions?${params}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data.content);
        setQuestionsCount(data.data.page.totalElements);
      }
    } catch {
      //
    } finally {
      setQuestionsLoading(false);
    }
  }, [company, round]);

  useEffect(() => {
    const t = setTimeout(() => fetchQuestions(), 400);
    return () => clearTimeout(t);
  }, [fetchQuestions]);

  const handleToggleCandidate = (id: string) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedCandidates.size === 0) { setStatus("ERR: Candidate unselected."); return; }
    if (questionsCount === 0) { setStatus("ERR: No questions to send."); return; }

    setSending(true);
    setStatus("TRANSMITTING...");
    try {
      const selectedList = candidates.filter(c => selectedCandidates.has(c.id));
      const recipients = selectedList.map(c => ({
        email: c.email,
        name: c.name,
        company: company || "ALL COMPANIES",
        round: round || "ALL ROUNDS",
        date: interviewDate || new Date().toISOString().split('T')[0]
      }));

      const filters = { company, round };

      const res = await fetch("/api/questionbank/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients, filters }),
      });
      const data = await res.json();

      if (data.success) {
        const result = data.data;
        if (result.errors && result.errors.length > 0) {
          setStatus(`PARTIAL: ${result.emailsSent} sent. ${result.errors.length} errors.`);
        } else {
          setStatus(`SUCCESS: Package delivered to ${result.emailsSent} applicant(s).`);
        }
        // Refresh logs
        fetch("/api/questionbank/admin/email/logs?size=20")
          .then(r => r.json())
          .then(d => { if (d.success) setLogs(d.data.content); });
      } else {
        setStatus(`ERROR: ${data.message}`);
      }

      // Reset
      setSelectedCandidates(new Set());
      setRecipientQuery("");
      setCompany("");
      setRound("");
      setMessage("");
      setInterviewDate("");
      setInterviewerName("");
    } catch {
      setStatus("ERROR: Subsystem fault.");
    } finally {
      setSending(false);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const nameMatch = c.name ? c.name.toLowerCase().includes(recipientQuery.toLowerCase()) : false;
    const emailMatch = c.email ? c.email.toLowerCase().includes(recipientQuery.toLowerCase()) : false;
    return nameMatch || emailMatch;
  });

  const companyName = company ? companies.find(c => c.slug === company)?.name : "ALL COMPANIES";
  const roundName = round ? ROUND_LABELS[round] : "ALL ROUNDS";

  const defaultMessage = `This is an automated email regarding your upcoming ${roundName !== "ALL ROUNDS" ? ROUND_LABELS[round] : "interview"} round at ${companyName !== "ALL COMPANIES" ? companyName : "[Company]"}. Please review the attached questions and prepare well. Best of luck!`;
  const actualMessage = message.trim() ? message : defaultMessage;

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
            Select Recipient(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search candidate by name or email..."
              value={recipientQuery}
              onChange={(e) => setRecipientQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="max-h-48 overflow-y-auto border rounded-lg">
            {filteredCandidates.length === 0 ? (
              <p className="p-4 text-center text-muted-foreground text-sm">NO CANDIDATES MATCHING QUERY.</p>
            ) : (
              filteredCandidates.map(c => {
                const isSelected = selectedCandidates.has(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggleCandidate(c.id)}
                    className={`flex items-center justify-between p-3 border-b cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground text-sm ml-2">{c.email}</span>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Selected candidates: <span className="text-primary font-medium">{selectedCandidates.size}</span>
            {selectedCandidates.size > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {Array.from(selectedCandidates).map(id => candidates.find(c => c.id === id)?.name).filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Target Payload Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
            Target Payload Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Select the required criteria. The module will automatically queue all queries matching the specified boundaries.
          </p>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Company</label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="ALL COMPANIES" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">ALL COMPANIES</SelectItem>
                  {companies.filter(c => c.slug).map((c, idx) => (
                    <SelectItem key={c.slug || `company-${idx}`} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Round</label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="ALL ROUNDS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">ALL ROUNDS</SelectItem>
                  {ROUNDS.map((r, idx) => (
                    <SelectItem key={r || `round-${idx}`} value={r}>{ROUND_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Message Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">3</span>
            Message Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Interview Date</label>
              <Input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Interviewer Name</label>
              <Input
                type="text"
                placeholder="e.g. John Doe, Cyber Division"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Transmission Message</label>
            <Textarea
              rows={4}
              placeholder={defaultMessage}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Pre-flight Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">4</span>
            Pre-flight Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
            <h3 className="font-medium mb-3">Transmission Summary</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Recipients:</span>
                <span className="ml-2 text-primary font-medium">
                  {selectedCandidates.size === 0 ? "None Selected" : `${selectedCandidates.size} Candidate(s)`}
                </span>
                {selectedCandidates.size > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {Array.from(selectedCandidates).map(id => candidates.find(c => c.id === id)?.name).join(", ")}
                  </div>
                )}
              </div>

              <div>
                <span className="text-muted-foreground">Filter Target:</span>
                <span className="ml-2 text-primary font-medium">{companyName} — {roundName}</span>
              </div>

              <div>
                <span className="text-muted-foreground">Meta Overlay:</span>
                <div className="text-primary text-sm">
                  Date: {interviewDate || "Today"} | Interviewer: {interviewerName || "Unknown"}
                  {actualMessage && (
                    <div className="text-muted-foreground italic mt-1 text-xs">
                      "{actualMessage.length > 60 ? actualMessage.substring(0, 60) + "..." : actualMessage}"
                    </div>
                  )}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Payload Size:</span>
                <span className="ml-2 text-primary font-medium">
                  {questionsLoading ? "CALCULATING..." : `${questionsCount} questions attached`}
                </span>
              </div>
            </div>

            {/* Question Preview */}
            {!questionsLoading && questionsCount > 0 && (
              <div className="mt-4 p-3 bg-background border border-dashed rounded">
                <p className="text-xs text-muted-foreground mb-2">Payload Sample Data</p>
                {questions.slice(0, 5).map(q => (
                  <div key={q.id} className="text-xs text-muted-foreground truncate">
                    {q.text}
                  </div>
                ))}
                {questionsCount > 5 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    ...and {questionsCount - 5} more elements locked in payload.
                  </div>
                )}
              </div>
            )}

            {!questionsLoading && questionsCount === 0 && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded text-red-600 dark:text-red-400 text-sm">
                NO DATA MATCHING CURRENT FILTERS. TRANSMISSION ABORTED.
              </div>
            )}
          </div>

          {/* Status & Send Button */}
          <div className="flex justify-between items-center">
            <span className={`text-sm ${status.includes("ERR") ? "text-red-500" : "text-primary"}`}>
              {status}
            </span>
            <Button
              onClick={handleSend}
              disabled={sending || selectedCandidates.size === 0 || questionsCount === 0}
              className="gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "TRANSMITTING..." : "EXECUTE SEND"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs */}
      {logs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No emails sent yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {logs.length} Email Batch{logs.length !== 1 ? "es" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Subject</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Recipients</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Sent By</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.filter(l => l.id).map((log, idx) => (
                    <tr key={log.id || `log-${idx}`} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{log.subject}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm">{log.recipientCount} recipient{log.recipientCount !== 1 ? "s" : ""}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">{log.sentBy || "-"}</td>
                      <td className="p-3 text-muted-foreground text-sm">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}