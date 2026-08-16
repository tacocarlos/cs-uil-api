"use client";

import { useEffect, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { Decoration, EditorView } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";

import { cn } from "@/lib/utils";
import { detectLanguage } from "@/server/judge0/language";
import type { LanguageKey } from "@/server/judge0/language";

/**
 * Shared code editor for reference solutions.
 *
 * Language selection reuses the judge's own `detectLanguage`, so the editor and
 * Judge0 can never disagree about what a solution is written in.
 *
 * Theming is driven entirely by the CSS custom properties defined in
 * `globals.css`. That means light/dark follows the `.dark` class through plain
 * CSS cascade — no `useTheme()`, no re-mounting the editor on theme change, and
 * no flash of the wrong palette during hydration.
 */

const LANGUAGE_EXTENSIONS = {
  java: () => java(),
  python: () => python(),
  cpp: () => cpp(),
  c: () => cpp(),
  javascript: () => javascript(),
} satisfies Record<LanguageKey, () => ReturnType<typeof java>>;

/**
 * Maps Lezer highlight tags onto the `--code-*` tokens.
 *
 * Structure is conveyed by weight as much as hue, which keeps the editor
 * readable inside a near-monochrome design system instead of turning it into
 * the one rainbow surface on the site.
 */
const highlightStyle = HighlightStyle.define([
  {
    tag: [
      t.keyword,
      t.moduleKeyword,
      t.controlKeyword,
      t.operatorKeyword,
      t.definitionKeyword,
      t.modifier,
      t.self,
    ],
    color: "var(--code-keyword)",
    fontWeight: "500",
  },
  {
    tag: [t.string, t.special(t.string), t.regexp],
    color: "var(--code-string)",
  },
  { tag: [t.number, t.bool, t.null], color: "var(--code-number)" },
  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
    color: "var(--code-comment)",
    fontStyle: "italic",
  },
  {
    tag: [t.typeName, t.className, t.namespace, t.standard(t.typeName)],
    color: "var(--code-type)",
    fontWeight: "600",
  },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName],
    color: "var(--code-function)",
    fontWeight: "500",
  },
  {
    tag: [t.variableName, t.propertyName, t.attributeName],
    color: "var(--code-variable)",
  },
  {
    tag: [t.operator, t.punctuation, t.bracket, t.separator, t.meta],
    color: "var(--code-operator)",
  },
  { tag: t.invalid, color: "var(--code-invalid)" },
]);

/**
 * Chrome styling for the off-black editor well.
 *
 * Every colour comes from the `--code-*` tokens rather than the site's themed
 * tokens. That is required, not stylistic: the surface is dark in both site
 * themes, so `--foreground` / `--muted-foreground` / `--border` would invert
 * underneath it and become invisible in light mode.
 *
 * Neutral tints are mixed from `--code-fg` so they stay subtle but present.
 * Red is reserved for keywords and the diagnostic line — selection and bracket
 * matching stay neutral so a red wash never reads as an error.
 *
 * Declared with `{ dark: true }` so CodeMirror's own base styles (selection
 * layers, unfocused selection) resolve for a dark surface. This must be paired
 * with `theme="none"` on the component: the wrapper otherwise injects
 * `EditorView.theme({ '&': { backgroundColor: '#fff' } })` and paints white
 * over everything below.
 */
const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--code-bg)",
      color: "var(--code-fg)",
      fontSize: "0.75rem",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-content": {
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      caretColor: "var(--code-fg)",
      padding: "0.75rem 0",
    },
    ".cm-gutters": {
      backgroundColor: "var(--code-bg)",
      color: "var(--code-comment)",
      border: "none",
      borderRight: "1px solid var(--code-border)",
      userSelect: "none",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 0.625rem 0 0.75rem",
      minWidth: "2.5ch",
    },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in oklch, var(--code-fg) 5%, transparent)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in oklch, var(--code-fg) 5%, transparent)",
      color: "var(--code-fg)",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--code-fg)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "color-mix(in oklch, var(--code-fg) 18%, transparent)",
      },
    ".cm-selectionMatch": {
      backgroundColor: "color-mix(in oklch, var(--code-fg) 11%, transparent)",
    },
    ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
      backgroundColor: "color-mix(in oklch, var(--code-fg) 15%, transparent)",
      outline: "none",
    },
    ".cm-scroller": { overflow: "auto", lineHeight: "1.6" },
    ".cm-placeholder": { color: "var(--code-comment)" },
    // Diagnostic line (see `errorLine`) — the one place red is used for chrome.
    ".cm-line.cm-errorLine": {
      backgroundColor:
        "color-mix(in oklch, var(--code-invalid) 16%, transparent)",
      boxShadow: "inset 2px 0 0 0 var(--code-invalid)",
    },
  },
  { dark: true },
);

