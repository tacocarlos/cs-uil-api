import { auth } from "@/server/better-auth";
import { runExtractionPipeline } from "@/server/extraction/pipeline";
import type { ExtractionResult } from "@/server/extraction/types";

type SseEvent =
  | { type: "progress"; message: string; percent: number }
  | { type: "complete"; result: ExtractionResult }
  | { type: "error"; message: string };

export async function GET(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dataUrl = searchParams.get("dataUrl");
  const pdfUrl = searchParams.get("pdfUrl");

  if (!dataUrl || !pdfUrl) {
    return new Response("Missing required parameters: dataUrl and pdfUrl", {
      status: 400,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: SseEvent): void {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        const result = await runExtractionPipeline(
          { dataUrl, pdfUrl },
          (message, percent) => send({ type: "progress", message, percent }),
        );
        send({ type: "complete", result });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
