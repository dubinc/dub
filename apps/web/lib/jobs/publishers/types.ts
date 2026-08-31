import { Job, JobStatus } from "@prisma/client";
import { PublishRequest } from "@upstash/qstash";

export type QStashJobOptions = Pick<
  PublishRequest,
  "label" | "deduplicationId" | "retries" | "flowControl"
> & {
  queue?: string;
};

export type PublishSendResult = {
  id: string;
  status: typeof JobStatus.published | typeof JobStatus.failed;
  lastError: string | null;
};

export interface JobPublisher {
  send(jobs: Job[]): Promise<PublishSendResult[]>;
}
