import { logger, withAxiomBodyLog } from "@/lib/axiom/server";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { jobEnvelopeSchema } from "@/lib/jobs";
import { loadJob } from "@/lib/jobs/registry";
import * as z from "zod/v4";

export const maxDuration = 600;

// POST /api/jobs/process/[jobName] – shared executor for all background jobs
export const POST = withAxiomBodyLog(
  async (
    req: Request,
    { params }: { params: Promise<{ jobName: string }> },
  ) => {
    const { jobName: urlJobName } = await params;
    const clonedReq = req.clone();
    const rawBody = await clonedReq.text();

    await verifyQstashSignature({ req, rawBody });

    let parsedBody: unknown = null;

    try {
      parsedBody = JSON.parse(rawBody);
    } catch (error) {
      // Handled below by the envelope validation
    }

    const envelope = jobEnvelopeSchema.safeParse(parsedBody);

    // Permanently invalid — returning 2xx stops QStash retries
    if (!envelope.success) {
      logger.error("jobs.invalid_envelope", {
        error: envelope.error.message,
      });
      await logger.flush();

      return new Response("Invalid job envelope (non-retryable).");
    }

    const { name: jobName } = envelope.data;

    if (urlJobName !== jobName) {
      logger.error("jobs.job_name_mismatch", {
        urlJobName,
        envelopeJobName: jobName,
      });
      await logger.flush();

      return new Response(
        `Job name mismatch: URL "${urlJobName}" does not match envelope "${jobName}" (non-retryable).`,
      );
    }

    console.log(`[jobs:${jobName}] Executing job...`, envelope.data);

    // Get the job definition
    const job = await loadJob(jobName);

    if (!job) {
      logger.error("jobs.unknown_job", {
        jobName,
      });
      await logger.flush();

      return new Response(`Unknown job "${jobName}" (non-retryable).`);
    }

    try {
      await job.execute(envelope.data.payload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // A bad payload is permanent — 200 so QStash doesn't retry
        logger.error("jobs.invalid_payload", {
          jobName: job.name,
          error: error.message,
        });
        await logger.flush();

        return new Response(
          `Invalid payload for job "${job.name}" (non-retryable).`,
        );
      }

      // Transient failure → 500 → QStash retries
      logger.error("jobs.execution_failed", {
        jobName: job.name,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      await logger.flush();

      return new Response(`Job "${job.name}" failed.`, {
        status: 500,
      });
    }

    return new Response(`Executed job "${job.name}".`);
  },
);
