import { NextRequest, NextResponse } from "next/server";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:6003";

export async function POST(req: NextRequest) {
  try {
    const { question, language } = await req.json();

    if (!question || question.trim().length < 20) {
      return NextResponse.json({ testCases: [] });
    }

    // Call AI service to generate test cases
    const prompt = `Given this coding question, generate 3-5 test cases with input and expected output.
Return ONLY a JSON array with this exact format:
[
  {"name": "Basic case", "input": "5\\n", "expected": "120"},
  {"name": "Edge case", "input": "0\\n", "expected": "1"}
]

Question: ${question}
Language: ${language}

Generate realistic test cases that cover:
1. Basic/happy path
2. Edge cases (empty, zero, boundary)
3. Complex scenarios

Return raw JSON array only, no markdown, no explanation.`;

    const aiRes = await fetch(`${AI_SERVICE_URL}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "You are a test case generator. Return only valid JSON arrays.",
        user: prompt,
      }),
    });

    if (!aiRes.ok) {
      return NextResponse.json({
        testCases: [
          { id: "1", name: "Test Case 1", input: "", expected: "" },
          { id: "2", name: "Test Case 2", input: "", expected: "" },
        ],
      });
    }

    const aiData = await aiRes.json();
    let testCases: { id: string; name: string; input: string; expected: string }[] = [];

    try {
      let raw = aiData.response || aiData.message || "";
      raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(raw);
      
      if (Array.isArray(parsed)) {
        testCases = parsed.map((tc: any, i: number) => ({
          id: String(i + 1),
          name: tc.name || `Test Case ${i + 1}`,
          input: tc.input || "",
          expected: tc.expected || "",
        }));
      }
    } catch {
      testCases = [
        { id: "1", name: "Test Case 1", input: "", expected: "" },
        { id: "2", name: "Test Case 2", input: "", expected: "" },
      ];
    }

    return NextResponse.json({ testCases });
  } catch (error) {
    console.error("Generate tests error:", error);
    return NextResponse.json({
      testCases: [
        { id: "1", name: "Test Case 1", input: "", expected: "" },
      ],
    });
  }
}
