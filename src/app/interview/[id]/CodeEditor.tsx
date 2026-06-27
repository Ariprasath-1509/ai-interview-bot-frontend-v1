"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useCallback, useEffect } from "react";
import type { editor as MonacoEditor, languages, IDisposable } from "monaco-editor";
import { Loader2 } from "lucide-react";
import { MONACO_LANG } from "./codingTypes";

const MonacoReact = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-zinc-950 text-zinc-400" style={{ height: 400 }}>
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="ml-2 text-sm">Loading editor…</span>
    </div>
  ),
});

interface Props {
  language: string;
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
}

const THEMES = [
  { id: "vs-dark", label: "Dark" },
  { id: "vs", label: "Light" },
  { id: "hc-black", label: "High Contrast" },
] as const;

const MIN_HEIGHT = 220;
const MAX_HEIGHT = 900;
const DEFAULT_HEIGHT = 420;

// Track registered completion providers so we don't double-register across hot-reloads
const registeredProviders = new Set<string>();
const providerDisposables: IDisposable[] = [];

function registerLanguageCompletions(monaco: typeof import("monaco-editor")) {
  const make = (
    label: string,
    kind: languages.CompletionItemKind,
    insertText: string,
    detail?: string,
    documentation?: string,
  ): languages.CompletionItem => ({
    label,
    kind,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail,
    documentation,
    range: undefined as never, // filled by Monaco
  });

  const Func = monaco.languages.CompletionItemKind.Function;
  const Keyword = monaco.languages.CompletionItemKind.Keyword;
  const Snippet = monaco.languages.CompletionItemKind.Snippet;
  const Class = monaco.languages.CompletionItemKind.Class;

  // ── Python ──────────────────────────────────────────────────────────────
  if (!registeredProviders.has("python")) {
    registeredProviders.add("python");
    providerDisposables.push(
      monaco.languages.registerCompletionItemProvider("python", {
        triggerCharacters: ["."],
        provideCompletionItems: (_model, position) => {
          const line = _model.getLineContent(position.lineNumber);
          const textBefore = line.slice(0, position.column - 1);

          const builtins: languages.CompletionItem[] = [
            make("print", Func, "print(${1:value})", "print(value)", "Print to stdout"),
            make("len", Func, "len(${1:obj})", "len(obj)"),
            make("range", Func, "range(${1:stop})", "range([start,] stop [,step])"),
            make("enumerate", Func, "enumerate(${1:iterable})", "enumerate(iterable)"),
            make("zip", Func, "zip(${1:iterables})", "zip(*iterables)"),
            make("map", Func, "map(${1:func}, ${2:iterable})", "map(function, iterable)"),
            make("filter", Func, "filter(${1:func}, ${2:iterable})", "filter(function, iterable)"),
            make("sorted", Func, "sorted(${1:iterable})", "sorted(iterable, key=None, reverse=False)"),
            make("reversed", Func, "reversed(${1:seq})", "reversed(sequence)"),
            make("sum", Func, "sum(${1:iterable})", "sum(iterable)"),
            make("min", Func, "min(${1:iterable})", "min(iterable)"),
            make("max", Func, "max(${1:iterable})", "max(iterable)"),
            make("abs", Func, "abs(${1:x})", "abs(x)"),
            make("int", Func, "int(${1:x})", "int(x)"),
            make("str", Func, "str(${1:x})", "str(x)"),
            make("float", Func, "float(${1:x})", "float(x)"),
            make("list", Func, "list(${1:iterable})", "list(iterable)"),
            make("dict", Func, "dict(${1})", "dict(...)"),
            make("set", Func, "set(${1:iterable})", "set(iterable)"),
            make("tuple", Func, "tuple(${1:iterable})", "tuple(iterable)"),
            make("input", Func, "input(${1:prompt})", "input([prompt])"),
            make("isinstance", Func, "isinstance(${1:obj}, ${2:type})", "isinstance(obj, type)"),
            make("type", Func, "type(${1:obj})", "type(obj)"),
            make("hasattr", Func, "hasattr(${1:obj}, ${2:name})", "hasattr(obj, name)"),
            make("getattr", Func, "getattr(${1:obj}, ${2:name})", "getattr(obj, name)"),
            make("open", Func, "open(${1:file}, ${2:mode})", "open(file, mode='r')"),
          ];

          const keywords: languages.CompletionItem[] = [
            make("def", Snippet, "def ${1:function_name}(${2:params}):\n\t${3:pass}", "Function definition"),
            make("class", Snippet, "class ${1:ClassName}:\n\tdef __init__(self):\n\t\t${2:pass}", "Class definition"),
            make("for", Snippet, "for ${1:item} in ${2:iterable}:\n\t${3:pass}", "for loop"),
            make("while", Snippet, "while ${1:condition}:\n\t${2:pass}", "while loop"),
            make("if", Snippet, "if ${1:condition}:\n\t${2:pass}", "if statement"),
            make("if/else", Snippet, "if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}", "if/else"),
            make("try", Snippet, "try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${3:print(e)}", "try/except"),
            make("with", Snippet, "with ${1:open('file')} as ${2:f}:\n\t${3:pass}", "with statement"),
            make("lambda", Snippet, "lambda ${1:args}: ${2:expr}", "lambda"),
            make("list comprehension", Snippet, "[${1:expr} for ${2:item} in ${3:iterable}]", "list comprehension"),
            make("dict comprehension", Snippet, "{${1:k}: ${2:v} for ${3:k}, ${4:v} in ${5:iterable}.items()}", "dict comprehension"),
          ];

          // Method completions after dot on known types
          if (textBefore.match(/\w+\.\s*$/)) {
            const listMethods = ["append", "extend", "insert", "remove", "pop", "sort", "reverse", "clear", "copy", "count", "index"].map(
              (m) => make(m, Func, `${m}($1)`, `list.${m}(...)`)
            );
            const strMethods = ["split", "join", "strip", "lstrip", "rstrip", "upper", "lower", "replace", "find", "startswith", "endswith", "format", "encode"].map(
              (m) => make(m, Func, `${m}($1)`, `str.${m}(...)`)
            );
            const dictMethods = ["keys", "values", "items", "get", "update", "pop", "setdefault", "clear", "copy"].map(
              (m) => make(m, Func, `${m}($1)`, `dict.${m}(...)`)
            );
            return { suggestions: [...listMethods, ...strMethods, ...dictMethods] };
          }

          return { suggestions: [...builtins, ...keywords] };
        },
      })
    );
  }

  // ── Java ─────────────────────────────────────────────────────────────────
  if (!registeredProviders.has("java")) {
    registeredProviders.add("java");
    providerDisposables.push(
      monaco.languages.registerCompletionItemProvider("java", {
        triggerCharacters: ["."],
        provideCompletionItems: () => ({
          suggestions: [
            make("sout", Snippet, 'System.out.println(${1:"Hello"});', "Print to stdout"),
            make("soutf", Snippet, "System.out.printf(${1:format}, ${2:args});", "Formatted print"),
            make("main", Snippet, "public static void main(String[] args) {\n\t${1}\n}", "main method"),
            make("for", Snippet, "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}", "for loop"),
            make("foreach", Snippet, "for (${1:Type} ${2:item} : ${3:collection}) {\n\t${4}\n}", "enhanced for"),
            make("while", Snippet, "while (${1:condition}) {\n\t${2}\n}", "while loop"),
            make("if", Snippet, "if (${1:condition}) {\n\t${2}\n}", "if statement"),
            make("try", Snippet, "try {\n\t${1}\n} catch (${2:Exception} e) {\n\t${3:e.printStackTrace();\n}", "try/catch"),
            make("ArrayList", Class, "ArrayList<${1:Type}> ${2:list} = new ArrayList<>();", "ArrayList"),
            make("HashMap", Class, "HashMap<${1:K}, ${2:V}> ${3:map} = new HashMap<>();", "HashMap"),
            make("HashSet", Class, "HashSet<${1:Type}> ${2:set} = new HashSet<>();", "HashSet"),
            make("Scanner", Class, "Scanner ${1:sc} = new Scanner(System.in);", "Scanner"),
            make("Arrays.sort", Func, "Arrays.sort(${1:arr});", "Sort array"),
            make("Arrays.toString", Func, "Arrays.toString(${1:arr})", "Array to string"),
            make("Integer.parseInt", Func, "Integer.parseInt(${1:str})", "Parse int"),
            make("Math.max", Func, "Math.max(${1:a}, ${2:b})", "Max of two"),
            make("Math.min", Func, "Math.min(${1:a}, ${2:b})", "Min of two"),
            make("Math.abs", Func, "Math.abs(${1:x})", "Absolute value"),
            make("String.valueOf", Func, "String.valueOf(${1:x})", "Convert to string"),
            make("sc.nextInt", Func, "${1:sc}.nextInt()", "Read int from scanner"),
            make("sc.nextLine", Func, "${1:sc}.nextLine()", "Read line from scanner"),
          ],
        }),
      })
    );
  }

  // ── C / C++ ──────────────────────────────────────────────────────────────
  for (const lang of ["c", "cpp"] as const) {
    if (!registeredProviders.has(lang)) {
      registeredProviders.add(lang);
      providerDisposables.push(
        monaco.languages.registerCompletionItemProvider(lang, {
          triggerCharacters: [".", ">", ":"],
          provideCompletionItems: () => ({
            suggestions: lang === "cpp" ? [
              make("cout", Snippet, 'cout << ${1:"Hello"} << endl;', "Print to stdout"),
              make("cin", Snippet, "cin >> ${1:var};", "Read from stdin"),
              make("for", Snippet, "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}", "for loop"),
              make("while", Snippet, "while (${1:condition}) {\n\t${2}\n}", "while loop"),
              make("vector", Class, "vector<${1:int}> ${2:v};", "vector"),
              make("map", Class, "map<${1:K}, ${2:V}> ${3:m};", "map"),
              make("unordered_map", Class, "unordered_map<${1:K}, ${2:V}> ${3:m};", "unordered_map"),
              make("set", Class, "set<${1:int}> ${2:s};", "set"),
              make("stack", Class, "stack<${1:int}> ${2:st};", "stack"),
              make("queue", Class, "queue<${1:int}> ${2:q};", "queue"),
              make("sort", Func, "sort(${1:v}.begin(), ${1:v}.end());", "Sort vector"),
              make("push_back", Func, "${1:v}.push_back(${2:val});", "Push to vector"),
              make("size", Func, "${1:v}.size()", "Size of container"),
              make("auto", Keyword, "auto ${1:var} = ${2:val};", "auto type deduction"),
              make("lambda", Snippet, "auto ${1:fn} = [${2:captures}](${3:params}) {\n\t${4}\n};", "lambda"),
              make("cout endl", Snippet, "cout << ${1:value} << endl;", "Print with newline"),
              make("include iostream", Snippet, "#include <iostream>\nusing namespace std;\n", "Include iostream"),
              make("include vector", Snippet, "#include <vector>\nusing namespace std;\n", "Include vector"),
              make("include algorithm", Snippet, "#include <algorithm>\nusing namespace std;\n", "Include algorithm"),
            ] : [
              make("printf", Func, 'printf("${1:%s}\\n", ${2:value});', "printf"),
              make("scanf", Func, 'scanf("${1:%d}", &${2:var});', "scanf"),
              make("for", Snippet, "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}", "for loop"),
              make("while", Snippet, "while (${1:condition}) {\n\t${2}\n}", "while loop"),
              make("malloc", Func, "malloc(${1:size} * sizeof(${2:type}))", "allocate memory"),
              make("free", Func, "free(${1:ptr});", "free memory"),
              make("include stdio", Snippet, "#include <stdio.h>\n", "Include stdio"),
              make("include stdlib", Snippet, "#include <stdlib.h>\n", "Include stdlib"),
              make("include string", Snippet, "#include <string.h>\n", "Include string"),
              make("struct", Snippet, "struct ${1:Name} {\n\t${2:int x};\n};", "struct definition"),
            ],
          }),
        })
      );
    }
  }

  // ── Go ───────────────────────────────────────────────────────────────────
  if (!registeredProviders.has("go")) {
    registeredProviders.add("go");
    providerDisposables.push(
      monaco.languages.registerCompletionItemProvider("go", {
        triggerCharacters: ["."],
        provideCompletionItems: () => ({
          suggestions: [
            make("fmt.Println", Func, "fmt.Println(${1:value})", "Print with newline"),
            make("fmt.Printf", Func, 'fmt.Printf("${1:%s}\\n", ${2:value})', "Formatted print"),
            make("fmt.Scanf", Func, 'fmt.Scanf("${1:%d}", &${2:var})', "Read formatted input"),
            make("fmt.Scan", Func, "fmt.Scan(&${1:var})", "Read input"),
            make("for", Snippet, "for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t${3}\n}", "for loop"),
            make("for range", Snippet, "for ${1:i}, ${2:v} := range ${3:slice} {\n\t${4}\n}", "range loop"),
            make("if", Snippet, "if ${1:condition} {\n\t${2}\n}", "if statement"),
            make("func", Snippet, "func ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}", "function"),
            make("make slice", Snippet, "make([]${1:int}, ${2:0}, ${3:cap})", "make slice"),
            make("make map", Snippet, "make(map[${1:K}]${2:V})", "make map"),
            make("append", Func, "append(${1:slice}, ${2:value})", "append to slice"),
            make("len", Func, "len(${1:v})", "length"),
            make("cap", Func, "cap(${1:v})", "capacity"),
            make("sort.Ints", Func, "sort.Ints(${1:slice})", "sort ints"),
            make("sort.Strings", Func, "sort.Strings(${1:slice})", "sort strings"),
            make("strconv.Atoi", Func, "strconv.Atoi(${1:str})", "string to int"),
            make("strconv.Itoa", Func, "strconv.Itoa(${1:n})", "int to string"),
            make("strings.Split", Func, "strings.Split(${1:s}, ${2:sep})", "split string"),
            make("strings.Join", Func, "strings.Join(${1:slice}, ${2:sep})", "join strings"),
            make("bufio.NewScanner", Snippet, "scanner := bufio.NewScanner(os.Stdin)\nfor scanner.Scan() {\n\t${1:line := scanner.Text()}\n}", "Scanner loop"),
          ],
        }),
      })
    );
  }

  // ── Rust ─────────────────────────────────────────────────────────────────
  if (!registeredProviders.has("rust")) {
    registeredProviders.add("rust");
    providerDisposables.push(
      monaco.languages.registerCompletionItemProvider("rust", {
        triggerCharacters: [".", ":"],
        provideCompletionItems: () => ({
          suggestions: [
            make("println!", Func, 'println!("${1:{}}", ${2:value});', "Print with newline"),
            make("print!", Func, 'print!("${1:{}}", ${2:value});', "Print without newline"),
            make("eprintln!", Func, 'eprintln!("${1:{}}", ${2:value});', "Print to stderr"),
            make("vec!", Snippet, "vec![${1:0, 1, 2}]", "Vec macro"),
            make("for", Snippet, "for ${1:item} in ${2:iter} {\n\t${3}\n}", "for loop"),
            make("while", Snippet, "while ${1:condition} {\n\t${2}\n}", "while loop"),
            make("fn", Snippet, "fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n\t${4}\n}", "function"),
            make("struct", Snippet, "struct ${1:Name} {\n\t${2:field}: ${3:Type},\n}", "struct"),
            make("impl", Snippet, "impl ${1:Name} {\n\tfn ${2:new}() -> Self {\n\t\t${3}\n\t}\n}", "impl block"),
            make("match", Snippet, "match ${1:value} {\n\t${2:pattern} => ${3:result},\n\t_ => ${4:default},\n}", "match expression"),
            make("if let", Snippet, "if let ${1:Some(val)} = ${2:option} {\n\t${3}\n}", "if let"),
            make("use std::io", Snippet, "use std::io::{self, BufRead};\n", "Import BufRead"),
            make("read_line", Snippet, "let mut input = String::new();\nstd::io::stdin().read_line(&mut input).unwrap();\nlet ${1:n}: ${2:i32} = input.trim().parse().unwrap();", "Read line"),
            make("HashMap", Class, "use std::collections::HashMap;\nlet mut ${1:map}: HashMap<${2:K}, ${3:V}> = HashMap::new();", "HashMap"),
            make("unwrap", Func, "unwrap()", "Unwrap Option/Result"),
            make("expect", Func, 'expect("${1:error message}")', "Unwrap with message"),
          ],
        }),
      })
    );
  }

  // ── Kotlin ───────────────────────────────────────────────────────────────
  if (!registeredProviders.has("kotlin")) {
    registeredProviders.add("kotlin");
    providerDisposables.push(
      monaco.languages.registerCompletionItemProvider("kotlin", {
        triggerCharacters: ["."],
        provideCompletionItems: () => ({
          suggestions: [
            make("println", Func, "println(${1:value})", "Print with newline"),
            make("print", Func, "print(${1:value})", "Print without newline"),
            make("readLine", Func, "readLine()", "Read line from stdin"),
            make("readLine toInt", Snippet, "readLine()!!.trim().toInt()", "Read int from stdin"),
            make("for", Snippet, "for (${1:i} in ${2:0 until n}) {\n\t${3}\n}", "for loop"),
            make("while", Snippet, "while (${1:condition}) {\n\t${2}\n}", "while loop"),
            make("fun", Snippet, "fun ${1:name}(${2:params}): ${3:Unit} {\n\t${4}\n}", "function"),
            make("data class", Snippet, "data class ${1:Name}(val ${2:field}: ${3:Type})", "data class"),
            make("listOf", Func, "listOf(${1:elements})", "Immutable list"),
            make("mutableListOf", Func, "mutableListOf(${1:elements})", "Mutable list"),
            make("mapOf", Func, "mapOf(${1:key to value})", "Immutable map"),
            make("mutableMapOf", Func, "mutableMapOf(${1:key to value})", "Mutable map"),
            make("sortedArray", Func, "${1:array}.sorted()", "Sort collection"),
            make("filter", Func, "${1:list}.filter { ${2:it > 0} }", "Filter list"),
            make("map", Func, "${1:list}.map { ${2:it * 2} }", "Map over list"),
            make("forEach", Func, "${1:list}.forEach { ${2:println(it)} }", "forEach"),
          ],
        }),
      })
    );
  }

  // ── Ruby ─────────────────────────────────────────────────────────────────
  if (!registeredProviders.has("ruby")) {
    registeredProviders.add("ruby");
    providerDisposables.push(
      monaco.languages.registerCompletionItemProvider("ruby", {
        triggerCharacters: ["."],
        provideCompletionItems: () => ({
          suggestions: [
            make("puts", Func, "puts ${1:value}", "Print with newline"),
            make("print", Func, "print ${1:value}", "Print without newline"),
            make("gets", Func, "gets.chomp", "Read line from stdin"),
            make("gets.to_i", Snippet, "gets.chomp.to_i", "Read int from stdin"),
            make("each", Func, "${1:collection}.each do |${2:item}|\n\t${3}\nend", "each block"),
            make("map", Func, "${1:collection}.map { |${2:item}| ${3:item} }", "map"),
            make("select", Func, "${1:collection}.select { |${2:item}| ${3:condition} }", "filter"),
            make("times", Func, "${1:n}.times do |${2:i}|\n\t${3}\nend", "n.times loop"),
            make("def", Snippet, "def ${1:method_name}(${2:params})\n\t${3}\nend", "method"),
            make("class", Snippet, "class ${1:ClassName}\n\tdef initialize(${2:params})\n\t\t${3}\n\tend\nend", "class"),
            make("sort", Func, "${1:array}.sort", "sort array"),
            make("sort_by", Func, "${1:array}.sort_by { |${2:x}| ${3:x} }", "sort_by"),
            make("reduce", Func, "${1:array}.reduce(${2:0}) { |${3:acc}, ${4:x}| ${5:acc + x} }", "reduce"),
            make("include", Func, "${1:array}.include?(${2:value})", "include?"),
            make("p", Func, "p ${1:value}", "Inspect and print"),
          ],
        }),
      })
    );
  }

  // ── PHP ──────────────────────────────────────────────────────────────────
  if (!registeredProviders.has("php")) {
    registeredProviders.add("php");
    providerDisposables.push(
      monaco.languages.registerCompletionItemProvider("php", {
        triggerCharacters: [">", ":"],
        provideCompletionItems: () => ({
          suggestions: [
            make("echo", Func, "echo ${1:value};", "Echo output"),
            make("print_r", Func, "print_r(${1:value});", "Print readable"),
            make("var_dump", Func, "var_dump(${1:value});", "Dump variable"),
            make("fgets", Func, "fgets(STDIN)", "Read from stdin"),
            make("for", Snippet, "for ($${1:i} = 0; $${1:i} < ${2:n}; $${1:i}++) {\n\t${3}\n}", "for loop"),
            make("foreach", Snippet, "foreach ($${1:arr} as $${2:key} => $${3:val}) {\n\t${4}\n}", "foreach"),
            make("function", Snippet, "function ${1:name}($${2:params}) {\n\t${3}\n}", "function"),
            make("array_push", Func, "array_push($${1:arr}, ${2:value});", "Push to array"),
            make("array_map", Func, "array_map(fn($${1:x}) => ${2:expr}, $${3:arr})", "array_map"),
            make("array_filter", Func, "array_filter($${1:arr}, fn($${2:x}) => ${3:cond})", "array_filter"),
            make("sort", Func, "sort($${1:arr});", "Sort array"),
            make("count", Func, "count($${1:arr})", "Count elements"),
            make("implode", Func, 'implode("${1:,}", $${2:arr})', "Join array"),
            make("explode", Func, 'explode("${1:,}", $${2:str})', "Split string"),
            make("intval", Func, "intval($${1:val})", "Convert to int"),
          ],
        }),
      })
    );
  }
}

