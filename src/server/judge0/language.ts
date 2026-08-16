/**
 * Language detection and source normalisation for Judge0 submissions.
 *
 * Judge0 CE writes the submitted source to a fixed filename per language and
 * compiles/runs it with a fixed entrypoint. For Java that means the source is
 * written to `Main.java`, compiled with `javac Main.java`, and executed with
 * `java Main`. UIL reference solutions are normally written as a standalone
 * file with an arbitrary public class name (e.g. `public class Prob1`), which
 * javac rejects when the filename doesn't match. They may also carry a
 * `package` declaration, which would place the class in a subdirectory and
 * break `java Main`.
 *
 * `prepareSource` rewrites those cases so a solution that is valid on its own
 * also runs unmodified on Judge0.
 */

/** Judge0 CE language IDs (stable across standard installations). */
export const LANGUAGE_IDS = {
  c: 50,
  cpp: 54,
  java: 62,
  javascript: 63,
  python: 71,
} as const;

export type LanguageKey = keyof typeof LANGUAGE_IDS;

export interface DetectedLanguage {
  key: LanguageKey;
  id: number;
  name: string;
}

const LANGUAGE_NAMES: Record<LanguageKey, string> = {
  c: "C (GCC)",
  cpp: "C++ (GCC)",
  java: "Java (OpenJDK)",
  javascript: "JavaScript (Node.js)",
  python: "Python 3",
};

/**
 * Best-effort language detection from source text.
 *
 * UIL competitions are Java, so Java is both the strongest signal and the
 * fallback when nothing else matches.
 */
export function detectLanguage(source: string): DetectedLanguage {
  const s = source;

  const key: LanguageKey = (() => {
    if (
      /\bimport\s+java\./.test(s) ||
      /\bpublic\s+class\b/.test(s) ||
      /\bSystem\.out\.(?:print|write)/.test(s)
    ) {
      return "java";
    }
    if (/#include\s*<\s*(?:iostream|bits\/stdc\+\+\.h|vector|string)\s*>/.test(s))
      return "cpp";
    if (/\busing\s+namespace\s+std\s*;/.test(s) || /\bstd::/.test(s))
      return "cpp";
    if (/#include\s*<\s*stdio\.h\s*>/.test(s) || /\bprintf\s*\(/.test(s))
      return "c";
    if (
      /^\s*(?:from|import)\s+\w+/m.test(s) ||
      /\bprint\s*\(/.test(s) ||
      /\bdef\s+\w+\s*\(/.test(s)
    ) {
      return "python";
    }
    if (
      /\bconsole\.log\s*\(/.test(s) ||
      /\b(?:const|let)\s+\w+\s*=/.test(s) ||
      /\brequire\s*\(/.test(s)
    ) {
      return "javascript";
    }
    return "java";
  })();

  return { key, id: LANGUAGE_IDS[key], name: LANGUAGE_NAMES[key] };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds the name of the class that declares `main`, which must become `Main`.
 *
 * Scans for the last class declaration appearing before the `main` method, so
 * that helper classes declared above the entrypoint aren't picked by mistake.
 */
function findJavaEntryClass(source: string): string | null {
  const mainIndex = source.search(
    /(?:public\s+|static\s+|final\s+|synchronized\s+)*void\s+main\s*\(/,
  );
  if (mainIndex === -1) return null;

  const classRe = /\bclass\s+([A-Za-z_$][\w$]*)/g;
  let entry: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = classRe.exec(source)) !== null) {
    if (match.index >= mainIndex) break;
    entry = match[1] ?? entry;
  }
  return entry;
}

/**
 * Blanks out `package foo.bar;` declarations (Judge0 compiles into a flat dir,
 * so a package would place the class in a subdirectory and break `java Main`).
 *
 * The line is emptied rather than deleted so that every subsequent line keeps
 * its original number. Judge0 reports compile errors as `Main.java:12: error:`,
 * and those numbers are shown against the admin's own source — deleting a line
 * here would silently shift every reported number by one.
 */
function stripJavaPackage(source: string): string {
  return source.replace(
    /^[ \t]*package\s+[\w.]+\s*;[ \t]*(\r?\n|$)/gm,
    "$1",
  );
}

export interface PreparedSource {
  source: string;
  /** Human-readable notes about rewrites applied, surfaced to the admin. */
  notes: string[];
}

/**
 * Extracts the 1-based source line from compiler/interpreter diagnostics.
 *
 * Because `prepareSource` only renames identifiers and blanks lines in place,
 * the number reported by the toolchain refers to the same line in the admin's
 * original source — so it can be used directly to jump the editor there.
 *
 * Recognised shapes:
 *   javac    `Main.java:12: error: ';' expected`
 *   gcc/g++  `main.cpp:12:5: error: ...`
 *   python   `File "main.py", line 12`
 *   node     `main.js:12`
 */
export function parseCompileErrorLine(diagnostics: string): number | null {
  if (!diagnostics) return null;

  const patterns = [
    /^\s*File\s+"[^"]*",\s*line\s+(\d+)/m,
    /[\w./-]+\.(?:java|c|cc|cpp|cxx|py|js|mjs):(\d+)(?::\d+)?/,
    /\bline\s+(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(diagnostics);
    const raw = match?.[1];
    if (!raw) continue;
    const line = Number.parseInt(raw, 10);
    if (Number.isInteger(line) && line > 0) return line;
  }

  return null;
}

/**
 * Normalises source so it runs under Judge0's fixed filename/entrypoint rules.
 * Currently only Java needs rewriting; other languages pass through untouched.
 */
export function prepareSource(
  source: string,
  language: DetectedLanguage,
): PreparedSource {
  if (language.key !== "java") return { source, notes: [] };

  const notes: string[] = [];
  let out = source;

  const withoutPackage = stripJavaPackage(out);
  if (withoutPackage !== out) {
    notes.push(
      "Removed `package` declaration (Judge0 compiles in a flat dir). Line numbers are preserved.",
    );
    out = withoutPackage;
  }

  const declaredClasses = [...out.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)].map(
    (m) => m[1],
  );

  // Nothing to rename if the entrypoint is already `Main`, or if a class named
  // `Main` already exists (renaming would collide).
  if (declaredClasses.includes("Main")) return { source: out, notes };

  const entry = findJavaEntryClass(out) ?? declaredClasses[0];
  if (!entry) return { source: out, notes };

  out = out.replace(new RegExp(`\\b${escapeRegExp(entry)}\\b`, "g"), "Main");
  notes.push(`Renamed class \`${entry}\` to \`Main\` for Judge0's entrypoint.`);

  return { source: out, notes };
}
