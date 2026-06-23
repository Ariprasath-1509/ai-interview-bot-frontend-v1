"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { MONACO_LANG } from "./codingTypes";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center bg-zinc-950 text-zinc-400">
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

export function CodeEditor({ language, value, onChange, onRun, readOnly }: Props) {
  const monacoLang = MONACO_LANG[language] ?? "plaintext";

  return (
    <Monaco
      height="320px"
      language={monacoLang}
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      options={{
        readOnly: !!readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        padding: { top: 12, bottom: 12 },
      }}
      onMount={(editor, monaco) => {
        editor.addAction({
          id: "run-code",
          label: "Run Code",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
          run: () => { onRun?.(); },
        });
      }}
    />
  );
}
