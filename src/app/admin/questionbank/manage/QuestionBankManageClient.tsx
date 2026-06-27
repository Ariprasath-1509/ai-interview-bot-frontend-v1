"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2, Pencil, Trash2, X, Plus, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";
import {
  QB_ROUNDS,
  QB_IMPORTANCE,
  QB_INTERVIEW_TYPES,
  IMPORTANCE_COLORS,
  RELEVANCY_OPTIONS,
} from "@/lib/questionbank-constants";

interface Question {
  id: string;
  text: string;
  category: string;
  occurrenceCount: number;
  tags: string[];
  askedByCompanies: string[];
  relevancyLabel: string | null;
}

interface Company { id: string; name: string; slug: string; }
interface Category { id: string; name: string; interviewType?: string; }

export default function QuestionBankManageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm } = useConfirm();
  const { toast } = useToast();

  // Read initial state from URL
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [interviewType, setInterviewType] = useState(searchParams.get("interviewType") ?? "");
  const [company, setCompany] = useState(searchParams.get("company") ?? "");
  const [round, setRound] = useState(searchParams.get("round") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [importance, setImportance] = useState(searchParams.get("importance") ?? "");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "0"));

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Selection for bulk delete
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Edit state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editRelevancy, setEditRelevancy] = useState("NONE");
  const [saving, setSaving] = useState(false);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createText, setCreateText] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createTags, setCreateTags] = useState("");
  const [createRelevancy, setCreateRelevancy] = useState("NONE");
  const [creating, setCreating] = useState(false);

  const [exporting, setExporting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/questionbank/companies").then(r => r.json()),
      fetch("/api/questionbank/categories").then(r => r.json()),
    ]).then(([compData, catData]) => {
      if (compData.success) setCompanies(compData.data);
      if (catData.success) setCategories(catData.data);
    }).catch(() => toast("Failed to load filter data", "error"));
  }, []);

  const pushUrl = useCallback((overrides: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const state = { search, interviewType, company, round, category, importance, page, ...overrides };
    if (state.search) params.set("search", String(state.search));
    if (state.interviewType) params.set("interviewType", String(state.interviewType));
    if (state.company) params.set("company", String(state.company));
    if (state.round) params.set("round", String(state.round));
    if (state.category) params.set("category", String(state.category));
    if (state.importance) params.set("importance", String(state.importance));
    if (Number(state.page) > 0) params.set("page", String(state.page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [search, interviewType, company, round, category, importance, page, router]);

  const searchQuestions = useCallback((
    overrides: { pageNum?: number; searchVal?: string; interviewTypeVal?: string; companyVal?: string; roundVal?: string; categoryVal?: string; importanceVal?: string } = {}
  ) => {
    const s = overrides.searchVal ?? search;
    const it = overrides.interviewTypeVal ?? interviewType;
    const co = overrides.companyVal ?? company;
    const ro = overrides.roundVal ?? round;
    const ca = overrides.categoryVal ?? category;
    const im = overrides.importanceVal ?? importance;
    const pg = overrides.pageNum ?? page;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSelected(new Set());

    const params = new URLSearchParams();
    if (s) params.set("search", s);
    if (it) params.set("interviewType", it);
    if (ca) params.set("category", ca);
    if (co) params.set("company", co);
    if (ro) params.set("round", ro);
    if (im) params.set("importance", im);
    params.set("page", String(pg));
    params.set("size", "20");

    pushUrl({ search: s, interviewType: it, company: co, round: ro, category: ca, importance: im, page: pg });

    fetch(`/api/questionbank/questions?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setQuestions(data.data.content);
          setTotalPages(data.data.page.totalPages);
          setTotalElements(data.data.page.totalElements);
          setPage(pg);
        } else {
          toast(data.message || "Failed to load questions", "error");
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") toast("Failed to load questions", "error");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [search, interviewType, company, round, category, importance, page, pushUrl, toast]);

  useEffect(() => {
    searchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setSearch("");
    setInterviewType("");
    setCompany("");
    setRound("");
    setCategory("");
    setImportance("");
    searchQuestions({ pageNum: 0, searchVal: "", interviewTypeVal: "", companyVal: "", roundVal: "", categoryVal: "", importanceVal: "" });
  };

  const hasActiveFilters = search || interviewType || company || round || category || importance;

  // --- Edit ---
  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setEditText(question.text);
    setEditCategory(question.category);
    setEditTags(question.tags.join(", "));
    setEditRelevancy(question.relevancyLabel ?? "NONE");
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/questionbank/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editText,
          category: editCategory,
          tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
          relevancyLabel: editRelevancy === "NONE" ? null : editRelevancy,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingQuestion(null);
        searchQuestions();
        toast("Question updated", "success");
      } else {
        toast(data.message || "Failed to update question", "error");
      }
    } catch {
      toast("Failed to update question", "error");
    } finally {
      setSaving(false);
    }
  };

  // --- Delete single ---
  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete question?",
      message: "This will permanently remove the question from the bank. This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/questionbank/questions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        searchQuestions();
        toast("Question deleted", "success");
      } else {
        toast(data.message || "Failed to delete question", "error");
      }
    } catch {
      toast("Failed to delete question", "error");
    }
  };

  // --- Bulk delete ---
  const handleBulkDelete = async () => {
    const count = selected.size;
    const ok = await confirm({
      title: `Delete ${count} question${count !== 1 ? "s" : ""}?`,
      message: "This will permanently remove the selected questions from the bank. This action cannot be undone.",
      confirmLabel: `Delete ${count}`,
      variant: "danger",
    });
    if (!ok) return;
    setBulkDeleting(true);
    let failed = 0;
    await Promise.all(
      [...selected].map(async (id) => {
        try {
          const res = await fetch(`/api/questionbank/questions/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (!data.success) failed++;
        } catch {
          failed++;
        }
      })
    );
    setBulkDeleting(false);
    if (failed > 0) toast(`${count - failed} deleted, ${failed} failed`, "warning");
    else toast(`${count} question${count !== 1 ? "s" : ""} deleted`, "success");
    searchQuestions();
  };

  // --- Create ---
  const handleCreate = async () => {
    if (!createText.trim() || !createCategory) return;
    setCreating(true);
    try {
      const res = await fetch("/api/questionbank/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: createText.trim(),
          category: createCategory,
          tags: createTags.split(",").map((t) => t.trim()).filter(Boolean),
          relevancyLabel: createRelevancy === "NONE" ? null : createRelevancy,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setCreateText("");
        setCreateCategory("");
        setCreateTags("");
        setCreateRelevancy("NONE");
        searchQuestions({ pageNum: 0 });
        toast("Question created", "success");
      } else {
        toast(data.message || "Failed to create question", "error");
      }
    } catch {
      toast("Failed to create question", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (interviewType) params.set("interviewType", interviewType);
      if (category) params.set("category", category);
      if (company) params.set("company", company);
      if (round) params.set("round", round);
      if (importance) params.set("importance", importance);
      params.set("page", "0");
      params.set("size", "10000");

      const res = await fetch(`/api/questionbank/questions?${params}`);
      const data = await res.json();
      if (!data.success) { toast("Export failed", "error"); return; }

      const rows: Question[] = data.data.content ?? data.data ?? [];
      if (!rows.length) { toast("No questions to export", "warning"); return; }

      let blob: Blob;
      let filename: string;

      if (format === "json") {
        blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
        filename = `questions-${Date.now()}.json`;
      } else {
        const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const header = ["id", "text", "category", "tags", "importance", "occurrenceCount", "askedByCompanies"];
        const csvRows = rows.map(q => [
          escape(q.id),
          escape(q.text),
          escape(q.category),
          escape(q.tags.join("; ")),
          escape(q.relevancyLabel ?? ""),
          String(q.occurrenceCount),
          escape(q.askedByCompanies.join("; ")),
        ].join(","));
        blob = new Blob([[header.join(","), ...csvRows].join("\n")], { type: "text/csv" });
        filename = `questions-${Date.now()}.csv`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exported ${rows.length} questions as ${format.toUpperCase()}`, "success");
    } catch {
      toast("Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === questions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(questions.map(q => q.id)));
    }
  };

  const filteredCategories = interviewType === "fullstack"
    ? categories
    : interviewType
      ? categories.filter(c => c.interviewType === interviewType || c.interviewType === "shared")
      : categories;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Question Management</h2>
          <p className="text-sm text-muted-foreground">{totalElements} total records</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleExport("csv")}
              disabled={exporting || totalElements === 0}
              className="rounded-none border-r gap-1.5 px-3"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleExport("json")}
              disabled={exporting || totalElements === 0}
              className="rounded-none gap-1.5 px-3"
            >
              JSON
            </Button>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by keyword, company, or tag..."
              className="pl-10"
              onKeyDown={(e) => e.key === "Enter" && searchQuestions({ pageNum: 0, searchVal: search })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-muted-foreground font-mono">FILTER CONTROLS</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-primary">
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Interview Type</label>
              <Select value={interviewType} onValueChange={(v) => { setInterviewType(v); setCategory(""); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="-- Select --" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {QB_INTERVIEW_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Company</label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Round</label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {QB_ROUNDS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {filteredCategories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Importance</label>
              <Select value={importance} onValueChange={setImportance}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {QB_IMPORTANCE.map(i => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => searchQuestions({ pageNum: 0 })} className="w-full">Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 rounded-lg border border-primary/30 bg-primary/5">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="text-red-500 hover:text-red-600 border-red-200"
          >
            {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Delete Selected
          </Button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No results found</p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="mt-4">Reset Filters</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Select all row */}
          <div className="flex items-center gap-3 px-1 pb-1">
            <input
              type="checkbox"
              checked={selected.size === questions.length && questions.length > 0}
              ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < questions.length; }}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-muted-foreground cursor-pointer"
            />
            <span className="text-xs text-muted-foreground">Select all on this page</span>
          </div>

          {questions.map((q) => (
            <Card key={q.id} className={selected.has(q.id) ? "border-primary/50 bg-primary/5" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(q.id)}
                    onChange={() => toggleSelect(q.id)}
                    className="mt-1 h-4 w-4 rounded border-muted-foreground cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{q.text}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded bg-muted">{q.category}</span>
                      {q.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-1 rounded bg-muted">#{tag}</span>
                      ))}
                      {q.relevancyLabel && (
                        <span className={`text-xs px-2 py-1 rounded ${IMPORTANCE_COLORS[q.relevancyLabel] ?? "bg-muted"}`}>
                          {q.relevancyLabel}
                        </span>
                      )}
                      {q.occurrenceCount > 1 && (
                        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">×{q.occurrenceCount}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Asked by: {q.askedByCompanies.join(", ") || "None"}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(q)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(q.id)} className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => searchQuestions({ pageNum: page - 1 })} disabled={page === 0}>
            Previous
          </Button>
          <span className="px-3 py-2 text-sm">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => searchQuestions({ pageNum: page + 1 })} disabled={page >= totalPages - 1}>
            Next
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && setShowCreate(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Question Text *</label>
              <Textarea
                value={createText}
                onChange={(e) => setCreateText(e.target.value)}
                className="mt-1"
                rows={4}
                placeholder="Enter the interview question..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category *</label>
              <Select value={createCategory} onValueChange={setCreateCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Importance</label>
              <Select value={createRelevancy} onValueChange={setCreateRelevancy}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELEVANCY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={createTags}
                onChange={(e) => setCreateTags(e.target.value)}
                className="mt-1"
                placeholder="e.g., array, dynamic programming, hard"
              />
              {createTags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {createTags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                    <span key={t} className="text-xs px-2 py-1 rounded bg-muted">#{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !createText.trim() || !createCategory}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Question</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Question Text</label>
              <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="mt-1" rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={categories.some(c => c.name === editCategory) ? editCategory : ""} onValueChange={setEditCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Importance</label>
              <Select value={editRelevancy} onValueChange={setEditRelevancy}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELEVANCY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="mt-1"
                placeholder="e.g., array, dynamic programming, hard"
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {editTags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded bg-muted">#{t}</span>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingQuestion(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving || !editText.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
