import type { TextRef } from "@/lib/text-ref";
import { toTextRef } from "@/lib/text-ref-client";

interface DraftData {
  name: string;
  studentData: string;
  studentOutput: string;
  testData: string;
  testOutput: string;
}

/**
 * Packs an unsaved problem's data fields for a verify/generate server action.
 * Large judge files are uploaded once (cached by content) and reused when the
 * competition is saved.
 */
export async function draftDataRefs(draft: DraftData): Promise<{
  studentData: TextRef;
  studentOutput: TextRef;
  testData: TextRef;
  testOutput: TextRef;
}> {
  const base = (draft.name || "problem").replace(/[^\w.-]+/g, "_");
  const [studentData, studentOutput, testData, testOutput] = await Promise.all([
    toTextRef(draft.studentData, `${base}-student.dat`),
    toTextRef(draft.studentOutput, `${base}-student.out`),
    toTextRef(draft.testData, `${base}-test.dat`),
    toTextRef(draft.testOutput, `${base}-test.out`),
  ]);
  return { studentData, studentOutput, testData, testOutput };
}
