"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Check, X, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOOKUP_CATEGORIES, type LookupCategoryKey } from "@/config/masterDataConfig";
import {
  MasterDataEmptyState,
  MasterDataFormCard,
  MasterDataListCard,
  MasterDataLoading,
  STATUS_BADGE,
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
    <div className="space-y-6 animate-in">
      <div className="tab-bar flex-wrap">
        {LOOKUP_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            className={
              activeCategory === cat.key ? "tab-bar-item tab-bar-item-active" : "tab-bar-item"
            }
          >
            {cat.label}
          </button>
        ))}
      </div>

      {categoryMeta && (
        <p className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
          {categoryMeta.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          Show inactive
        </label>
        {!canEdit && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Read-only — Admin or Super Admin required to edit
          </span>
        )}
      </div>

      {canEdit && (
        <MasterDataFormCard title={`Add ${categoryMeta?.label ?? "entry"}`} icon={Plus}>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Code (e.g. NODE_JS)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              className="max-w-[180px]"
            />
            <Input
              placeholder="Display label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="max-w-[220px]"
            />
            <Input
              placeholder="Order"
              type="number"
              value={newOrder}
              onChange={(e) => setNewOrder(e.target.value)}
              className="max-w-[80px]"
            />
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add entry"}
            </Button>
          </div>
        </MasterDataFormCard>
      )}

      <MasterDataListCard
        title={categoryMeta?.label ?? "Entries"}
        icon={ListTree}
        count={loading ? undefined : entries.length}
        empty={
          <MasterDataEmptyState
            icon={ListTree}
            title="No entries found"
            description={
              canEdit
                ? "Add your first lookup value using the form above."
                : "No values exist for this category yet."
            }
          />
        }
      >
        {loading ? (
          <MasterDataLoading />
        ) : entries.length === 0 ? null : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="master-data-table w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Label</th>
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  {canEdit && <th className="px-5 py-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-3 font-mono text-xs text-blue-700 dark:text-blue-300">
                      {entry.code}
                    </td>
                    <td className="px-5 py-3">
                      {editingId === entry.id ? (
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        entry.label
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {editingId === entry.id ? (
                        <Input
                          type="number"
                          value={editOrder}
                          onChange={(e) => setEditOrder(e.target.value)}
                          className="h-8 w-20"
                        />
                      ) : (
                        entry.displayOrder
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`badge-pill ${
                          entry.active ? STATUS_BADGE.active : STATUS_BADGE.inactive
                        }`}
                      >
                        {entry.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        {editingId === entry.id ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleUpdate(entry.id)}>
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => startEdit(entry)}>
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            {entry.active && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-red-700"
                                onClick={() => handleDeactivate(entry.id, entry.code)}
                              >
                                <Trash2 className="h-4 w-4" />
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
      </MasterDataListCard>
    </div>
  );
}