export function CodeEditor({ language, value, onChange, onRun, readOnly }: Props) {
  const monacoLang = MONACO_LANG[language] ?? "plaintext";

  const [theme, setTheme] = useState<string>("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(DEFAULT_HEIGHT);

  // Keep onRun stable inside Monaco action
  const onRunRef = useRef(onRun);
  useEffect(() => { onRunRef.current = onRun; }, [onRun]);

  const onMount = useCallback(
    (editor: MonacoEditor.IStandaloneCodeEditor, monaco: typeof import("monaco-editor")) => {
      editorRef.current = editor;

      // Track cursor position
      editor.onDidChangeCursorPosition((e) => {
        setCursorLine(e.position.lineNumber);
        setCursorCol(e.position.column);
      });

      // Run — Ctrl/Cmd + Enter
      editor.addAction({
        id: "run-code",
        label: "Run Code",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => { onRunRef.current?.(); },
      });

      // Format — Ctrl/Cmd + Shift + F
      editor.addAction({
        id: "format-document",
        label: "Format Document",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
        run: (ed) => { void ed.getAction("editor.action.formatDocument")?.run(); },
      });

      // Register language-specific snippet/completion providers (once per language)
      registerLanguageCompletions(monaco);
    },
    [],
  );

  // Resize handle drag
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartH.current = height;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = ev.clientY - dragStartY.current;
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [height]);

  const isDark = theme !== "vs";

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className={`flex items-center gap-3 px-3 py-1.5 border-b text-xs ${isDark ? "bg-zinc-900 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700"}`}>
        {/* Theme */}
        <div className="flex items-center gap-1.5">
          <span className={isDark ? "text-zinc-500" : "text-zinc-400"}>Theme</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className={`text-xs rounded px-1.5 py-0.5 border focus:outline-none ${isDark ? "bg-zinc-800 border-zinc-600 text-zinc-200" : "bg-white border-zinc-300 text-zinc-700"}`}
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className={`h-3 w-px ${isDark ? "bg-zinc-700" : "bg-zinc-300"}`} />

        {/* Font size */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFontSize((f) => Math.max(10, f - 1))}
            title="Decrease font size"
            className={`w-5 h-5 rounded flex items-center justify-center leading-none font-bold ${isDark ? "hover:bg-zinc-700" : "hover:bg-zinc-200"}`}
          >
            −
          </button>
          <span className={`w-8 text-center tabular-nums ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{fontSize}px</span>
          <button
            type="button"
            onClick={() => setFontSize((f) => Math.min(24, f + 1))}
            title="Increase font size"
            className={`w-5 h-5 rounded flex items-center justify-center leading-none font-bold ${isDark ? "hover:bg-zinc-700" : "hover:bg-zinc-200"}`}
          >
            +
          </button>
        </div>

        <div className={`h-3 w-px ${isDark ? "bg-zinc-700" : "bg-zinc-300"}`} />

        {/* Shortcuts hint */}
        <span className={isDark ? "text-zinc-600" : "text-zinc-400"}>
          <kbd className={`px-1 rounded ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}>Ctrl+Enter</kbd> run
          {" · "}
          <kbd className={`px-1 rounded ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}>Ctrl+Shift+F</kbd> format
        </span>
      </div>

      {/* Monaco editor */}
      <MonacoReact
        height={`${height}px`}
        language={monacoLang}
        theme={theme}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          readOnly: !!readOnly,
          // Layout
          minimap: { enabled: false },
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          lineDecorationsWidth: 4,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          wordWrap: "on",
          // Font
          fontSize,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
          fontLigatures: true,
          // Suggestions & IntelliSense
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          quickSuggestionsDelay: 100,
          parameterHints: { enabled: true, cycle: true },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
            showClasses: true,
            showMethods: true,
            showVariables: true,
            showModules: true,
            insertMode: "replace",
            filterGraceful: true,
          },
          acceptSuggestionOnEnter: "smart",
          tabCompletion: "on",
          // Brackets & quotes
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          autoSurround: "languageDefined",
          matchBrackets: "always",
          // Folding
          folding: true,
          foldingHighlight: true,
          showFoldingControls: "mouseover",
          // Formatting
          formatOnPaste: true,
          formatOnType: false,
          // Whitespace & rendering
          renderWhitespace: "selection",
          renderLineHighlight: "gutter",
          // Scrollbar
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            useShadows: false,
          },
          // UX
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          mouseWheelZoom: true,
          // Tab
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
        }}
        onMount={onMount}
      />

      {/* Resize handle */}
      <div
        onMouseDown={onResizeMouseDown}
        title="Drag to resize editor"
        className={`h-2.5 flex items-center justify-center cursor-ns-resize group border-y transition-colors ${isDark ? "bg-zinc-900 border-zinc-700 hover:bg-blue-900/40" : "bg-zinc-100 border-zinc-200 hover:bg-blue-100"}`}
      >
        <div className={`w-10 h-0.5 rounded-full transition-colors ${isDark ? "bg-zinc-700 group-hover:bg-blue-500" : "bg-zinc-300 group-hover:bg-blue-400"}`} />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-blue-700 text-[10px] text-blue-100 select-none font-mono">
        <span>Ln {cursorLine}, Col {cursorCol}</span>
        <div className="flex items-center gap-3">
          <span>Tab: {2} spaces</span>
          <span className="uppercase tracking-wide">{language}</span>
        </div>
      </div>
    </div>
  );
}
