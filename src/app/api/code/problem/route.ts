import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 60;

const GATEWAY = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6002";
const AI_CHAT_URL = process.env.AI_SERVICE_URL
  ? `${process.env.AI_SERVICE_URL.replace(/\/$/, "")}/ai/chat`
  : `${GATEWAY}/ai/chat`;

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface StructuredProblem {
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: ProblemExample[];
  functionSignature: Partial<Record<string, string>>;
  starterCode: Partial<Record<string, string>>;
  hints: string[];
}

// ── Local starter-code generation (no AI needed) ──────────────────────────────

function generateStarterCode(
  functionSignature: Partial<Record<string, string>>,
  inputFormat: string,
  examples: ProblemExample[],
): Partial<Record<string, string>> {
  const starter: Partial<Record<string, string>> = {};
  const firstInput = examples[0]?.input ?? "";
  const inputLines = firstInput.trim().split("\n");
  const multiLine = inputLines.length > 1;

  if (functionSignature["python"]) {
    const sig = functionSignature["python"];
    const fnMatch = sig.match(/def\s+(\w+)\s*\(([^)]*)\)/);
    const fnName = fnMatch?.[1] ?? "solve";
    const params = fnMatch?.[2]?.split(",").map(p => p.trim().split(":")[0].trim()).filter(Boolean) ?? ["n"];
    const readLines = multiLine
      ? params.map((p, i) => `    ${p} = input()  # line ${i + 1}`).join("\n")
      : `    ${params[0] ?? "data"} = input()`;
    starter["python"] = `# Input format: ${inputFormat}
${sig}
    # Write your solution here
    pass

if __name__ == "__main__":
${readLines}
    result = ${fnName}(${params.join(", ")})
    print(result)
`;
  }

  if (functionSignature["javascript"]) {
    const sig = functionSignature["javascript"];
    const fnMatch = sig.match(/function\s+(\w+)\s*\(([^)]*)\)/);
    const fnName = fnMatch?.[1] ?? "solve";
    const params = fnMatch?.[2]?.split(",").map(p => p.trim().split(" ").pop() ?? p.trim()).filter(Boolean) ?? ["n"];
    starter["javascript"] = `// Input format: ${inputFormat}
const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');
${multiLine
      ? params.map((p, i) => `const ${p} = lines[${i}];`).join("\n")
      : `const [${params.join(", ")}] = lines[0].split(' ');`}

${sig} {
    // Write your solution here
}

console.log(${fnName}(${params.join(", ")}));
`;
  }

  if (functionSignature["java"]) {
    const sig = functionSignature["java"];
    const fnMatch = sig.match(/(\w[\w\[\]]*)\s+(\w+)\s*\(([^)]*)\)/);
    const retType = fnMatch?.[1] ?? "int";
    const fnName = fnMatch?.[2] ?? "solve";
    const params = fnMatch?.[3]?.split(",").map(p => {
      const trimmed = p.trim();
      // match things like "int[] arr", "String[] words", "int n", "String s"
      const m = trimmed.match(/^([\w\[\]]+)\s+(\w+)$/);
      return { type: m?.[1] ?? "int", name: m?.[2] ?? "n" };
    }).filter(p => p.name) ?? [{ type: "int", name: "n" }];

    const readStatements = params.map(p => {
      if (p.type.endsWith("[]")) {
        const elemType = p.type.replace("[]", "");
        const tok = `_tok_${p.name}`;
        const parseExpr =
          elemType === "int"    ? `Integer.parseInt(${tok}[_i])` :
          elemType === "long"   ? `Long.parseLong(${tok}[_i])` :
          elemType === "double" ? `Double.parseDouble(${tok}[_i])` : `${tok}[_i]`;
        const arrType = elemType === "int" ? "int" : elemType === "long" ? "long" : elemType === "double" ? "double" : "String";
        if (arrType === "String") {
          return `        String[] ${p.name} = scanner.nextLine().trim().split("\\\\s+");`;
        }
        return `        String[] ${tok} = scanner.nextLine().trim().split("\\\\s+");
        ${arrType}[] ${p.name} = new ${arrType}[${tok}.length];
        for (int _i = 0; _i < ${tok}.length; _i++) ${p.name}[_i] = ${parseExpr};`;
      }
      if (p.type === "int")    return `        int ${p.name} = scanner.nextInt();`;
      if (p.type === "long")   return `        long ${p.name} = scanner.nextLong();`;
      if (p.type === "double") return `        double ${p.name} = scanner.nextDouble();`;
      return `        String ${p.name} = scanner.nextLine().trim();`;
    }).join("\n");

    const defaultReturn =
      retType === "boolean" ? "false" :
      retType === "String"  ? '""' :
      retType.endsWith("[]") ? "new " + retType.replace("[]","") + "[0]" : "0";

    starter["java"] = `// Input format: ${inputFormat}
import java.util.Scanner;

public class Main {
    public static ${retType} ${fnName}(${params.map(p => `${p.type} ${p.name}`).join(", ")}) {
        // Write your solution here
        return ${defaultReturn};
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
${readStatements}
        System.out.println(${fnName}(${params.map(p => p.name).join(", ")}));
    }
}
`;
  }

  if (functionSignature["cpp"]) {
    const sig = functionSignature["cpp"];
    const fnMatch = sig.match(/(\w+)\s+(\w+)\s*\(([^)]*)\)/);
    const retType = fnMatch?.[1] ?? "int";
    const fnName = fnMatch?.[2] ?? "solve";
    const params = fnMatch?.[3]?.split(",").map(p => {
      const parts = p.trim().split(/\s+/);
      return { type: parts[0] ?? "int", name: parts[parts.length - 1]?.replace(/[^a-zA-Z0-9_]/g, "") ?? "n" };
    }).filter(p => p.name && /^\w+$/.test(p.name)) ?? [{ type: "int", name: "n" }];
    const reads = params.map(p => `cin >> ${p.name};`).join(" ");
    starter["cpp"] = `// Input format: ${inputFormat}
#include <bits/stdc++.h>
using namespace std;

${retType} ${fnName}(${params.map(p => `${p.type} ${p.name}`).join(", ")}) {
    // Write your solution here
    return ${retType === "bool" ? "false" : retType === "string" ? '""' : "0"};
}

int main() {
    ${params.map(p => `${p.type} ${p.name};`).join(" ")}
    ${reads}
    cout << ${fnName}(${params.map(p => p.name).join(", ")}) << endl;
    return 0;
}
`;
  }

  if (functionSignature["go"]) {
    const sig = functionSignature["go"];
    const fnMatch = sig.match(/func\s+(\w+)\s*\(([^)]*)\)\s*(\w+)?/);
    const fnName = fnMatch?.[1] ?? "solve";
    const retType = fnMatch?.[3] ?? "int";
    const params = fnMatch?.[2]?.split(",").map(p => {
      const parts = p.trim().split(/\s+/);
      return { name: parts[0] ?? "n", type: parts[1] ?? "int" };
    }).filter(p => p.name) ?? [{ name: "n", type: "int" }];
    const scanVars = params.map(p => `&${p.name}`).join(", ");
    const decls = params.map(p => `var ${p.name} ${p.type}`).join("\n\t");
    starter["go"] = `// Input format: ${inputFormat}
package main

import "fmt"

func ${fnName}(${params.map(p => `${p.name} ${p.type}`).join(", ")}) ${retType} {
    // Write your solution here
    return ${retType === "bool" ? "false" : retType === "string" ? '""' : "0"}
}

func main() {
\t${decls}
\tfmt.Scan(${scanVars})
\tfmt.Println(${fnName}(${params.map(p => p.name).join(", ")}))
}
`;
  }

  return starter;
}

