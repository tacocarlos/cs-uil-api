import AdmZip from "adm-zip";

import type { RawProblemFiles } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

/**
 * Source-code file extensions recognised as the "solution" file for a problem.
 * UIL standard is Java; others are kept for flexibility.
 */
const SOLUTION_EXTS = new Set([".java", ".cpp", ".py", ".c", ".cs", ".kt"]);

/**
 * Substrings searched (OR) in directory names to locate the judge folder.
 * Mirrors UILaunch: ReadFromDir("Solutions", "JudgeData", "OutFiles")
 * (UILaunch passes all three as an AND-list, but that is a latent bug — any real
 * UIL zip only ever uses one of these names.  We use OR, which works correctly.)
 */
const JUDGE_DIR_KEYWORDS = ["solutions", "judgedata", "outfiles"];

/**
 * Substrings searched (OR) in directory names to locate the student data folder.
 */
const STUDENT_DIR_KEYWORDS = ["studentdata"];

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function getExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

function readText(entry: AdmZip.IZipEntry): string {
  return entry.getData().toString("utf8");
}

/**
 * Normalise a problem name for fuzzy matching.
 *   "Linked List" → "linkedlist"
 *   "LinkedList"  → "linkedlist"
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD") // decompose accented chars: "ç" → "c" + combining cedilla
    .replace(/\p{M}/gu, "") // strip all Unicode combining marks (accents, diacritics)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // strip remaining non-alphanumeric characters
}

// ---------------------------------------------------------------------------
// ZIP structure traversal — mirrors UILaunch's IOUtils helpers
// ---------------------------------------------------------------------------

/**
 * Mirrors the block after IOUtils.unzip() that sets CompetitionDir:
 *
 *   Set<String> F = listFiles(destDir, false);   // files AND dirs at root
 *   CompetitionDir = F.stream()
 *     .filter(f -> !f.contains("MACOS"))
 *     .findFirst()
 *     .orElse("");
 *
 * We infer the top-level directory names from the entry paths rather than
 * from the filesystem, and return the first one that is not __MACOSX / hidden.
 * Returns an empty string when the zip has no consistent top-level folder
 * (i.e. files sit at root).
 */
function findCompetitionDir(entries: AdmZip.IZipEntry[]): string {
  const seen = new Set<string>();

  for (const entry of entries) {
    const path = entry.entryName.replace(/\\/g, "/");
    const first = path.split("/")[0] ?? "";
    if (!first) continue;
    if (first.toUpperCase().includes("MACOS")) continue;
    if (first.startsWith(".") || first.startsWith("__")) continue;

    // Only consider names that ARE directories (i.e. have children under them).
    const isDir = entries.some((e) => {
      const p = e.entryName.replace(/\\/g, "/");
      return p.startsWith(first + "/") && p.length > first.length + 1;
    });

    if (isDir && !seen.has(first)) {
      seen.add(first);
      // UILaunch returns the *first* non-MACOS entry — we do the same.
      return first;
    }
  }

  return ""; // files sit directly at zip root
}

/**
 * Mirrors IOUtils.listFiles(dir, ignoreDir=true):
 *   Files.list(dir).filter(not directory).map(toString)
 *
 * Returns every non-directory entry that is a *direct child* of dirPath.
 * The returned filename is the leaf name only (no path prefix).
 */
function listFiles(
  entries: AdmZip.IZipEntry[],
  dirPath: string,
): Array<{ filename: string; entry: AdmZip.IZipEntry }> {
  // normalise: no trailing slash
  const dir = dirPath.replace(/\/$/, "");
  const prefix = dir ? dir + "/" : "";
  const result: Array<{ filename: string; entry: AdmZip.IZipEntry }> = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const path = entry.entryName.replace(/\\/g, "/");
    if (!path.startsWith(prefix)) continue;

    const rest = path.slice(prefix.length);
    // Direct child only — rest must be a plain filename with no slash.
    if (!rest || rest.includes("/")) continue;

    result.push({ filename: rest, entry });
  }

  return result;
}

