import {
  CircleHalfDottedClock,
  CircleXmark,
  GridIcon,
  UserCheck,
} from "@dub/ui/icons";
import { ProgramEnrollmentStatus } from "@prisma/client";

export const PROGRAM_TABS = [
  {
    id: "active",
    label: "Active",
    icon: GridIcon,
    statuses: ["approved"],
    resourceName: "active program",
    emptyState: {
      title: "No programs",
      description:
        "When you've joined a program it will appear here. Find more programs in the marketplace.",
    },
  },
  {
    id: "invitations",
    label: "Invitations",
    icon: UserCheck,
    statuses: ["invited"],
    resourceName: "invitation",
    emptyState: {
      title: "No program invitations",
      description:
        "When a program sends you an invitation to join them, they will appear here.",
    },
  },
  {
    id: "applications",
    label: "Applications",
    icon: CircleHalfDottedClock,
    statuses: ["pending", "rejected"],
    resourceName: "application",
    emptyState: {
      title: "No applications",
      description:
        "When you've applied to a program, your application will appear here.",
    },
  },
  {
    id: "inactive",
    label: "Inactive",
    icon: CircleXmark,
    statuses: ["banned", "deactivated", "archived"],
    resourceName: "inactive program",
    emptyState: {
      title: "No inactive programs",
      description:
        "Programs that banned, deactivated or archived your partnership appear here.",
    },
  },
] as const satisfies {
  id: string;
  label: string;
  icon: typeof GridIcon;
  statuses: ProgramEnrollmentStatus[];
  resourceName: string;
  emptyState: { title: string; description: string };
}[];

export type ProgramTab = (typeof PROGRAM_TABS)[number];

export type ProgramTabId = ProgramTab["id"];

export const PROGRAMS_TABLE_PAGE_SIZE = 50;

// without a saved view, the page starts on the table for partners with more
// active programs than this
export const PROGRAMS_TABLE_VIEW_THRESHOLD = 6;
