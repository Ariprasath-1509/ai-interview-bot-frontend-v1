"use client";

import { useEffect, useRef, useState } from "react";

type Candidate = { id: string; name: string; email: string };

export function CandidateSearch({
  onSelect,
  onClear,
}: {
  onSelect: (c: Candidate) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/candidates?search=${encodeURIComponent(query)}`);
        const data = res.ok ? (await res.json() as Candidate[]) : [];
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, [query]);

  function select(c: Candidate) {
    setQuery(c.name || c.email);
    setOpen(false);
    onSelect(c);
  }

  function clear() {
    setQuery("");
    setResults([]);
    setOpen(false);
    onClear();
  }

  return (
    <div className="relative grid gap-2">
      <label className="text-sm font-medium">
        Search candidate
        <span className="ml-1 text-xs font-normal text-zinc-400">(optional — or fill fields below manually)</span>
      </label>
      <div className="relative">
        <input
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-100"
          placeholder="Type name or email…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (!e.target.value) clear(); }}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            ✕
          </button>
        )}
      </div>
      {loading && <p className="text-xs text-zinc-400">Searching…</p>}
      {!loading && query.trim() && results.length === 0 && (
        <p className="text-xs text-zinc-400">No registered candidates found. Enter details manually.</p>
      )}
      {open && (
        <ul className="absolute top-full z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-900">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => select(c)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-zinc-400">{c.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