/**
 * Mirrors IOUtils.checkDir(dir, ignoreDir=false, ...keywords):
 *
 *   Set<String> files = listFiles(dir, false);  // includes subdirs
 *   for (String f : files)
 *     if (containsWords(f, terms)) return f;
 *   return null;
 *
 * UILaunch's containsWords() checks that the path contains ALL supplied terms
 * (AND logic), which is a bug — no UIL directory name ever contains all three
 * of {"Solutions","JudgeData","OutFiles"} simultaneously.  We use OR: return
 * the first direct-child directory whose name contains ANY keyword.
 */
function checkDir(
  entries: AdmZip.IZipEntry[],
  parentDir: string,
  keywords: string[],
): string | null {
  const parent = parentDir.replace(/\/$/, "");
  const prefix = parent ? parent + "/" : "";

  // Collect unique direct-child *directory* names inferred from file paths.
  // We can't rely on explicit directory entries because some zippers omit them.
  const subDirNames = new Set<string>();

  for (const entry of entries) {
    const path = entry.entryName.replace(/\\/g, "/");
    if (!path.startsWith(prefix)) continue;

    const rest = path.slice(prefix.length);
    const segments = rest.split("/").filter(Boolean);

    // A direct-child directory appears when any entry has >= 2 segments,
    // or when the entry itself is a directory with exactly 1 remaining segment.
    if (segments.length >= 2) {
      subDirNames.add(segments[0]!);
    } else if (entry.isDirectory && segments.length === 1) {
      subDirNames.add(segments[0]!);
    }
  }

  // OR match: find the first subdirectory whose name contains any keyword.
  for (const name of subDirNames) {
    const nameLC = name.toLowerCase();
    if (keywords.every((kw) => nameLC.includes(kw.toLowerCase()))) {
      return prefix + name; // full path without trailing slash
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Judge directory — mirrors Competition.ReadFromDir() first half
// ---------------------------------------------------------------------------

interface JudgeProblem {
  /** Raw name taken from the solution filename stem, e.g. "LinkedList" */
  name: string;
  testData: string;
  testOutput: string;
  solution: string;
  images: Array<{ filename: string; data: Buffer; mimeType: string }>;
}

/**
 * Direct port of the judge-folder section of ReadFromDir():
 *
 * 1.  Collect problem names from files that are NOT .out or .dat:
 *       problemNames.add(filename.split(".")[0])
 *     This picks up .java files whose stem IS the canonical problem name.
 *
 * 2.  For each name (sorted — TreeSet), filter files by
 *       filename.toLowerCase().startsWith(nameLC)
 *     and classify by the LAST part of filename.split("."):
 *       "out"  → judgeOut
 *       "dat"  → judgeData
 *       "java" → codePath
 *
 * 3.  Skip the problem when neither judgeOut nor codePath is found
 *     (mirrors: if (!notNull(judgeOut, codePath)) return).
 *     judgeData may legitimately be absent (e.g. Q1 has no input file).
 */
function extractJudgeProblems(
  entries: AdmZip.IZipEntry[],
  judgeDirPath: string,
): JudgeProblem[] {
  const files = listFiles(entries, judgeDirPath);

  // ── Step 1: collect problem names ────────────────────────────────────────
  // files.filter(f -> !(f.endsWith(".out") || f.endsWith(".dat")))
  //      .forEach(f -> problemNames.add(filename.split(".")[0]))
  const problemNames = new Set<string>();

  for (const { filename } of files) {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".out") || lower.endsWith(".dat")) continue;
    if (lower.endsWith(".ans") || lower.endsWith(".in")) continue; // extra UIL variants

    // Take the stem before the FIRST dot — Java's split("\\.")[0]
    const stem = filename.split(".")[0];
    if (stem) problemNames.add(stem);
  }

  // ── Step 2: classify files per problem ───────────────────────────────────
  const problems: JudgeProblem[] = [];

  // Sort mirrors Java's TreeSet<String> (natural String ordering).
  for (const name of [...problemNames].sort()) {
    const nameLC = name.toLowerCase();

    let judgeDataEntry: AdmZip.IZipEntry | null = null;
    let judgeOutEntry: AdmZip.IZipEntry | null = null;
    let codeEntry: AdmZip.IZipEntry | null = null;
    const imageEntries: Array<{ filename: string; entry: AdmZip.IZipEntry }> =
      [];

    for (const { filename, entry } of files) {
      // filename.toLowerCase().startsWith(nameLC)
      if (!filename.toLowerCase().startsWith(nameLC)) continue;

      // ext = f.split("\\.")[last]  (Java splits the full path, but leaf name
      // behaves identically for a plain filename with one extension)
      const parts = filename.split(".");
      const ext = (parts[parts.length - 1] ?? "").toLowerCase();

      switch (ext) {
        case "out":
        case "ans":
          judgeOutEntry = entry;
          break;
        case "dat":
        case "in":
          judgeDataEntry = entry;
          break;
        case "java":
        case "cpp":
        case "py":
        case "c":
        case "cs":
        case "kt":
          codeEntry = entry;
          break;
        default:
          if (IMAGE_MIME["." + ext] !== undefined) {
            imageEntries.push({ filename, entry });
          }
      }
    }

    // if (!notNull(judgeOut, codePath)) return;
    if (judgeOutEntry === null && codeEntry === null) continue;

    problems.push({
      name,
      testData: judgeDataEntry !== null ? readText(judgeDataEntry) : "",
      testOutput: judgeOutEntry !== null ? readText(judgeOutEntry) : "",
      solution: codeEntry !== null ? readText(codeEntry) : "",
      images: imageEntries.map(({ filename, entry }) => ({
        filename,
        data: entry.getData(),
        mimeType: IMAGE_MIME[getExt(filename)] ?? "application/octet-stream",
      })),
    });
  }

  return problems;
}

// ---------------------------------------------------------------------------
// Student directory — mirrors Competition.ReadFromDir() second half
// ---------------------------------------------------------------------------

interface StudentProblem {
  /**
   * Problem name extracted exactly as UILaunch does:
   *   1. getFileName(path) → leaf filename with extension
   *   2. if contains "_student": replace "_student" with ""
   *   3. parts = fileName.split("\\.")
   *   4. problemName = parts[parts.length - 2]
   */
  problemName: string;
  studentData: string;
}

/**
 * Direct port of the student-data section of ReadFromDir():
 *
 *   for (String dataFile : listFiles(studentDataPath)) {
 *     String fileName = IOUtils.getFileName(dataFile);   // leaf name + ext
 *     if (fileName.contains("_student"))
 *       fileName = fileName.replace("_student", "");
 *     String[] parts = fileName.split("\\.");
 *     String problemName = parts[parts.length - 2];
 *     String extension   = parts[parts.length - 1];
 *     switch (extension) {
 *       case "dat": competition.getProblem(problemName).setStudentDataPath(dataFile);
 *     }
 *   }
 *
 * We collect (problemName, contents) pairs; the caller handles the lookup.
 */
function extractStudentProblems(
  entries: AdmZip.IZipEntry[],
  studentDirPath: string,
): StudentProblem[] {
  const files = listFiles(entries, studentDirPath);
  const result: StudentProblem[] = [];

  for (const { filename, entry } of files) {
    // IOUtils.getFileName → leaf filename including extension
    let fileName = filename; // already the leaf name from listFiles()

    // 2025 state format: strip the "_student" infix
    if (fileName.includes("_student")) {
      fileName = fileName.replace("_student", "");
    }

    // parts = fileName.split("\\.")
    const parts = fileName.split(".");
    if (parts.length < 2) continue;

    // problemName = parts[parts.length - 2]
    // extension   = parts[parts.length - 1]
    const problemName = parts[parts.length - 2] ?? "";
    const extension = (parts[parts.length - 1] ?? "").toLowerCase();

    if (!problemName) continue;

    if (extension === "dat" || extension === "in") {
      result.push({ problemName, studentData: readText(entry) });
    }
    // UILaunch also reads .java starter code, but we don't need it here.
  }

  return result;
}

// ---------------------------------------------------------------------------
// inferMetadata — unchanged
// ---------------------------------------------------------------------------

export function inferMetadata(zipFilename: string): {
  yearHint: number | null;
  levelHint: string | null;
} {
  const yearMatch = zipFilename.match(/\b(20\d{2})\b/);
  const yearHint = yearMatch !== null ? parseInt(yearMatch[1] ?? "", 10) : null;

  const lower = zipFilename.toLowerCase();
  let levelHint: string | null = null;

  if (lower.includes("state")) {
    levelHint = "state";
  } else if (lower.includes("region")) {
    levelHint = "region";
  } else if (lower.includes("district")) {
    levelHint = "district";
  } else if (
    lower.includes("inva") ||
    lower.includes("inv_a") ||
    lower.includes("inv-a")
  ) {
    levelHint = "invA";
  } else if (
    lower.includes("invb") ||
    lower.includes("inv_b") ||
    lower.includes("inv-b")
  ) {
    levelHint = "invB";
  }

  return { yearHint, levelHint };
}

// ---------------------------------------------------------------------------
// extractZip — public API
// ---------------------------------------------------------------------------

/**
 * Fetch a competition ZIP from `zipUrl` and extract all problem files.
 *
 * Follows UILaunch's two-phase ReadFromDir() algorithm:
 *
 *   Phase A — structure discovery (mirrors IOUtils.unzip + field assignments):
 *     1. unzip in memory
 *     2. find CompetitionDir = first non-MACOS top-level folder
 *     3. checkDir(CompetitionDir, "Solutions"|"JudgeData"|"OutFiles") → judgeDir
 *     4. checkDir(CompetitionDir, "StudentData") → studentDir
 *
 *   Phase B — data extraction (mirrors Competition.ReadFromDir()):
 *     5. collect problem names from non-.dat/.out files in judgeDir
 *     6. classify each problem's files by startsWith + extension
 *     7. match student .dat files by normalized problem name
 */
export async function extractZip(
  zipUrl: string,
  zipFilename?: string,
): Promise<{
  problems: RawProblemFiles[];
  yearHint: number | null;
  levelHint: string | null;
}> {
  const response = await fetch(zipUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ZIP from "${zipUrl}": ${response.status} ${response.statusText}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = new AdmZip(buffer);
  const allEntries = zip.getEntries();

  const { yearHint, levelHint } = inferMetadata(zipFilename ?? "");

  // ── Phase A: structure discovery ─────────────────────────────────────────

  // Step 1 — CompetitionDir: first non-MACOS top-level folder.
  const competitionDir = findCompetitionDir(allEntries);

  // Step 2 — judge folder
  const judgeDirPath = checkDir(allEntries, competitionDir, JUDGE_DIR_KEYWORDS);

  console.log(`Judge Dir Path: ${judgeDirPath}`);
  if (judgeDirPath === null) {
    // No recognisable judge directory found — return empty rather than crashing.
    return { problems: [], yearHint, levelHint };
  }

  // ── Phase B: data extraction ──────────────────────────────────────────────

  const judgeProblems = extractJudgeProblems(allEntries, judgeDirPath);

  const studentDirPath = checkDir(
    allEntries,
    competitionDir,
    STUDENT_DIR_KEYWORDS,
  );

  const studentProblems =
    studentDirPath !== null
      ? extractStudentProblems(allEntries, studentDirPath)
      : [];

  // Build a normalised-name → student data map.
  const studentMap = new Map<string, string>(
    studentProblems.map((sp) => [
      normalizeName(sp.problemName),
      sp.studentData,
    ]),
  );

  // Merge: judge problems are already sorted alphabetically (TreeSet order).
  const problems: RawProblemFiles[] = judgeProblems.map((jp, i) => ({
    number: i + 1, // 1-based; alphabetical order matches UIL's TreeSet
    name: jp.name,
    studentData: studentMap.get(normalizeName(jp.name)) ?? "",
    // UIL does not ship student expected-output files; leave empty.
    studentOutput: "",
    testData: jp.testData,
    testOutput: jp.testOutput,
    solution: jp.solution,
    images: jp.images,
  }));

  return { problems, yearHint, levelHint };
}