// ── Error-line decoration ──────────────────────────────────────────────────
//
// Implemented as a StateField rather than by toggling DOM classes: CodeMirror
// virtualises long documents and recycles line elements as they scroll, so a
// class set directly on `.cm-line` is silently dropped. A decoration is also
// remapped through document edits, so the marker follows the line as the admin
// types above it.

const setErrorLine = StateEffect.define<number | null>();

const errorLineDecoration = Decoration.line({ class: "cm-errorLine" });

const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, tr) {
    let next = decorations.map(tr.changes);

    for (const effect of tr.effects) {
      if (!effect.is(setErrorLine)) continue;

      if (effect.value === null) {
        next = Decoration.none;
        continue;
      }

      const lineNumber = Math.min(
        Math.max(1, effect.value),
        tr.state.doc.lines,
      );
      const line = tr.state.doc.line(lineNumber);
      next = Decoration.set([errorLineDecoration.range(line.from)]);
    }

    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Overrides language detection when the language is already known. */
  language?: LanguageKey;
  readOnly?: boolean;
  /** 1-based line to highlight and scroll to, e.g. a compile-error line. */
  errorLine?: number | null;
  minHeight?: string;
  maxHeight?: string;
  placeholder?: string;
  className?: string;
  /** Rendered under the editor, e.g. a "jump to error" affordance. */
  ariaLabel?: string;
}

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  errorLine = null,
  minHeight = "24rem",
  maxHeight,
  placeholder,
  className,
  ariaLabel = "Source code editor",
}: CodeEditorProps) {
  const ref = useRef<ReactCodeMirrorRef>(null);

  // Detect from content only when not explicitly told, and only on meaningful
  // changes — re-running per keystroke would swap the parser constantly.
  const detectedKey = useMemo<LanguageKey>(() => {
    if (language) return language;
    return detectLanguage(value.slice(0, 4_000)).key;
  }, [language, value.slice(0, 4_000)]);

  const extensions = useMemo(
    () => [
      LANGUAGE_EXTENSIONS[detectedKey](),
      syntaxHighlighting(highlightStyle),
      editorTheme,
      errorLineField,
      EditorView.lineWrapping,
      EditorState.tabSize.of(4),
    ],
    [detectedKey],
  );

  // Mark and reveal the reported diagnostic line.
  useEffect(() => {
    const view = ref.current?.view;
    if (!view) return;

    const valid =
      errorLine !== null && errorLine >= 1 && errorLine <= view.state.doc.lines;

    view.dispatch({
      effects: [
        setErrorLine.of(valid ? errorLine : null),
        ...(valid
          ? [
              EditorView.scrollIntoView(view.state.doc.line(errorLine).from, {
                y: "center",
              }),
            ]
          : []),
      ],
    });
  }, [errorLine]);

  return (
    <div
      className={cn(
        // An off-black well in both themes. Keeps the `Textarea` primitive's
        // radius and focus treatment so it still reads as part of the form,
        // but with its own dark surface rather than the themed field fill.
        "overflow-hidden rounded-2xl border bg-(--code-bg) transition-[color,box-shadow,border-color]",
        "border-(--code-border) focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
        readOnly && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <CodeMirror
        ref={ref}
        value={value}
        onChange={onChange}
        extensions={extensions}
        // Suppress the wrapper's built-in light theme; `editorTheme` is the
        // single source of truth for the editor's appearance.
        theme="none"
        readOnly={readOnly}
        editable={!readOnly}
        placeholder={placeholder}
        height="100%"
        minHeight={minHeight}
        maxHeight={maxHeight}
        aria-label={ariaLabel}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          history: true,
          foldGutter: false,
          autocompletion: false,
          highlightSelectionMatches: true,
          searchKeymap: true,
          // Tab is deliberately left as focus navigation rather than bound to
          // indent: trapping it would strand keyboard users inside the editor.
          // CodeMirror still offers Mod-] / Mod-[ for indentation.
          indentOnInput: true,
        }}
      />
    </div>
  );
}
