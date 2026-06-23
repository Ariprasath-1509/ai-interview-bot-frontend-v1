"use client";

type Utterance = { speaker: string; text: string; at: string };

function formatTimeStable(value: string): string {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "--:--";
    const hh = d.getUTCHours().toString().padStart(2, "0");
    const mm = d.getUTCMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "--:--";
  }
}

export function TranscriptView({ utterances }: { utterances: Utterance[] }) {
  if (!utterances.length) {
    return <p className="text-sm text-zinc-500">(no transcript yet)</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {utterances.map((u, i) => {
        const isBot = u.speaker === "BOT";
        return (
          <div key={i} className={`flex items-end gap-2 ${isBot ? "" : "flex-row-reverse"}`}>
            <div className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              isBot
                ? "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
            }`}>
              {isBot ? "AI" : "C"}
            </div>
            <div className={`min-w-0 max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              isBot
                ? "rounded-tl-sm bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                : "rounded-tr-sm bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
            }`}>
              <p className="break-words whitespace-pre-wrap">{u.text}</p>
              <p className="mt-1 text-[10px] opacity-40 select-none">
                {formatTimeStable(u.at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
