export const RATELIMIT_POLICIES = {
  programImageUpload: {
    attempts: 10,
    window: "24 h",
    keyPrefix: "rl:program:application:image:upload",
  },

  messageAttachmentUpload: {
    attempts: 20,
    window: "1 h",
    keyPrefix: "rl:message:attachment:upload",
  },

  // TODO:
  // Centralize rate limiting policies
} as const;
