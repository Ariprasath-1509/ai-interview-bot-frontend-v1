export const LANGUAGES = [
  { id: "python", label: "Python", ext: ".py" },
  { id: "javascript", label: "JavaScript", ext: ".js" },
  { id: "typescript", label: "TypeScript", ext: ".ts" },
  { id: "java", label: "Java", ext: ".java" },
  { id: "cpp", label: "C++", ext: ".cpp" },
  { id: "c", label: "C", ext: ".c" },
  { id: "go", label: "Go", ext: ".go" },
  { id: "rust", label: "Rust", ext: ".rs" },
  { id: "csharp", label: "C# (.NET)", ext: ".cs" },
  { id: "kotlin", label: "Kotlin", ext: ".kt" },
  { id: "ruby", label: "Ruby", ext: ".rb" },
  { id: "php", label: "PHP", ext: ".php" },
  { id: "swift", label: "Swift", ext: ".swift" },
  { id: "bash", label: "Bash", ext: ".sh" },
] as const;

export const MONACO_LANG: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "cpp",
  c: "c",
  go: "go",
  rust: "rust",
  csharp: "csharp",
  kotlin: "kotlin",
  ruby: "ruby",
  php: "php",
  swift: "swift",
  bash: "shell",
};

export const STARTERS: Record<string, string> = {
  python: "def solution():\n    # Write your solution here\n    pass\n\nif __name__ == \"__main__\":\n    solution()\n",
  javascript: "function solution() {\n  // Write your solution here\n}\n\nconsole.log(solution());\n",
  typescript: "function solution(): void {\n  // Write your solution here\n}\n\nsolution();\n",
  java: "public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n",
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main(void) {\n    // Write your solution here\n    return 0;\n}\n",
  go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n\t// Write your solution here\n\tfmt.Println(\"Hello\")\n}\n",
  rust: "fn main() {\n    // Write your solution here\n    println!(\"Hello\");\n}\n",
  csharp: "using System;\n\nclass Program {\n    static void Main() {\n        // Write your solution here\n    }\n}\n",
  kotlin: "fun main() {\n    // Write your solution here\n    println(\"Hello\")\n}\n",
  ruby: "# Write your solution here\nputs \"Hello\"\n",
  php: "<?php\n// Write your solution here\necho \"Hello\";\n",
  swift: "// Write your solution here\nprint(\"Hello\")\n",
  bash: "#!/bin/bash\n# Write your solution here\necho \"Hello\"\n",
};

export interface TestCase {
  id: string;
  name: string;
  input: string;
  expected: string;
}

export interface RunResult {
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
}

export interface AiReview {
  correctness: string;
  timeComplexity: string;
  spaceComplexity: string;
  score: number;
  bugs: string[];
  improvements: string[];
  overallFeedback: string;
}

export interface CodeSubmission {
  language: string;
  code: string;
  results: RunResult[] | null;
  aiReview: AiReview | null;
  complexity: string;
}

export interface QuestionMeta {
  question: string;
  slot: number;
  isCoding: boolean;
  preferredLanguage: string;
  starterCode?: string | null;
}

export interface CodeSubmissionRecord extends CodeSubmission {
  slot: number;
  question: string;
  submittedAt?: string;
}

export function resolveStarterCode(lang: string, starterCode?: string | null): string {
  if (starterCode?.trim()) return starterCode;
  return STARTERS[lang] ?? "// Write your solution here\n";
}

/** Explicit coding-task phrasing only — avoids false positives on general technical questions. */
export function isCodingKeywords(question: string): boolean {
  const lower = question.toLowerCase();
  const keywords = [
    "write a function",
    "write code",
    "write a program",
    "write your solution",
    "write an algorithm",
    "implement a function",
    "implement the function",
    "implement a ",
    "complete the following function",
    "create a function",
    "create a method",
    "coding challenge",
    "code a solution",
    "code the solution",
    "solve this problem",
    "time complexity",
    "space complexity",
    "given an array",
    "given a string",
    "given a list",
    "given a linked list",
    "given a binary tree",
    "design an algorithm",
    "data structure",
    "leetcode",
    "hackerrank",
  ];
  return keywords.some((kw) => lower.includes(kw));
}

export function isCodingQuestion(
  question: string,
  isCodingFlag: boolean,
  includeProgrammingQuestions: boolean,
): boolean {
  if (!includeProgrammingQuestions) return false;
  return isCodingFlag || isCodingKeywords(question);
}
