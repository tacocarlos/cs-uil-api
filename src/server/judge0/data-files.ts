import AdmZip from "adm-zip";

/**
 * UIL reference solutions read their input from a data file on disk — almost
 * always `<problemname>.dat` in the working directory — rather than from
 * stdin. Judge0 only pipes stdin, so an unmodified solution throws
 * `FileNotFoundException` before producing any output.
 *
 * Judge0 supports an `additional_files` attribute: a base64-encoded zip that
 * is extracted into the submission's working directory alongside the source.
 * Writing the judge data there under the exact filename the solution opens
 * lets the original, unmodified solution run as-is. That is strictly
 * preferable to rewriting the source, because the code under test stays
 * byte-identical to what the competition shipped.
 */

/** Extensions UIL solutions realistically read from. */
const DATA_EXTENSIONS = ["dat", "txt", "in"] as const;

/** Cap on how many copies of the data we put in the archive. */
const MAX_DATA_FILES = 6;

/**
 * Extracts filenames referenced as string literals in the source.
 *
 * Matches both double- and single-quoted literals so Java, C++, Python and
 * JavaScript solutions are all covered. Only bare filenames are kept — any
 * literal containing a path separator is ignored, since Judge0 extracts
 * `additional_files` flat into the working directory.
 */
export function detectDataFilenames(source: string): string[] {
  const pattern = new RegExp(
    `["']([^"'\\n]*\\.(?:${DATA_EXTENSIONS.join("|")}))["']`,
    "gi",
  );

  const found = new Set<string>();
  for (const match of source.matchAll(pattern)) {
    const raw = match[1];
    if (!raw) continue;
    if (raw.includes("/") || raw.includes("\\")) continue;
    if (raw.length === 0 || raw.length > 128) continue;
    found.add(raw);
  }

  return [...found];
}

/**
 * Derives the conventional UIL data filename from a problem name.
 * "Linked List" → "linkedlist.dat"
 */
export function problemNameToDataFile(name: string): string | null {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return slug.length > 0 ? `${slug}.dat` : null;
}

export interface DataFilePlan {
  /** Filenames that will be present in the working directory. */
  filenames: string[];
  /** Base64-encoded zip for Judge0's `additional_files`, or null if empty. */
  archiveBase64: string | null;
  /** Human-readable notes for the verification report. */
  notes: string[];
}

/**
 * Builds the `additional_files` archive for a run.
 *
 * Every candidate filename receives an identical copy of `content` (the judge
 * input), so whichever name the solution opens, it finds the right data.
 *
 * Empty `content` still produces files. That case only arises for problem 1,
 * which takes no input by UIL convention (every other problem skips before it
 * gets here). Some no-input solutions still open their `.dat` anyway, and an
 * empty file lets them read zero bytes and continue — whereas providing no
 * file at all would raise FileNotFoundException and trigger a pointless LLM
 * stdin-rewrite.
 */
export function buildDataFiles(options: {
  source: string;
  content: string;
  problemName?: string;
}): DataFilePlan {
  const { source, content, problemName } = options;

  const detected = detectDataFilenames(source);
  const candidates = new Set<string>(detected);

  // Always include the conventional <problemname>.dat as a safety net: the
  // filename is often built dynamically (e.g. `new File(name + ".dat")`),
  // which no literal scan can resolve.
  const conventional = problemName ? problemNameToDataFile(problemName) : null;
  if (conventional) candidates.add(conventional);

  const filenames = [...candidates].slice(0, MAX_DATA_FILES);
  if (filenames.length === 0) {
    return { filenames: [], archiveBase64: null, notes: [] };
  }

  const zip = new AdmZip();
  for (const filename of filenames) {
    zip.addFile(filename, Buffer.from(content, "utf8"));
  }

  const notes: string[] = [];
  if (detected.length > 0) {
    notes.push(
      `Provided judge data as ${detected
        .map((f) => `\`${f}\``)
        .join(", ")} (filename${detected.length === 1 ? "" : "s"} referenced by the solution).`,
    );
  }
  if (conventional && !detected.includes(conventional)) {
    notes.push(`Also provided judge data as \`${conventional}\`.`);
  }

  return {
    filenames,
    archiveBase64: zip.toBuffer().toString("base64"),
    notes,
  };
}

/**
 * Heuristic: did this run fail because the program could not open its input
 * file? Used to decide whether an LLM stdin-rewrite is worth attempting.
 */
export function looksLikeMissingInputFile(
  stderr: string,
  stdout: string,
): boolean {
  const haystack = `${stderr}\n${stdout}`;
  return [
    "FileNotFoundException",
    "NoSuchFileException",
    "No such file or directory",
    "FileNotFoundError",
    "IOException",
    "ENOENT",
    "cannot open",
    "could not open",
  ].some((needle) => haystack.toLowerCase().includes(needle.toLowerCase()));
}
