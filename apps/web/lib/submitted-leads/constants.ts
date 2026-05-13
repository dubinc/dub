import { ActivityLogAction } from "@/lib/types";
import { textFieldSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { SubmittedLeadStatus } from "@dub/prisma/client";
import { ACME_PROGRAM_ID } from "@dub/utils";
import * as z from "zod/v4";

export const SUBMITTED_LEAD_FORM_REQUIRED_FIELDS: z.infer<
  typeof textFieldSchema
>[] = [
  {
    key: "name",
    label: "Name",
    type: "text",
    required: true,
    locked: true,
    position: -3,
  },
  {
    key: "email",
    label: "Email",
    type: "text",
    required: true,
    locked: true,
    position: -2,
  },
  {
    key: "company",
    label: "Company",
    type: "text",
    required: true,
    locked: true,
    position: -1,
  },
];

export const SUBMITTED_LEAD_FORM_REQUIRED_FIELD_KEYS = new Set(
  SUBMITTED_LEAD_FORM_REQUIRED_FIELDS.map((field) => field.key),
);

export const SUBMITTED_LEAD_FORM_FIELD_INPUT_PROPS: Record<
  string,
  React.InputHTMLAttributes<HTMLInputElement>
> = {
  email: { type: "email", autoComplete: "email" },
  name: { autoComplete: "name" },
  company: { autoComplete: "organization" },
};

export const SUBMITTED_LEADS_ENABLED_PROGRAM_IDS = [
  "prog_1K2J9DRWPPJ2F1RX53N92TSGA", // Remove this
  ACME_PROGRAM_ID, // Acme
  "prog_1K7Y2RGFC4BKZQQZAZEEK9MVE", // SelectCode
  "prog_1KFZQJZRDRV62C037FQZSY0Y8", // FFG
  "prog_1K57RA7GVBT9V3S7HRWSV4ADA", // Truss
  "prog_1KH1SFVYG79SV5JQJQRDJH56V", // Brightwave
];

export const SUBMITTED_LEAD_STATUS_TO_ACTIVITY_ACTION: Record<
  SubmittedLeadStatus,
  ActivityLogAction
> = {
  [SubmittedLeadStatus.pending]: "submittedLead.created",
  [SubmittedLeadStatus.qualified]: "submittedLead.qualified",
  [SubmittedLeadStatus.meeting]: "submittedLead.meeting",
  [SubmittedLeadStatus.negotiation]: "submittedLead.negotiation",
  [SubmittedLeadStatus.unqualified]: "submittedLead.unqualified",
  [SubmittedLeadStatus.closedWon]: "submittedLead.closedWon",
  [SubmittedLeadStatus.closedLost]: "submittedLead.closedLost",
};

export const SUBMITTED_LEAD_STATUS_TRANSITIONS: Record<
  SubmittedLeadStatus,
  readonly SubmittedLeadStatus[]
> = {
  pending: ["qualified", "meeting", "closedLost", "unqualified"],
  qualified: [
    "meeting",
    "negotiation",
    "closedWon",
    "closedLost",
    "unqualified",
  ],
  meeting: [
    "negotiation",
    "qualified",
    "closedWon",
    "closedLost",
    "unqualified",
  ],
  negotiation: [
    "closedWon",
    "qualified",
    "meeting",
    "closedLost",
    "unqualified",
  ],
  closedWon: [],
  closedLost: [],
  unqualified: [],
};
