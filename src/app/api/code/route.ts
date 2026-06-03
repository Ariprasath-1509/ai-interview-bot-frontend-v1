import { spawn, execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { cookies } from "next/headers";
import { outputsMatch } from "./outputMatcher";

export const runtime = "nodejs";

const PISTON_API_URL = process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston";

async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  return !!jar.get("br_jwt")?.value;
}

function hasCmd(cmd: string): boolean {
  try {
    if (process.platform === "win32") {
      execFileSync("where", [cmd], { stdio: "ignore" });
    } else {
      execFileSync("which", [cmd], { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

interface ProcResult { code: number; signal: string | null; stdout: string; stderr: string; }

function runProcess(cmd: string, args: string[], opts: object, timeoutMs: number, stdin = ""): Promise<ProcResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...opts, windowsHide: true } as Parameters<typeof spawn>[2]);
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { try { child.kill("SIGKILL"); } catch { /* ignore */ } }, timeoutMs);

    child.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    child.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

    if (stdin) {
      child.stdin?.write(stdin);
      child.stdin?.end();
    } else {
      child.stdin?.end();
    }

    child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, signal: signal as string | null, stdout, stderr });
    });
    child.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({ code: 1, signal: null, stdout, stderr: stderr + String(err) });
    });
  });
}

async function runInTemp(
  prefix: string,
  writeFiles: (dir: string) => Promise<void>,
  run: (dir: string) => Promise<ProcResult>,
): Promise<ProcResult> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    await writeFiles(dir);
    return await run(dir);
  } finally {
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

type RunnerFn = (code: string, stdin: string, ms: number) => Promise<ProcResult | null>;

const RUNNERS: Record<string, RunnerFn> = {
  python: (code, stdin, ms) => runInTemp("br-py-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.py"), code, "utf8");
  }, (d) => {
    const pyCmd = hasCmd("python") ? "python" : hasCmd("python3") ? "python3" : "py";
    return runProcess(pyCmd, ["-B", path.join(d, "main.py")], { cwd: d, env: { ...process.env, PYTHONUNBUFFERED: "1" } }, ms, stdin);
  }),

  javascript: (code, stdin, ms) => runInTemp("br-js-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.mjs"), code, "utf8");
  }, (d) => runProcess(process.execPath, [path.join(d, "main.mjs")], { cwd: d }, ms, stdin)),

  typescript: (code, stdin, ms) => runInTemp("br-ts-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.ts"), code, "utf8");
  }, (d) => runProcess(process.execPath, ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", path.join(d, "main.ts")], { cwd: d }, ms, stdin)),

  go: (code, stdin, ms) => runInTemp("br-go-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.go"), code, "utf8");
  }, (d) => runProcess("go", ["run", path.join(d, "main.go")], { cwd: d, env: { ...process.env, GOTOOLCHAIN: "local" } }, ms, stdin)),

  rust: (code, stdin, ms) => runInTemp("br-rs-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.rs"), code, "utf8");
  }, async (d) => {
    const bin = process.platform === "win32" ? path.join(d, "main.exe") : path.join(d, "main");
    const c1 = await runProcess("rustc", [path.join(d, "main.rs"), "-o", bin], { cwd: d }, ms, "");
    if (c1.code !== 0) return c1;
    return runProcess(bin, [], { cwd: d }, ms, stdin);
  }),

  c: (code, stdin, ms) => runInTemp("br-c-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.c"), code, "utf8");
  }, async (d) => {
    const out = process.platform === "win32" ? path.join(d, "a.exe") : path.join(d, "a.out");
    const c1 = await runProcess("gcc", [path.join(d, "main.c"), "-o", out, "-lm"], { cwd: d }, ms, "");
    if (c1.code !== 0) return c1;
    return runProcess(out, [], { cwd: d }, ms, stdin);
  }),

  cpp: (code, stdin, ms) => runInTemp("br-cpp-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.cpp"), code, "utf8");
  }, async (d) => {
    const out = process.platform === "win32" ? path.join(d, "a.exe") : path.join(d, "a.out");
    const c1 = await runProcess("g++", [path.join(d, "main.cpp"), "-o", out, "-std=c++17", "-lm"], { cwd: d }, ms, "");
    if (c1.code !== 0) return c1;
    return runProcess(out, [], { cwd: d }, ms, stdin);
  }),

  java: (code, stdin, ms) => runInTemp("br-java-", async (d) => {
    await fs.promises.writeFile(path.join(d, "Main.java"), code, "utf8");
  }, async (d) => {
    const c1 = await runProcess("javac", [path.join(d, "Main.java")], { cwd: d }, ms, "");
    if (c1.code !== 0) return c1;
    return runProcess("java", ["-cp", d, "Main"], { cwd: d }, ms, stdin);
  }),

  php: (code, stdin, ms) => runInTemp("br-php-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.php"), code, "utf8");
  }, (d) => runProcess("php", [path.join(d, "main.php")], { cwd: d }, ms, stdin)),

  ruby: (code, stdin, ms) => runInTemp("br-rb-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.rb"), code, "utf8");
  }, (d) => runProcess("ruby", [path.join(d, "main.rb")], { cwd: d }, ms, stdin)),

  csharp: (code, stdin, ms) => {
    const dotnetMs = Math.min(ms + 25000, 90000);
    return runInTemp("br-cs-", async (d) => {
      await fs.promises.writeFile(path.join(d, "Program.cs"), code, "utf8");
      await fs.promises.writeFile(path.join(d, "br.csproj"),
        `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup></Project>`,
        "utf8");
    }, (d) => runProcess("dotnet", ["run", "--project", d], { cwd: d, env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1", DOTNET_NOLOGO: "1" } }, dotnetMs, stdin));
  },

  kotlin: (code, stdin, ms) => runInTemp("br-kt-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.kt"), code, "utf8");
  }, async (d) => {
    const jar = path.join(d, "main.jar");
    const c1 = await runProcess("kotlinc", [path.join(d, "main.kt"), "-include-runtime", "-d", jar], { cwd: d }, ms, "");
    if (c1.code !== 0) return c1;
    return runProcess("java", ["-jar", jar], { cwd: d }, ms, stdin);
  }),

  swift: (code, stdin, ms) => runInTemp("br-swift-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.swift"), code, "utf8");
  }, (d) => runProcess("swift", [path.join(d, "main.swift")], { cwd: d }, ms, stdin)),

  bash: (code, stdin, ms) => runInTemp("br-sh-", async (d) => {
    await fs.promises.writeFile(path.join(d, "main.sh"), code, "utf8");
  }, (d) => runProcess("bash", [path.join(d, "main.sh")], { cwd: d }, ms, stdin)),
};

