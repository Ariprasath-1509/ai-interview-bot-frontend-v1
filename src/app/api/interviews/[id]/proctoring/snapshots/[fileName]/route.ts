import { cookies } from "next/headers";
import { z } from "zod";

export const runtime = "nodejs";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileName: string }> },
) {
  const jar = await cookies();
  const token = jar.get("br_jwt")?.value;
  if (!token) return new Response("Unauthorized", { status: 401 });

  const p = await params;
  const id = z.string().min(1).safeParse(p?.id).data;
  const fileName = z.string().min(1).safeParse(p?.fileName).data;
  if (!id || !fileName) return new Response("Bad request", { status: 400 });

  const upstream = await fetch(
    `${GATEWAY}/interviews/${encodeURIComponent(id)}/proctoring/snapshots/${encodeURIComponent(fileName)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  ).catch(() => null);

  if (!upstream?.ok) return new Response("Not found", { status: upstream?.status ?? 502 });

  const bytes = await upstream.arrayBuffer();
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
