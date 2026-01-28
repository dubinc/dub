export const RATE_LIMITS = {
  programImageUpload: {
    attempts: 10,
    window: "24 h",
    keyPrefix: "rl:program:application:image:upload",
  },

  // TODO:
  // Centralize rate limiting policies
} as const;
