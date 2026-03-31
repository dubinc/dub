"use client";

import { Check, Copy, Download } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import {
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { BundledLanguage, Highlighter } from "shiki";

let _highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!_highlighterPromise) {
    _highlighterPromise = import("shiki").then(({ createHighlighter }) =>
      createHighlighter({ themes: ["github-light"], langs: [] }),
    );
  }
  return _highlighterPromise;
}

async function highlightCode(
  code: string,
  lang: string,
): Promise<string | null> {
  try {
    const highlighter = await getHighlighter();
    const loaded = highlighter.getLoadedLanguages();
    if (lang && !loaded.includes(lang as BundledLanguage)) {
      try {
        await highlighter.loadLanguage(lang as BundledLanguage);
      } catch {
        return null;
      }
    }
    const html = highlighter.codeToHtml(code, {
      lang: lang || "text",
      theme: "github-light",
    });

    const start = html.indexOf("<code");
    const codeStart = html.indexOf(">", start) + 1;
    const codeEnd = html.lastIndexOf("</code>");
    if (start !== -1 && codeEnd !== -1) return html.slice(codeStart, codeEnd);
    return null;
  } catch {
    return null;
  }
}

const LANG_EXTENSIONS: Record<string, string> = {
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  tsx: "tsx",
  jsx: "jsx",
  python: "py",
  py: "py",
  bash: "sh",
  sh: "sh",
  shell: "sh",
  shellscript: "sh",
  zsh: "zsh",
  ruby: "rb",
  rb: "rb",
  go: "go",
  rust: "rs",
  rs: "rs",
  css: "css",
  scss: "scss",
  sass: "sass",
  html: "html",
  xml: "xml",
  json: "json",
  yaml: "yaml",
  yml: "yml",
  toml: "toml",
  sql: "sql",
  php: "php",
  java: "java",
  kotlin: "kt",
  swift: "swift",
  c: "c",
  cpp: "cpp",
  cs: "cs",
  markdown: "md",
  md: "md",
};

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    if (copied) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for iframe contexts where clipboard API is restricted
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [code, copied]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
      title={copied ? "Copied!" : "Copy code"}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function DownloadButton({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const handleDownload = useCallback(() => {
    const trimmed = language?.trim().toLowerCase();
    const ext = (trimmed && (LANG_EXTENSIONS[trimmed] ?? trimmed)) || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, language]);

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
      title="Download file"
    >
      <Download className="size-3.5" />
    </button>
  );
}

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const trimmedCode = code.replace(/\n+$/, "");
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!trimmedCode) return;
    highlightCode(trimmedCode, language).then(setHighlightedHtml);
  }, [trimmedCode, language]);

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-neutral-200 text-sm">
      <div className="flex h-9 items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3">
        <span className="font-mono text-xs lowercase text-neutral-400">
          {language || "code"}
        </span>
        <div className="flex items-center gap-0.5">
          <DownloadButton code={trimmedCode} language={language} />
          <CopyButton code={trimmedCode} />
        </div>
      </div>

      <div className="overflow-x-auto bg-white px-4 py-3">
        <pre className="m-0 bg-transparent font-mono text-[13px] leading-relaxed">
          {highlightedHtml ? (
            <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          ) : (
            <code className="text-neutral-700">{trimmedCode}</code>
          )}
        </pre>
      </div>
    </div>
  );
}

export function MarkdownCodeBlock({
  className,
  children,
  node: _node,
  "data-block": dataBlock,
}: React.HTMLAttributes<HTMLElement> & {
  node?: unknown;
  "data-block"?: string;
}) {
  if (!dataBlock) {
    return (
      <code
        className={cn(
          "rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.8em] text-neutral-700",
          className,
        )}
      >
        {children}
      </code>
    );
  }

  const langMatch = className?.match(/language-([^\s]+)/);
  const language = langMatch?.[1] ?? "";

  let code = "";
  if (
    isValidElement(children) &&
    children.props !== null &&
    typeof children.props === "object" &&
    "children" in children.props &&
    typeof (children.props as { children: unknown }).children === "string"
  ) {
    code = (children.props as { children: string }).children;
  } else if (typeof children === "string") {
    code = children;
  }

  return <CodeBlock code={code} language={language} />;
}