// ── AI prompt ─────────────────────────────────────────────────────────────────

function buildPrompt(question: string, language: string): { system: string; user: string } {
  const system = `You are an expert coding interview problem formatter.
Given a raw interview question, extract and structure it as a clean problem statement.
Return ONLY valid JSON matching the schema exactly — no markdown, no explanation.

Schema:
{
  "title": "short problem title (≤6 words)",
  "description": "clear 1-3 sentence description of what to solve",
  "inputFormat": "one sentence describing what the program reads from stdin",
  "outputFormat": "one sentence describing exactly what to print to stdout",
  "constraints": ["constraint 1", "constraint 2"],
  "examples": [
    {"input": "exact stdin", "output": "exact stdout", "explanation": "why this output"}
  ],
  "functionSignature": {
    "python": "def function_name(params) -> return_type:",
    "javascript": "function functionName(params) { }",
    "java": "public static returnType functionName(params)",
    "cpp": "returnType functionName(params)",
    "go": "func functionName(params) returnType"
  },
  "hints": ["one strategic hint", "optional second hint"]
}

Rules:
- title: noun phrase, ≤6 words
- description: what to compute, not how
- inputFormat: describe stdin format (e.g. "Space-separated integers on one line")
- outputFormat: be precise (e.g. "Print a single integer")
- constraints: 2-4 realistic constraints
- examples: 1-2 examples with exact stdin/stdout
- functionSignature: natural function name for the problem, no full implementation body
- hints: 1-2 high-level hints without giving away the solution
- Return ONLY JSON, nothing else`;

  const user = `Language the candidate will primarily use: ${language}

Raw question:
${question}

Return the structured JSON now.`;

  return { system, user };
}

