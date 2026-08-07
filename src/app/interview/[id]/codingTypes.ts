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
  python: `import sys
from collections import defaultdict, deque, Counter
from itertools import permutations, combinations
from functools import lru_cache
input = sys.stdin.readline

def solution():
    # Write your solution here
    pass

if __name__ == "__main__":
    solution()
`,
  javascript: `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');
let _idx = 0;
const readline = () => lines[_idx++] ?? '';

function solution() {
  // Write your solution here
}

console.log(solution());
`,
  typescript: `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');
let _idx = 0;
const readline = (): string => lines[_idx++] ?? '';

function solution(): void {
  // Write your solution here
}

solution();
`,
  java: `import java.util.*;
import java.util.stream.*;
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Write your solution here
    }
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
typedef vector<int> vi;
typedef pair<int,int> pii;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    // Write your solution here
    return 0;
}
`,
  c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    // Write your solution here
    return 0;
}
`,
  go: `package main

import (
\t"bufio"
\t"fmt"
\t"os"
)

var reader = bufio.NewReader(os.Stdin)

func main() {
\t// Write your solution here
\tfmt.Println("Hello")
}
`,
  rust: `use std::io::{self, BufRead};

fn main() {
    let stdin = io::stdin();
    let mut lines = stdin.lock().lines();
    // Write your solution here
    println!("Hello");
}
`,
  csharp: `using System;
using System.Collections.Generic;
using System.Linq;

class Program {
    static void Main() {
        // Write your solution here
    }
}
`,
  kotlin: "import java.util.Scanner\n\nfun main() {\n    val sc = Scanner(System.`in`)\n    // Write your solution here\n    println(\"Hello\")\n}\n",
  ruby: `require 'set'

# Write your solution here
puts "Hello"
`,
  php: `<?php
// Write your solution here
echo "Hello";
`,
  swift: `import Foundation

// Write your solution here
print("Hello")
`,
  bash: `#!/bin/bash
# Write your solution here
echo "Hello"
`,
};

export interface TestCase {
  id: string;
  name: string;
  input: string;
  expected: string;
}

export type ErrorType =
  | "compile_error"
  | "runtime_error"
  | "timeout"
  | "output_mismatch"
  | "execution_unavailable"
  | null;

export interface RunResult {
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  timed_out: boolean;
  error_type?: ErrorType;
  friendly_error?: string;
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

/**
 * Matches only questions that explicitly ask the candidate to WRITE code.
 * Deliberately excludes topic words ("data structure", "time complexity", "given an array")
 * that appear in theory questions — those are handled by the backend isCoding flag.
 */
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
    "complete the following function",
    "create a function",
    "create a method",
    "coding challenge",
    "code a solution",
    "code the solution",
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
