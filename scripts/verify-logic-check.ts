import AdmZip from "adm-zip";
import { runsWithoutInput } from "../src/server/judge0/types";
import { verifySolution, compareOutput } from "../src/server/judge0/verify";
import { generateOutputs } from "../src/server/judge0/generate";
import {
  detectLanguage,
  parseCompileErrorLine,
  prepareSource,
} from "../src/server/judge0/language";
import {
  buildDataFiles,
  detectDataFilenames,
  looksLikeMissingInputFile,
  problemNameToDataFile,
} from "../src/server/judge0/data-files";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n   got ${a}\n   want ${e}`}`);
}

console.log("── compareOutput ──");
check("identical", compareOutput("a\nb", "a\nb").match, true);
check("trailing newline ignored", compareOutput("a\nb\n\n", "a\nb").match, true);
check("CRLF ignored", compareOutput("a\r\nb", "a\nb").match, true);
check("trailing spaces ignored", compareOutput("a   \nb", "a\nb").match, true);
check("interior blank significant", compareOutput("a\n\nb", "a\nb").match, false);
check("case sensitive", compareOutput("A", "a").match, false);
check("interior spacing significant", compareOutput("a  b", "a b").match, false);
check("mismatch line number", compareOutput("a\nX\nc", "a\nb\nc").mismatchLine, 2);
check("short output detected", compareOutput("a", "a\nb").mismatchLine, 2);
check("extra output detected", compareOutput("a\nb", "a").mismatchLine, 2);

console.log("\n── detectLanguage ──");
check("java by public class", detectLanguage("public class Foo {}").key, "java");
check("java by import", detectLanguage("import java.util.*;").key, "java");
check("cpp", detectLanguage("#include <iostream>\nint main(){}").key, "cpp");
check("c", detectLanguage("#include <stdio.h>\nint main(){printf(\"x\");}").key, "c");
check("python", detectLanguage("import sys\ndef main():\n  print(1)").key, "python");
check("default java", detectLanguage("???").key, "java");

console.log("\n── prepareSource (Java) ──");
const java = detectLanguage("public class Prob1 {}");

const renamed = prepareSource(
  `public class Prob1 {\n  public static void main(String[] a) {\n    System.out.println(1);\n  }\n}`,
  java,
);
check("renames entry class", /public class Main\b/.test(renamed.source), true);
check("emits a note", renamed.notes.length, 1);

const pkg = prepareSource(
  `package uil.solutions;\npublic class Prob1 {\n  public static void main(String[] a) {}\n}`,
  java,
);
check("strips package", /package/.test(pkg.source), false);
check("renames after package strip", /class Main\b/.test(pkg.source), true);

// Judge0 reports compile errors as `Main.java:N`. Blanking the package line
// instead of deleting it keeps those numbers aligned with the admin's source.
const pkgLines = pkg.source.split("\n");
check("package line count preserved", pkgLines.length, 4);
check("package line blanked not removed", pkgLines[0], "");
check(
  "class still on original line 2",
  /class Main\b/.test(pkgLines[1] ?? ""),
  true,
);

const pkgCrlf = prepareSource(
  `package a.b;\r\npublic class P {\r\n  public static void main(String[] x) {}\r\n}`,
  java,
);
check("CRLF line count preserved", pkgCrlf.source.split("\n").length, 4);

const alreadyMain = prepareSource(
  `public class Main {\n  public static void main(String[] a) {}\n}`,
  java,
);
check("leaves Main alone", alreadyMain.notes.length, 0);

const helper = prepareSource(
  `class Helper { int x; }\npublic class Solver {\n  public static void main(String[] a) { Helper h = new Helper(); }\n}`,
  java,
);
check("picks entry not helper", /public class Main\b/.test(helper.source), true);
check("helper untouched", /class Helper\b/.test(helper.source), true);

const ctor = prepareSource(
  `public class Prob1 {\n  Prob1() {}\n  public static void main(String[] a) { new Prob1(); }\n}`,
  java,
);
check("renames constructor refs", (ctor.source.match(/\bMain\b/g) ?? []).length, 3);

const py = prepareSource("print(1)", detectLanguage("print(1)"));
check("python untouched", py.source, "print(1)");

console.log("\n── runsWithoutInput ──");
check("problem 1", runsWithoutInput(1), true);
check("problem 2", runsWithoutInput(2), false);
check("problem 12", runsWithoutInput(12), false);
check("undefined", runsWithoutInput(undefined), false);
check("null", runsWithoutInput(null), false);

// These exercise the gating only — they must decide "skip" WITHOUT reaching
// Judge0, so they are safe to run offline. Anything that would dispatch a
// submission is deliberately not asserted here.
console.log("\n── empty-input gating (no Judge0 contact) ──");

const emptyish = {
  solution: "public class A { public static void main(String[] a){} }",
  studentData: "",
  studentOutput: "",
  testData: "",
  testOutput: "",
};

