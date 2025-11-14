export const BOUNTY_DESCRIPTION_MAX_LENGTH = 5000;

export const BOUNTY_MAX_SUBMISSION_FILES = 4;

export const BOUNTY_MAX_SUBMISSION_URLS = 100;

export const BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH = 1000;

export const BOUNTY_MAX_SUBMISSION_REJECTION_NOTE_LENGTH = 5000;

export const BOUNTY_SUBMISSION_REQUIREMENTS = ["image", "url"] as const;

export const REJECT_BOUNTY_SUBMISSION_REASONS = {
  invalidProof: "Invalid proof",
  duplicateSubmission: "Duplicate submission",
  outOfTimeWindow: "Out of time window",
  didNotMeetCriteria: "Did not meet criteria",
  other: "Other",
} as const;
