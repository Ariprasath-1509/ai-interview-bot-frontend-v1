import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const InjectSchema = z.object({
  interviewId: z.string().min(1),
  mode: z.enum(["SOFT_INJECT", "HARD_INJECT"]),
  question: z.string().min(5),
});

const FlagSchema = z.object({
  interviewId: z.string().min(1),
  note: z.string().min(3),
});

type ObserverEvent = { id: string; kind: string; payloadJson: string; createdAt: string };

export default async function ObserverInterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  if (!id) redirect("/admin/review");

  const session = await getSession();
  if (!session) redirect("/");

  const eventsRes = await apiServer(`/observer/events/${id}`, session.token).catch(() => null);
  const events: ObserverEvent[] = eventsRes?.ok ? await eventsRes.json() : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Observer monitor</h1>
          <p className="mt-1 text-sm text-zinc-600 break-all">Interview: {id}</p>
        </div>
        <div className="flex shrink-0 gap-3 text-sm">
          <Link className="underline" href={`/interview/${id}`}>Candidate view</Link>
          <Link className="underline" href={`/admin/interviews/${id}/review`}>Review</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="font-medium">Inject follow-up</div>
          <form action={inject} className="mt-4 grid gap-3">
            <input type="hidden" name="interviewId" value={id} />
            <label className="grid gap-2 text-sm">
              Mode
              <select
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-100"
                name="mode" defaultValue="SOFT_INJECT"
              >
                <option value="SOFT_INJECT">Soft inject (queue)</option>
                <option value="HARD_INJECT">Hard inject (pivot)</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              Question
              <textarea
                className="min-h-[120px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-100"
                name="question" required placeholder="Type a follow-up question for the bot to ask…"
              />
            </label>
            <button
              className="rounded-full bg-foreground px-6 py-2 text-background hover:bg-zinc-800 dark:hover:bg-zinc-200"
              type="submit"
            >
              Queue inject
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="font-medium">Flag answer</div>
          <form action={flag} className="mt-4 grid gap-3">
            <input type="hidden" name="interviewId" value={id} />
            <label className="grid gap-2 text-sm">
              Note
              <textarea
                className="min-h-[120px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-100"
                name="note" required placeholder="Flag this answer for post-interview review…"
              />
            </label>
            <button
              className="rounded-full bg-foreground px-6 py-2 text-background hover:bg-zinc-800 dark:hover:bg-zinc-200"
              type="submit"
            >
              Flag
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="font-medium">Events</div>
        <div className="mt-3 grid gap-2 text-sm text-zinc-600">
          {events.length ? events.map((e) => (
            <div key={e.id} className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{e.kind}</div>
                <div className="text-xs text-zinc-500">{e.createdAt}</div>
              </div>
              <pre className="mt-2 max-h-28 overflow-auto text-xs whitespace-pre-wrap break-words">{e.payloadJson}</pre>
            </div>
          )) : <div>No events yet.</div>}
        </div>
      </div>
    </div>
  );
}

async function inject(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN" && session.role !== "RECRUITER")) redirect("/unauthorized");

  const parsed = InjectSchema.parse({
    interviewId: formData.get("interviewId"),
    mode: formData.get("mode"),
    question: formData.get("question"),
  });

  await apiServer("/observer/inject", session.token, {
    method: "POST",
    body: JSON.stringify({ interviewId: parsed.interviewId, mode: parsed.mode, question: parsed.question }),
  });

  redirect(`/observer/interview/${encodeURIComponent(parsed.interviewId)}`);
}

async function flag(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) redirect("/unauthorized");

  const parsed = FlagSchema.parse({
    interviewId: formData.get("interviewId"),
    note: formData.get("note"),
  });

  await apiServer("/observer/flag", session.token, {
    method: "POST",
    body: JSON.stringify({ interviewId: parsed.interviewId, note: parsed.note }),
  });

  redirect(`/observer/interview/${encodeURIComponent(parsed.interviewId)}`);
}