const verifyNoData2 = await verifySolution({ ...emptyish, problemNumber: 2 });
check("verify: p2 with no data skips", verifyNoData2.status, "skipped");

const verifyNoOutput1 = await verifySolution({ ...emptyish, problemNumber: 1 });
check("verify: p1 with no expected output skips", verifyNoOutput1.status, "skipped");
check(
  "verify: p1 skip message mentions no-input rule",
  verifyNoOutput1.message.includes("Problem 1 takes no input"),
  true,
);

const genNoData2 = await generateOutputs({
  solution: emptyish.solution,
  studentData: "",
  testData: "",
  problemNumber: 2,
});
check(
  "generate: p2 with no data skips both",
  genNoData2.outputs.map((o) => o.status),
  ["skipped", "skipped"],
);

const genNoSolution = await generateOutputs({
  solution: "",
  studentData: "",
  testData: "",
  problemNumber: 1,
});
check(
  "generate: p1 without a solution still skips",
  genNoSolution.outputs.map((o) => o.status),
  ["skipped", "skipped"],
);

console.log("\n── parseCompileErrorLine ──");
check(
  "javac",
  parseCompileErrorLine("Main.java:12: error: ';' expected"),
  12,
);
check(
  "gcc with column",
  parseCompileErrorLine("main.cpp:34:5: error: expected ';'"),
  34,
);
check(
  "python traceback",
  parseCompileErrorLine('  File "main.py", line 7\n    print(\n'),
  7,
);
check("node", parseCompileErrorLine("/box/main.js:3\n  foo("), 3);
check("empty", parseCompileErrorLine(""), null);
check("no line info", parseCompileErrorLine("Killed (out of memory)"), null);
check(
  "prefers first occurrence",
  parseCompileErrorLine("Main.java:5: error: x\nMain.java:9: error: y"),
  5,
);

console.log("\n── detectDataFilenames ──");
check(
  "java new File",
  detectDataFilenames('Scanner s = new Scanner(new File("numbers.dat"));'),
  ["numbers.dat"],
);
check(
  "python open",
  detectDataFilenames("f = open('grid.txt')"),
  ["grid.txt"],
);
check("c fopen", detectDataFilenames('fopen("prob.in", "r");'), ["prob.in"]);
check("ignores paths", detectDataFilenames('open("/etc/x.dat")'), []);
check("ignores non-data ext", detectDataFilenames('open("Main.java")'), []);
check("none", detectDataFilenames("int x = 1;"), []);

console.log("\n── problemNameToDataFile ──");
check("spaces removed", problemNameToDataFile("Linked List"), "linkedlist.dat");
check("punctuation removed", problemNameToDataFile("A-B_C!"), "abc.dat");
check("empty name", problemNameToDataFile("   "), null);

console.log("\n── buildDataFiles ──");
const plan = buildDataFiles({
  source: 'new File("numbers.dat")',
  content: "5\n1 2 3 4 5",
  problemName: "Numbers",
});
check("archive produced", typeof plan.archiveBase64 === "string", true);
check("dedupes conventional name", plan.filenames, ["numbers.dat"]);

const entries = new AdmZip(Buffer.from(plan.archiveBase64!, "base64"))
  .getEntries()
  .map((e) => e.entryName);
check("zip contains data file", entries, ["numbers.dat"]);
check(
  "zip content matches",
  new AdmZip(Buffer.from(plan.archiveBase64!, "base64"))
    .getEntry("numbers.dat")!
    .getData()
    .toString("utf8"),
  "5\n1 2 3 4 5",
);

const both = buildDataFiles({
  source: 'new File("weird_name.dat")',
  content: "x",
  problemName: "Sorting",
});
check("includes detected + conventional", both.filenames.sort(), [
  "sorting.dat",
  "weird_name.dat",
]);

// Empty content still yields a file: problem 1 takes no input, and a
// no-input solution that opens its .dat should read zero bytes rather than
// crash with FileNotFoundException.
const emptyPlan = buildDataFiles({ source: 'open("a.dat")', content: "" });
check("empty content still creates the file", emptyPlan.filenames, ["a.dat"]);
check(
  "empty file is actually empty",
  new AdmZip(Buffer.from(emptyPlan.archiveBase64!, "base64"))
    .getEntry("a.dat")!
    .getData()
    .toString("utf8"),
  "",
);
check(
  "no archive without candidates",
  buildDataFiles({ source: "int x;", content: "data" }).archiveBase64,
  null,
);

console.log("\n── looksLikeMissingInputFile ──");
check(
  "java FNF",
  looksLikeMissingInputFile("java.io.FileNotFoundException: x.dat", ""),
  true,
);
check(
  "python FNF",
  looksLikeMissingInputFile("FileNotFoundError: [Errno 2]", ""),
  true,
);
check("c enoent", looksLikeMissingInputFile("", "No such file or directory"), true);
check("unrelated error", looksLikeMissingInputFile("NullPointerException", ""), false);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
