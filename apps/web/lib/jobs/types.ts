export type PublishResult = {
  id: string;
  status: "published" | "failed";
  lastError: string | null;
  messageId?: string;
  workflowRunId?: string;
};

export type PersistableJob = {
  id: string;
  name: string;
  payload: unknown;
  options?: unknown;
  scheduledAt?: Date;
};