function extractJsonFromLlm(raw: string): unknown | null {
  let text = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  text = text.slice(start, end + 1);
  try {
    return JSON.parse(text);
  } catch {
    try {
      const repaired = text.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

function validateAndNormalize(raw: unknown, question: string): StructuredProblem {
  const r = raw as Record<string, unknown>;

  const examples: ProblemExample[] = [];
  if (Array.isArray(r?.examples)) {
    for (const ex of r.examples as Record<string, unknown>[]) {
      if (ex?.input != null || ex?.output != null) {
        examples.push({
          input: String(ex.input ?? ""),
          output: String(ex.output ?? ""),
          explanation: ex.explanation ? String(ex.explanation) : undefined,
        });
      }
    }
  }

  const constraints: string[] = Array.isArray(r?.constraints)
    ? (r.constraints as unknown[]).map(String).filter(Boolean)
    : [];

  const hints: string[] = Array.isArray(r?.hints)
    ? (r.hints as unknown[]).map(String).filter(Boolean)
    : [];

  const rawSig = r?.functionSignature;
  const functionSignature: Partial<Record<string, string>> =
    rawSig && typeof rawSig === "object" && !Array.isArray(rawSig)
      ? Object.fromEntries(
          Object.entries(rawSig as Record<string, unknown>).map(([k, v]) => [k, String(v)])
        )
      : {};

  const title =
    typeof r?.title === "string" && r.title.trim()
      ? r.title.trim()
      : question.split(/[.?!]/)[0].trim().slice(0, 60);

  const inputFormat = typeof r?.inputFormat === "string" ? r.inputFormat.trim() : "Read from stdin.";
  const outputFormat = typeof r?.outputFormat === "string" ? r.outputFormat.trim() : "Print the result to stdout.";

  const starterCode = generateStarterCode(functionSignature, inputFormat, examples);

  return {
    title,
    description: typeof r?.description === "string" ? r.description.trim() : question.slice(0, 300),
    inputFormat,
    outputFormat,
    constraints,
    examples,
    functionSignature,
    starterCode,
    hints,
  };
}

function makeFallback(question: string): StructuredProblem {
  return {
    title: question.split(/[.?!]/)[0].trim().slice(0, 60),
    description: question,
    inputFormat: "Read from stdin.",
    outputFormat: "Print the result to stdout.",
    constraints: [],
    examples: [],
    functionSignature: {},
    starterCode: {},
    hints: [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const { question, language = "python" } = await req.json();

    if (!question || String(question).trim().length < 15) {
      return NextResponse.json({ error: "question_too_short" }, { status: 400 });
    }

    const q = String(question).trim();
    const lang = String(language).trim() || "python";

    const jar = await cookies();
    const token = jar.get("br_jwt")?.value;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const { system, user } = buildPrompt(q, lang);

    let aiRes: Response;
    try {
      aiRes = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ system, user }),
        signal: AbortSignal.timeout(50_000),
      });
    } catch (fetchErr: unknown) {
      const isTimeout =
        fetchErr instanceof Error &&
        (fetchErr.name === "TimeoutError" || fetchErr.name === "AbortError");
      console.warn("Problem structuring fetch failed:", isTimeout ? "timeout" : fetchErr);
      return NextResponse.json({ problem: makeFallback(q), source: "fallback" });
    }

    if (!aiRes.ok) {
      return NextResponse.json({ problem: makeFallback(q), source: "fallback" });
    }

    const aiData = (await aiRes.json()) as { response?: string; message?: string };
    const raw = aiData.response || aiData.message || "";
    const parsed = extractJsonFromLlm(raw);

    if (!parsed) {
      return NextResponse.json({ problem: makeFallback(q), source: "fallback" });
    }

    const problem = validateAndNormalize(parsed, q);
    return NextResponse.json({ problem, source: "ai" });
  } catch (err) {
    console.error("Problem structuring error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
