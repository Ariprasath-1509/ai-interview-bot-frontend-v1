"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ListTree,
  Info,
  Sparkles,
  ShieldAlert,
  Eye,
  Hash,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOOKUP_CATEGORIES, type LookupCategoryKey } from "@/config/masterDataConfig";
import {
  MasterDataEmptyState,
  MasterDataLoading,
} from "@/components/admin/master-data/MasterDataUi";

interface LookupEntry {
  id: string;
  category: string;
  code: string;
  label: string;
  displayOrder: number;
  active: boolean;
  metadata?: Record<string, unknown> | null;
}

export default function MasterDataLookupsClient({ canEdit }: { canEdit: boolean }) {
  const searchParams = useSearchParams();
  const initialCategory =
    (searchParams.get("category") as LookupCategoryKey) || "SKILL_SET";

  const [activeCategory, setActiveCategory] = useState<LookupCategoryKey>(initialCategory);
  const [entries, setEntries] = useState<LookupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newOrder, setNewOrder] = useState("0");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editOrder, setEditOrder] = useState("0");

  const categoryMeta = useMemo(
    () => LOOKUP_CATEGORIES.find((c) => c.key === activeCategory),
    [activeCategory]
  );

  const fetchEntries = useCallback(() => {
    setLoading(true);
    fetch(
      `/api/admin/master-data/lookups/${activeCategory}?includeInactive=${showInactive}`
    )
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setEntries(json.data);
        else setEntries([]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeCategory, showInactive]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    const fromUrl = searchParams.get("category") as LookupCategoryKey | null;
    if (fromUrl && LOOKUP_CATEGORIES.some((c) => c.key === fromUrl)) {
      setActiveCategory(fromUrl);
    }
  }, [searchParams]);

  const handleCreate = async () => {
    if (!newCode.trim() || !newLabel.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/master-data/lookups/${activeCategory}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim(),
          label: newLabel.trim(),
          displayOrder: parseInt(newOrder, 10) || 0,
          active: true,
        }),
      });
      const json = await res.json();
      if (json.success || json.ok || json.data?.ok) {
        setNewCode("");
        setNewLabel("");
        setNewOrder("0");
        fetchEntries();
      } else {
        alert(json.message || json.error || "Failed to create entry");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entry: LookupEntry) => {
    setEditingId(entry.id);
    setEditLabel(entry.label);
    setEditOrder(String(entry.displayOrder));
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/master-data/lookups/${activeCategory}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel.trim(),
          displayOrder: parseInt(editOrder, 10) || 0,
        }),
      });
      const json = await res.json();
      if (json.success || json.ok || json.data?.ok) {
        setEditingId(null);
        fetchEntries();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string, code: string) => {
    if (!confirm(`Deactivate "${code}"? Existing records keep this value.`)) return;
    try {
      const res = await fetch(`/api/admin/master-data/lookups/${activeCategory}/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.ok || json.success) fetchEntries();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Category Pills Bar */}
      <div className="panel-card p-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {LOOKUP_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "border border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-2xs ring-1 ring-purple-500/30"
                    : "border border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Tag className={`h-3.5 w-3.5 ${isActive ? "text-purple-600 dark:text-purple-400" : "opacity-60"}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Category Description Banner */}
      {categoryMeta && (
        <div className="flex items-start gap-3 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-4 text-xs sm:text-sm font-medium text-[var(--text-primary)] shadow-2xs backdrop-blur-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Info className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="font-bold text-sm text-[var(--text-primary)]">{categoryMeta.label} Configuration</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-relaxed">{categoryMeta.description}</p>
          </div>
        </div>
      )}

      {/* Add New Entry Form Card */}
      {canEdit && (
        <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-purple-300/30">
          <div className="panel-header panel-header-accent-purple flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
              <Plus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Add New {categoryMeta?.label ?? "Entry"}
            </h3>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              New enum key-value mapping
            </span>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <Input
                  placeholder="Code (e.g. NODE_JS)"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 font-mono text-xs"
                />
              </div>
              <div className="relative min-w-[200px] flex-1">
                <Input
                  placeholder="Display label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 text-xs font-medium"
                />
              </div>
              <div className="relative w-24">
                <Input
                  placeholder="Order"
                  type="number"
                  value={newOrder}
                  onChange={(e) => setNewOrder(e.target.value)}
                  className="rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] focus:border-purple-500 focus:ring-purple-500/20 text-xs font-medium"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={saving || !newCode.trim() || !newLabel.trim()}
                className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Add Entry
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Entries List Card */}
      <div className="panel-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-all duration-200 hover:border-indigo-300/30">
        <div className="panel-header panel-header-accent-indigo flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListTree className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {categoryMeta?.label ?? "Entries"} List
            </h3>
            {!loading && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                {entries.length} records
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] shadow-2xs hover:text-[var(--text-primary)] transition-colors">
              <Eye className="h-3.5 w-3.5 text-indigo-500" />
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded accent-purple-600"
              />
              Show inactive
            </label>

            {!canEdit && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <ShieldAlert className="h-3.5 w-3.5" />
                Read-only mode
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <MasterDataLoading label={`Loading ${categoryMeta?.label ?? "entries"}...`} />
          ) : entries.length === 0 ? (
            <MasterDataEmptyState
              icon={ListTree}
              title="No entries found"
              description={
                canEdit
                  ? "Add your first lookup value using the form above."
                  : "No values exist for this category yet."
              }
            />
          ) : (
            <div className="overflow-x-auto w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="h-11 border-b border-[var(--border)] bg-[#F1F5F9] dark:bg-zinc-800 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    <th className="px-4 py-2.5">Code</th>
                    <th className="px-4 py-2.5">Label</th>
                    <th className="px-4 py-2.5">Order</th>
                    <th className="px-4 py-2.5">Status</th>
                    {canEdit && <th className="px-4 py-2.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="h-13 transition-colors duration-150 hover:bg-[#F5F3FF] dark:hover:bg-[#1C1827]"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-block font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                          {entry.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                        {editingId === entry.id ? (
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-8 rounded-lg border-[var(--border)] bg-[var(--surface)] text-xs font-medium"
                          />
                        ) : (
                          entry.label
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === entry.id ? (
                          <Input
                            type="number"
                            value={editOrder}
                            onChange={(e) => setEditOrder(e.target.value)}
                            className="h-8 w-20 rounded-lg border-[var(--border)] bg-[var(--surface)] text-xs font-medium"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-subtle)] border border-[var(--border)] px-2 py-0.5 text-xs font-mono font-semibold text-[var(--text-secondary)]">
                            <Hash className="h-3 w-3 text-indigo-500" />
                            {entry.displayOrder}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                            entry.active
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              entry.active ? "bg-emerald-500" : "bg-zinc-400"
                            }`}
                          />
                          {entry.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          {editingId === entry.id ? (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 rounded-lg border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                                onClick={() => handleUpdate(entry.id)}
                                disabled={saving}
                              >
                                {saving ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 rounded-lg border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 hover:scale-105 transition-all"
                                onClick={() => startEdit(entry)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {entry.active && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 rounded-lg border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 hover:scale-105 transition-all"
                                  onClick={() => handleDeactivate(entry.id, entry.code)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
