// Goal: Rather than store the problem text and student/test IO within the database, we will instead store it in uploadthing since the problems get pretty large (and turso already fails to read problems after only two competitions)
// This script aims to automate such a migration

import { UTApi } from "uploadthing/server";
import { db } from "@/server/db";
import { problem } from "@/server/db/schemas/core-schema";
import { eq } from "drizzle-orm";

const utapi = new UTApi({ logLevel: "Error" });

async function uploadFile(content: string, type: "md" | "dat" | "out") {
  const file = new File([content], `file.${type}`, {
    type: type === "md" ? "text/markdown" : "text/plain",
  });
  return utapi.uploadFiles(file);
}

async function uploadMarkdown(content: string) {
  return uploadFile(content, "md");
}

async function uploadDAT(content: string) {
  return uploadFile(content, "dat");
}

async function uploadOut(content: string) {
  return uploadFile(content, "out");
}

// migrate problem text, student IO, test IO
async function migrateProblems() {
  const problem_ids = await db
    .select({ id: problem.id, name: problem.name })
    .from(problem);
  let count = 0;
  for (const { id, name } of problem_ids) {
    console.log(`Processing ${name}`);
    const [p] = await db
      .select({
        markdown: problem.markdown,
        sdata: problem.student_data,
        sout: problem.student_output,
        tdata: problem.test_data,
        tout: problem.test_output,
      })
      .from(problem)
      .where(eq(problem.id, id));
    if (p === undefined) {
      console.log(`unable to get problem.`);
      continue;
    }

    // update student data
    const sdata_upload = await uploadDAT(p.sdata);
    if (sdata_upload.error !== null) {
      console.log("Failed to upload student data.");
      continue;
    }
    const sdata = sdata_upload.data;

    // student output
    const sout_upload = await uploadOut(p.sout);
    if (sout_upload.error !== null) {
      console.log("Failed to upload student output.");
      continue;
    }
    const sout = sout_upload.data;

    // test data
    const tdata_upload = await uploadDAT(p.tdata);
    if (tdata_upload.error !== null) {
      console.log("Failed to upload test data.");
      continue;
    }
    const tdata = tdata_upload.data;

    // test output
    const tout_upload = await uploadOut(p.tout);
    if (tout_upload.error !== null) {
      console.log("Failed to upload test output.");
      continue;
    }
    const tout = tout_upload.data;

    // problem text
    const md_upload = await uploadMarkdown(p.markdown);
    if (md_upload.error !== null) {
      console.log("Failed to upload problem markdown");
      continue;
    }
    const md = md_upload.data;

    // update values
    const updated = await db
      .update(problem)
      .set({
        problem_text_url: md.ufsUrl,
        student_data_url: sdata.ufsUrl,
        student_output_url: sout.ufsUrl,
        test_data_url: tdata.ufsUrl,
        test_output_url: tout.ufsUrl,
      })
      .where(eq(problem.id, id))
      .returning({
        id: problem.id,
        name: problem.name,
        problem_text_url: problem.problem_text_url,
        student_data_url: problem.student_data_url,
        student_output_url: problem.student_output_url,
        test_data_url: problem.test_data_url,
        test_output_url: problem.test_output_url,
      });
    console.dir(updated);
    count++;
    console.log(`Updated ${name}`);
  }

  console.log(`Updated ${count} rows.`);
}

await migrateProblems();
