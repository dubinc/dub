export const WEBHOOK_SOURCES = ["zapier", "make", "user"] as const;

export const WEBHOOK_TRIGGERS = ["link.created", "link.clicked"] as const;

export const WEBHOOK_SECRET_LENGTH = 16;

export const WEBHOOK_SECRET_PREFIX = `whsec_`;
