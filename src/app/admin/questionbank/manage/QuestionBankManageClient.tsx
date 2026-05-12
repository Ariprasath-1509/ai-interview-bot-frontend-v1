"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Question {
  id: string;
  text: string;
  category: string;
  occurrenceCount: number;
  tags: string[];
  askedByCompanies: string[];
  relevancyLabel: string | null;
}

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  interviewType?: string;
}

const ROUNDS = ["L1", "L2", "L3", "L4", "HR"];
const IMPORTANCE = ["CRITICAL", "HIGH", "MODERATE", "LOW"];
const INTERVIEW_TYPES = ["backend", "frontend", "fullstack"];

export default function QuestionBankManageClient() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [category, setCategory] = useState("");
  const [importance, setImportance] = useState("");

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Data for dropdowns
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Edit state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch dropdown data
  useEffect(() => {
    Promise.all([
      fetch("/api/questionbank/companies").then(r => r.json()),
      fetch("/api/questionbank/categories").then(r => r.json()),
    ]).then(([compData, catData]) => {
      if (compData.success) setCompanies(compData.data);
      if (catData.success) setCategories(catData.data);
    }).catch(console.error);
  }, []);

  const searchQuestions = (pageNum = 0) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (interviewType) params.set("interviewType", interviewType);
    if (category) params.set("category", category);
    if (company) params.set("company", company);
    if (round) params.set("round", round);
    if (importance) params.set("importance", importance);
    params.set("page", String(pageNum));
    params.set("size", "20");

    fetch(`/api/questionbank/questions?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setQuestions(data.data.content);
          setTotalPages(data.data.page.totalPages);
          setTotalElements(data.data.page.totalElements);
          setPage(pageNum);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    searchQuestions(0);
  }, []);

  const clearFilters = () => {
    setSearch("");
    setInterviewType("");
    setCompany("");
    setRound("");
    setCategory("");
    setImportance("");
    searchQuestions(0);
  };

  const hasActiveFilters = search || interviewType || company || round || category || importance;

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setEditText(question.text);
    setEditCategory(question.category);
    setEditTags(question.tags.join(", "));
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingQuestion(null);
        searchQuestions(page);
      } else {
        alert(data.message || "Failed to update question");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update question");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question? This action is irreversible.")) return;
    try {
      const res = await fetch(`/api/questionbank/questions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        searchQuestions(page);
      } else {
        alert(data.message || "Failed to delete question");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete question");
    }
  };

  const getRelevancyColor = (label: string | null) => {
    if (!label) return "bg-muted";
    switch (label) {
      case "CRITICAL": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "HIGH": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
      case "MODERATE": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "LOW": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-muted";
    }
  };

  // Filter categories based on interview type
  const filteredCategories = interviewType === "fullstack"
    ? categories
    : interviewType
      ? categories.filter(c => c.interviewType === interviewType || c.interviewType === "shared")
      : categories;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Question Management</h2>
        <p className="text-sm text-muted-foreground">{totalElements} total records</p>
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
              onKeyDown={(e) => e.key === "Enter" && searchQuestions(0)}
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
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="-- Select --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {INTERVIEW_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Company</label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
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
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {ROUNDS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
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
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {IMPORTANCE.map(i => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => searchQuestions(0)} className="w-full">Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
          {questions.map((q) => (
            <Card key={q.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{q.text}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="text-xs px-2 py-1 rounded bg-muted">{q.category}</span>
                      {q.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-1 rounded bg-muted">#{tag}</span>
                      ))}
                      {q.relevancyLabel && (
                        <span className={`text-xs px-2 py-1 rounded ${getRelevancyColor(q.relevancyLabel)}`}>
                          {q.relevancyLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Asked by: {q.askedByCompanies.join(", ") || "None"}
                    </p>
                  </div>
                  <div className="flex gap-2">
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
          <Button variant="outline" size="sm" onClick={() => searchQuestions(page - 1)} disabled={page === 0}>
            Previous
          </Button>
          <span className="px-3 py-2 text-sm">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => searchQuestions(page + 1)} disabled={page >= totalPages - 1}>
            Next
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Question Text</label>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={filteredCategories.some(c => c.name === editCategory) ? editCategory : ""} onValueChange={setEditCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
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
            <div className="flex justify-end gap-2 pt-4">
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