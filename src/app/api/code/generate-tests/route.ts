import { NextRequest, NextResponse } from "next/server";
import {
  fetchLlmTestCases,
  resolveTestCases,
  type GeneratedTestCase,
} from "./testCaseGenerator";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:6003";

export async function POST(req: NextRequest) {
  try {
    const { question, language = "python" } = await req.json();

    if (!question || String(question).trim().length < 20) {
      return NextResponse.json({ testCases: [], source: "empty" });
    }

    const q = String(question).trim();
    const lang = String(language).trim() || "python";

    let llmCases: GeneratedTestCase[] | null = null;
    try {
      llmCases = await fetchLlmTestCases(AI_SERVICE_URL, q, lang);
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
