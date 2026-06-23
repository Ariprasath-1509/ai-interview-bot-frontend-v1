import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  buildHeuristicTestCases,
  fetchLlmTestCases,
  resolveTestCases,
  type GeneratedTestCase,
} from "./testCaseGenerator";

const GATEWAY = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";
const AI_CHAT_URL = process.env.AI_SERVICE_URL
  ? `${process.env.AI_SERVICE_URL.replace(/\/$/, "")}/ai/chat`
  : `${GATEWAY}/ai/chat`;

export async function POST(req: NextRequest) {
  try {
    const { question, language = "python" } = await req.json();

    if (!question || String(question).trim().length < 20) {
      return NextResponse.json({ testCases: [], source: "empty" });
    }

    const q = String(question).trim();
    const lang = String(language).trim() || "python";

    const heuristicFirst = buildHeuristicTestCases(q);
    if (heuristicFirst?.length) {
      return NextResponse.json({ testCases: heuristicFirst, source: "heuristic" });
    }

    let llmCases: GeneratedTestCase[] | null = null;
    try {
      const jar = await cookies();
      const token = jar.get("br_jwt")?.value;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      llmCases = await fetchLlmTestCases(AI_CHAT_URL, q, lang, headers);
    } catch (err) {
      console.warn("LLM test case generation failed:", err);
    }

    const { testCases, source } = resolveTestCases(q, lang, llmCases);

    return NextResponse.json({ testCases, source });
  } catch (error) {
    console.error("Generate tests error:", error);
    return NextResponse.json({ testCases: [], source: "error" });
  }
}
