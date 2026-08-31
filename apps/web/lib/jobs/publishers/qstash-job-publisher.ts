import { APP_DOMAIN_WITH_NGROK, chunk, serializeError } from "@dub/utils";
import { Job, JobStatus } from "@prisma/client";
import { PublishBatchRequest } from "@upstash/qstash";
import { qstash } from "../../cron";
import { isPublishSuccess } from "../index";
import { JobPublisher, PublishSendResult, QStashJobOptions } from "./types";

const QSTASH_BATCH_CHUNK_SIZE = 100;

const jobPathMap = {
  welcomeUser: "/api/cron/welcome-user",
};

export class QStashJobPublisher implements JobPublisher {
  async send(jobs: Job[]): Promise<PublishSendResult[]> {
    if (jobs.length === 0) {
      return [];
    }

    const results: PublishSendResult[] = [];

    for (const jobChunk of chunk(jobs, QSTASH_BATCH_CHUNK_SIZE)) {
      try {
        const responses = await qstash.batchJSON(
          jobChunk.map((job) => this.buildRequest(job)),
        );

        jobChunk.forEach((job, index) => {
          if (isPublishSuccess(responses[index])) {
            results.push({
              id: job.id,
              status: JobStatus.published,
              lastError: null,
            });
          } else {
            results.push({
              id: job.id,
              status: JobStatus.failed,
              lastError: "QStash batch publish did not return a messageId",
            });
          }
        });
      } catch (error) {
        const lastError = serializeError(error);

        for (const job of jobChunk) {
          results.push({
            id: job.id,
            status: JobStatus.failed,
            lastError,
          });
        }
      }
    }

    return results;
  }

  private buildRequest(job: Job): PublishBatchRequest<unknown> {
    let jobPath = jobPathMap[job.name as keyof typeof jobPathMap];

    if (!jobPath) {
      jobPath = `/api/jobs/process/${job.name}`;
    }

    const options = (job.options ?? {}) as QStashJobOptions;

    return {
      url: `${APP_DOMAIN_WITH_NGROK}${jobPath}`,
      body: job.payload,
      deduplicationId: options.deduplicationId ?? job.id,
      ...(options.label && { label: options.label }),
      ...(options.retries !== undefined && { retries: options.retries }),
      ...(options.flowControl && { flowControl: options.flowControl }),
      ...(options.queue && { queueName: options.queue }),
    };
  }
}
