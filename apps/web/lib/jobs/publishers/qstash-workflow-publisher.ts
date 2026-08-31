import { APP_DOMAIN_WITH_NGROK, chunk, serializeError } from "@dub/utils";
import { Job, JobStatus } from "@prisma/client";
import { Client, TriggerOptions } from "@upstash/workflow";
import { JobPublisher, PublishSendResult, QStashJobOptions } from "./types";

const workflowClient = new Client({
  baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io",
  token: process.env.QSTASH_TOKEN || "",
  ...(process.env.VERCEL_ENV === "preview" && {
    headers: {
      "x-vercel-protection-bypass":
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "",
    },
  }),
});

const workflowPathMap = {
  partnerApproved: "/api/workflows/partner-approved",
  mergePartnerAccounts: "/api/workflows/merge-partner-accounts",
  createPartnerCommission: "/api/workflows/create-partner-commission",
};

const QSTASH_BATCH_CHUNK_SIZE = 100;

type WorkflowJob = Job & { name: keyof typeof workflowPathMap };

export class QStashWorkflowPublisher implements JobPublisher {
  static isWorkflowJob(job: Job): job is WorkflowJob {
    return job.name in workflowPathMap;
  }

  async send(jobs: Job[]): Promise<PublishSendResult[]> {
    const workflowJobs = jobs.filter(QStashWorkflowPublisher.isWorkflowJob);

    if (workflowJobs.length === 0) {
      return [];
    }

    const results: PublishSendResult[] = [];

    for (const jobChunk of chunk(workflowJobs, QSTASH_BATCH_CHUNK_SIZE)) {
      try {
        const responses = await workflowClient.trigger(
          jobChunk.map((job) => this.buildRequest(job)),
        );

        jobChunk.forEach((job, index) => {
          if (this.isTriggerSuccess(responses[index])) {
            results.push({
              id: job.id,
              status: JobStatus.published,
              lastError: null,
            });
          } else {
            results.push({
              id: job.id,
              status: JobStatus.failed,
              lastError: "Workflow trigger did not return a workflowRunId",
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

  private buildRequest(job: WorkflowJob): TriggerOptions {
    const options = (job.options ?? {}) as QStashJobOptions;
    const workflowPath = workflowPathMap[job.name];
    const workflowKey = workflowPath.split("/").pop()!;

    return {
      url: `${APP_DOMAIN_WITH_NGROK}${workflowPath}`,
      body: job.payload,
      retries: options.retries ?? 5,
      flowControl: options.flowControl ?? {
        key: workflowKey,
        parallelism: 15,
      },
      ...(options.label && { label: options.label }),
    };
  }

  private isTriggerSuccess(
    response: unknown,
  ): response is { workflowRunId: string } {
    return (
      typeof response === "object" &&
      response !== null &&
      "workflowRunId" in response &&
      typeof response.workflowRunId === "string"
    );
  }
}
