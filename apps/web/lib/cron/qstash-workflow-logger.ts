type LogData = {
  message: string;
  data?: Record<string, any>;
};

type ErrorData = {
  message: string;
  error?: any;
  data?: Record<string, any>;
};

// Create a context-aware logger factory
export function createWorkflowLogger({
  workflowId,
  workflowRunId,
}: {
  workflowId: string;
  workflowRunId: string;
}) {
  return {
    info: ({ message, data }: LogData) => {
      console.info(`[Upstash Workflow:${workflowId}] ${message}`, {
        workflowRunId,
        ...data,
      });
    },

    error: ({ message, error, data }: ErrorData) => {
      console.error(`[Upstash Workflow:${workflowId}] ${message}`, {
        workflowRunId,
        error: error?.message || error,
        ...data,
      });
    },
  };
}
