"use client";

import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle, Loader2, ArrowLeft, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ParsedQuestion {
  existingQuestionId: string | null;
  text: string;
  category: string;
  tags: string[];
}

interface ParsedSession {
  candidateName: string;
  companyName: string;
  round: string;
  date: string;
  interviewerName?: string;
  candidateId?: string | null;
  questions: ParsedQuestion[];
}

interface Category {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

type Step = "INPUT" | "PREVIEW" | "SUCCESS";

export default function QuestionBankQuestionsClient() {
  const [rawText, setRawText] = useState("");
  const [step, setStep] = useState<Step>("INPUT");
  const [sessions, setSessions] = useState<ParsedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [commitResult, setCommitResult] = useState<{ savedQuestions: number; linkedQuestions: number; newSessions: number; newTags: number } | null>(null);

  // Data for dropdowns
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newCompany, setNewCompany] = useState("");

  // Fetch data for dropdowns
  useEffect(() => {
    Promise.all([
      fetch("/api/questionbank/categories").then(r => r.json()),
      fetch("/api/questionbank/companies").then(r => r.json()),
      fetch("/api/questionbank/admin/users").then(r => r.json()),
    ]).then(([catData, compData, userData]) => {
      if (catData.success) setCategories(catData.data);
      if (compData.success) setCompanies(compData.data);
      if (userData.success) setUsers(userData.data);
    }).catch(console.error);
  }, []);

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/questionbank/digest/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Parse failed");
      // Map backend response to frontend structure
      const mappedSessions = (data.data.sessions || []).map((s: any) => ({
        candidateName: s.candidateName || "Unknown",
        companyName: s.company || s.companyName || "Unknown",
        round: s.round || "L1",
        date: s.date || "",
        interviewerName: s.interviewer || s.interviewerName || "",
        candidateId: null,
        questions: (s.questions || []).map((q: any) => ({
          existingQuestionId: q.existingMatch?.id || null,
          text: q.text || "",
          category: q.category || "General",
          tags: q.suggestedTags || q.tags || [],
        })),
      }));
      setSessions(mappedSessions);
      setStep("PREVIEW");
    } catch (e: any) {
      setError(e.message ?? "Parse failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!sessions.length) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/questionbank/digest/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Commit failed");
      setCommitResult(data.data);
      setStep("SUCCESS");
    } catch (e: any) {
      setError(e.message ?? "Commit failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRawText("");
    setStep("INPUT");
    setSessions([]);
    setError("");
    setCommitResult(null);
    setNewCompany("");
  };

  const updateSessionMeta = (sIdx: number, field: keyof ParsedSession, value: string) => {
    setSessions(prev => prev.map((s, si) => si !== sIdx ? s : { ...s, [field]: value }));
  };

  const updateQuestion = (sIdx: number, qIdx: number, field: keyof ParsedQuestion, value: string) => {
    setSessions(prev => prev.map((s, si) => si !== sIdx ? s : {
      ...s,
      questions: s.questions.map((q, qi) => qi !== qIdx ? q : { ...q, [field]: value }),
    }));
  };

  const removeQuestion = (sIdx: number, qIdx: number) => {
    setSessions(prev => prev.map((s, si) => si !== sIdx ? s : {
      ...s,
      questions: s.questions.filter((_, qi) => qi !== qIdx),
    }));
  };

  const totalQuestions = sessions.reduce((a, s) => a + s.questions.length, 0);

  // Get company name that exists in the list or custom (case-insensitive)
  const getCompanyValue = (companyName: string | undefined) => {
    if (!companyName) return "";
    const trimmed = companyName.trim();
    const matched = companies.find(c => c.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (matched) return matched.name;
    if (trimmed) return "NEW";
    return "";
  };

  // Handle company selection
  const handleCompanyChange = (sIdx: number, value: string) => {
    if (value === "NEW") {
      updateSessionMeta(sIdx, "companyName", newCompany || "");
    } else {
      updateSessionMeta(sIdx, "companyName", value);
    }
  };

  return (
    <div className="space-y-6">
      {/* STEP 1: INPUT */}
      {step === "INPUT" && (
        <Card>
          <CardHeader>
            <CardTitle>Data Ingestion Module</CardTitle>
            <p className="text-sm text-muted-foreground">Paste raw interview text. AI will parse, tag, and preview before saving.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                className="h-96 font-mono text-sm"
                placeholder="[ PASTE RAW TEXT HERE... ]"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                disabled={loading}
              />
              {loading && (
                <div className="absolute inset-0 bg-background/85 flex flex-col items-center justify-center gap-4 rounded-md">
                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <div className="text-primary font-mono">ANALYZING TEXT...</div>
                  <p className="text-muted-foreground text-sm max-w-md text-center">
                    AI is extracting sessions, questions, categories, and tags from your text. This usually takes 3-10 seconds.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-4 p-4 border border-destructive/30 bg-destructive/10 rounded-md">
                <span className="text-xl">⚠</span>
                <div className="flex-1">
                  <div className="text-destructive font-mono text-sm">PARSE_ERROR</div>
                  <p className="text-destructive/80 text-sm">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setError("")}>Dismiss</Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleParse} disabled={loading || !rawText.trim()} size="lg" className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                PARSE // PREVIEW
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: PREVIEW */}
      {step === "PREVIEW" && (
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-semibold">Review Parsed Data</h2>
              <p className="text-muted-foreground">{sessions.length} session(s) · {totalQuestions} question(s) — edit before committing</p>
            </div>
            <Button variant="outline" onClick={() => setStep("INPUT")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          {sessions.map((session, sIdx) => (
            <Card key={sIdx}>
              <CardHeader>
                <CardTitle className="text-base">Session {sIdx + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Session Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pb-4 border-b">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Link User (Optional)</label>
                    <Select value={session.candidateId || ""} onValueChange={(v) => {
                      updateSessionMeta(sIdx, "candidateId", v);
                      if (v) {
                        const user = users.find(u => u.id === v);
                        if (user) updateSessionMeta(sIdx, "candidateName", user.name);
                      }
                    }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="-- No Link --" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- No Link --</SelectItem>
                        {users.map((u, i) => (
                          <SelectItem key={u.id || i} value={u.id}>{u.name} ({u.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Candidate Name</label>
                    <Input
                      value={session.candidateName || ""}
                      onChange={(e) => updateSessionMeta(sIdx, "candidateName", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Company</label>
                    <Select value={getCompanyValue(session.companyName)} onValueChange={(v) => handleCompanyChange(sIdx, v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="-- Select Company --" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" disabled>-- Select Company --</SelectItem>
                        {companies.map((c, i) => (
                          <SelectItem key={c.id || i} value={c.name}>{c.name}</SelectItem>
                        ))}
                        <SelectItem value="NEW">+ Add New Company...</SelectItem>
                      </SelectContent>
                    </Select>
                    {!companies.some(c => c.name.trim().toLowerCase() === session.companyName?.trim().toLowerCase()) && session.companyName?.trim() && (
                      <Input
                        placeholder="Enter new company name..."
                        value={session.companyName}
                        onChange={(e) => updateSessionMeta(sIdx, "companyName", e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Round</label>
                    <Input
                      value={session.round || ""}
                      onChange={(e) => updateSessionMeta(sIdx, "round", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Date</label>
                    <Input
                      type="date"
                      value={session.date || ""}
                      onChange={(e) => updateSessionMeta(sIdx, "date", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Interviewer</label>
                    <Input
                      value={session.interviewerName || ""}
                      onChange={(e) => updateSessionMeta(sIdx, "interviewerName", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  {session.questions.map((q, qIdx) => (
                    <div key={qIdx} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground font-mono">Q{qIdx + 1}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeQuestion(sIdx, qIdx)} className="text-red-500 h-6">Remove</Button>
                      </div>
                      <Textarea
                        value={q.text}
                        onChange={(e) => updateQuestion(sIdx, qIdx, "text", e.target.value)}
                        rows={2}
                        className="font-body"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Select value={categories.some(c => c.name === q.category) ? q.category : ""} onValueChange={(v) => updateQuestion(sIdx, qIdx, "category", v)}>
                          <SelectTrigger><SelectValue placeholder="Select Category..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Select Category...</SelectItem>
                            {categories.map((c, i) => (
                              <SelectItem key={c.id || i} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={(q.tags || []).join(", ")}
                          onChange={(e) => updateQuestion(sIdx, qIdx, "tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                          placeholder="tags, comma, separated"
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end">
            <Button onClick={handleCommit} disabled={loading} size="lg" className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              SAVE & INGEST
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS */}
      {step === "SUCCESS" && commitResult && (
        <Card>
          <CardContent className="pt-6 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-md font-mono">
              <CheckCircle className="h-5 w-5" />
              BATCH_COMMITTED
            </div>

            <div className="max-w-md mx-auto space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">New questions saved</span>
                <span className="font-mono text-primary font-bold">{commitResult.savedQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Existing questions linked</span>
                <span className="font-mono text-primary font-bold">{commitResult.linkedQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sessions created</span>
                <span className="font-mono text-primary font-bold">{commitResult.newSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tags created</span>
                <span className="font-mono text-primary font-bold">{commitResult.newTags}</span>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button onClick={handleReset}>INGEST MORE</Button>
              <Button variant="outline" onClick={() => window.location.href = "/admin/questionbank/manage"}>
                VIEW QUESTIONS
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}