const ALIASES: Record<string, string> = {
  py: "python", js: "javascript", node: "javascript",
  ts: "typescript", "c++": "cpp", cs: "csharp", "c#": "csharp",
  kt: "kotlin", rb: "ruby", sh: "bash", shell: "bash",
};

const PISTON_LANG: Record<string, string> = {
  python: "python", javascript: "javascript", typescript: "typescript",
  java: "java", cpp: "c++", c: "c", go: "go", rust: "rust",
  csharp: "csharp", kotlin: "kotlin", ruby: "ruby", php: "php",
  swift: "swift", bash: "bash",
};

const PISTON_FILE: Record<string, string> = {
  python: "main.py", javascript: "main.js", typescript: "main.ts",
  java: "Main.java", cpp: "main.cpp", c: "main.c", go: "main.go",
  rust: "main.rs", csharp: "Program.cs", kotlin: "main.kt",
  ruby: "main.rb", php: "main.php", swift: "main.swift", bash: "main.sh",
};

async function executeViaPiston(language: string, code: string, stdin: string, timeoutMs: number): Promise<ProcResult | null> {
  const pistonLang = PISTON_LANG[language];
  if (!pistonLang || !PISTON_API_URL) return null;

  try {
    const res = await fetch(`${PISTON_API_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: pistonLang,
        version: "*",
        files: [{ name: PISTON_FILE[language] ?? "main.txt", content: code }],
        stdin,
        run_timeout: Math.min(timeoutMs, 60000),
      }),
      signal: AbortSignal.timeout(timeoutMs + 5000),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      run?: { stdout?: string; stderr?: string; code?: number; signal?: string | null; message?: string };
      compile?: { stdout?: string; stderr?: string; code?: number };
    };

    const compileErr = data.compile?.stderr ?? "";
    if (data.compile && data.compile.code !== 0) {
      return {
        code: data.compile.code ?? 1,
        signal: null,
        stdout: data.compile.stdout ?? "",
        stderr: compileErr || "Compilation failed",
      };
    }

    const run = data.run;
    if (!run) return null;

    return {
      code: run.code ?? 1,
      signal: run.signal ?? null,
      stdout: run.stdout ?? "",
      stderr: (run.stderr ?? "") + (run.message ? `\n${run.message}` : "") + (compileErr ? `\n${compileErr}` : ""),
    };
  } catch {
    return null;
  }
}

async function executeCode(language: string, code: string, stdin: string, timeoutMs: number): Promise<ProcResult> {
  // Prefer Piston when configured (production-safe sandbox)
  if (process.env.USE_PISTON !== "false") {
    const pistonResult = await executeViaPiston(language, code, stdin, timeoutMs);
    if (pistonResult) return pistonResult;
  }

  const runner = RUNNERS[language];
  if (!runner) {
    return { code: 1, signal: null, stdout: "", stderr: `Unsupported language: ${language}` };
  }

  const local = await runner(code, stdin, timeoutMs);
  if (!local) {
    return { code: 1, signal: null, stdout: "", stderr: `No local runner for ${language}` };
  }
  return local;
}

export function languageAvailability() {
  const usePiston = process.env.USE_PISTON !== "false";
  return [
    { id: "python", label: "Python", available: usePiston || hasCmd("python") || hasCmd("python3") || hasCmd("py") },
    { id: "javascript", label: "JavaScript", available: true },
    { id: "typescript", label: "TypeScript", available: true },
    { id: "java", label: "Java", available: usePiston || (hasCmd("javac") && hasCmd("java")) },
    { id: "cpp", label: "C++", available: usePiston || hasCmd("g++") || hasCmd("c++") },
    { id: "c", label: "C", available: usePiston || hasCmd("gcc") || hasCmd("cc") },
    { id: "go", label: "Go", available: usePiston || hasCmd("go") },
    { id: "rust", label: "Rust", available: usePiston || hasCmd("rustc") },
    { id: "csharp", label: "C# (.NET)", available: usePiston || hasCmd("dotnet") },
    { id: "kotlin", label: "Kotlin", available: usePiston || hasCmd("kotlinc") },
    { id: "ruby", label: "Ruby", available: usePiston || hasCmd("ruby") },
    { id: "php", label: "PHP", available: usePiston || hasCmd("php") },
    { id: "swift", label: "Swift", available: usePiston || hasCmd("swift") },
    { id: "bash", label: "Bash", available: usePiston || hasCmd("bash") || process.platform !== "win32" },
  ];
}

export async function GET() {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ languages: languageAvailability(), executor: process.env.USE_PISTON === "false" ? "local" : "piston-or-local" });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    language?: string;
    code?: string;
    stdin?: string;
    timeout_ms?: number;
    test_cases?: { name?: string; input?: string; expected?: string; contains?: string[] }[];
  };

  const { language = "python", code = "", stdin = "", timeout_ms = 10000, test_cases = [] } = body;
  const timeoutMs = Math.min(Math.max(Number(timeout_ms) || 10000, 500), 60000);

  let lang = String(language).toLowerCase().trim();
  lang = ALIASES[lang] ?? lang;

  if (!RUNNERS[lang] && !PISTON_LANG[lang]) {
    return Response.json({ error: "unsupported_language", language: lang, languages: languageAvailability() }, { status: 400 });
  }

  const cases = test_cases.length > 0 ? test_cases : [{ name: "run", input: stdin, expected: undefined }];
  const results = [];

  for (const tc of cases) {
    const tcInput = tc.input ?? stdin ?? "";
    const proc = await executeCode(lang, code, tcInput, timeoutMs);

    const timedOut = proc.signal === "SIGKILL";
    const out = proc.stdout.replace(/\r\n/g, "\n").trimEnd();
    const err = proc.stderr.replace(/\r\n/g, "\n").trimEnd();

    let passed = proc.code === 0 && !timedOut;
    if (passed && tc.expected != null) {
      passed = outputsMatch(out, String(tc.expected));
    }
    if (passed && tc.contains?.length) passed = tc.contains.every((c) => out.includes(c));

    results.push({
      name: tc.name ?? "run",
      passed,
      stdout: out,
      stderr: timedOut ? `${err}\n[timeout after ${timeoutMs}ms]`.trim() : err,
      exit_code: proc.code,
      timed_out: timedOut,
    });
  }

  return Response.json({
    id: crypto.randomUUID(),
    language: lang,
    results,
    ok: results.every((r) => r.passed),
  });
}
