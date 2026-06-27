"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/Toast";
import { INTERVIEW_TYPE_COLORS } from "@/lib/questionbank-constants";

interface Category {
  id: string;
  name: string;
  interviewType?: string;
  questionCount: number;
  createdAt: string;
}


export default function QuestionBankCategoriesClient() {
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newInterviewType, setNewInterviewType] = useState("shared");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInterviewType, setEditInterviewType] = useState("shared");

  const fetchCategories = () => {
    fetch("/api/questionbank/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCategories(data.data);
        else toast(data.message || "Failed to load categories", "error");
      })
      .catch(() => toast("Failed to load categories", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async () => {
    if (!newCategory.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/questionbank/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory, interviewType: newInterviewType }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCategory("");
        fetchCategories();
        toast("Category created", "success");
      } else {
        toast(data.message || "Failed to create category", "error");
      }
    } catch {
      toast("Failed to create category", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditInterviewType(cat.interviewType || "shared");
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/questionbank/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, interviewType: editInterviewType }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        fetchCategories();
        toast("Category updated", "success");
      } else {
        toast(data.message || "Failed to update category", "error");
      }
    } catch {
      toast("Failed to update category", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, questionCount: number) => {
    const ok = await confirm({
      title: "Delete category?",
      message: questionCount > 0
        ? `This category has ${questionCount} question${questionCount !== 1 ? "s" : ""}. They will become uncategorized. This action cannot be undone.`
        : "This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/questionbank/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
        toast("Category deleted", "success");
      } else {
        toast(data.message || "Failed to delete category", "error");
      }
    } catch {
      toast("Failed to delete category", "error");
    }
  };

  const getTypeColor = (type: string) => INTERVIEW_TYPE_COLORS[type] || INTERVIEW_TYPE_COLORS.shared;

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category name"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Select value={newInterviewType} onValueChange={setNewInterviewType}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backend">Backend</SelectItem>
                <SelectItem value="frontend">Frontend</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleCreate}
              disabled={saving || !newCategory.trim()}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No categories found</p>
            <p className="text-sm text-muted-foreground">Create your first category above</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-4">
                {editingId === cat.id ? (
                  <div className="space-y-3">
                    <Input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="font-medium"
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(cat.id)}
                    />
                    <Select value={editInterviewType} onValueChange={setEditInterviewType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="backend">Backend</SelectItem>
                        <SelectItem value="frontend">Frontend</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(cat.id)} disabled={saving} className="flex-1">
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-lg">{cat.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(cat.interviewType || "shared")}`}>
                          {cat.interviewType || "shared"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {cat.questionCount} question{cat.questionCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(cat.id, cat.questionCount)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
