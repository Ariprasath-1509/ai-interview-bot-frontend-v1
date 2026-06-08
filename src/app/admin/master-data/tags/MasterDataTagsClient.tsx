"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MasterDataEmptyState,
  MasterDataFormCard,
  MasterDataListCard,
  MasterDataLoading,
} from "@/components/admin/master-data/MasterDataUi";

interface TagItem {
  id: string;
  name: string;
}

export default function MasterDataTagsClient() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchTags = () => {
    fetch("/api/admin/master-data/tags")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTags(data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreate = async () => {
    if (!newTag.trim()) return;
    const res = await fetch("/api/admin/master-data/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTag }),
    });
    const data = await res.json();
    if (data.success) {
      setNewTag("");
      fetchTags();
    }
  };

  const handleUpdate = async (id: string) => {
    const res = await fetch(`/api/admin/master-data/tags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    const data = await res.json();
    if (data.success) {
      setEditingId(null);
      fetchTags();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tag?")) return;
    const res = await fetch(`/api/admin/master-data/tags/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchTags();
  };

  if (loading) {
    return <MasterDataLoading label="Loading tags..." />;
  }

  return (
    <div className="space-y-6 animate-in">
      <MasterDataFormCard title="Add tag" icon={Plus}>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Tag name"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={handleCreate}>Add tag</Button>
        </div>
      </MasterDataFormCard>

      <MasterDataListCard
        title="Tags"
        icon={Tag}
        count={tags.length}
        empty={
          <MasterDataEmptyState
            icon={Tag}
            title="No tags yet"
            description="Create your first tag using the form above."
          />
        }
      >
        {tags.length === 0 ? null : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div key={tag.id} className="master-data-tag-pill">
                {editingId === tag.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 w-28 border-teal-200 bg-white text-sm dark:border-teal-900"
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleUpdate(tag.id)}>
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Tag className="h-3 w-3 opacity-70" />
                    <span>{tag.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-teal-700 hover:text-blue-600 dark:text-teal-300"
                      onClick={() => {
                        setEditingId(tag.id);
                        setEditName(tag.name);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(tag.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </MasterDataListCard>
    </div>
  );
}
