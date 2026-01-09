import { WorkspaceRole } from "@dub/prisma/client";
import type { Icon } from "@dub/ui/icons";
import { Eye, MoneyBill, User, UserCrown } from "@dub/ui/icons";

export const WORKSPACE_ROLES = [
  { value: WorkspaceRole.owner, label: "Owner", icon: UserCrown },
  { value: WorkspaceRole.member, label: "Member", icon: User },
  { value: WorkspaceRole.viewer, label: "Viewer", icon: Eye },
  { value: WorkspaceRole.billing, label: "Billing", icon: MoneyBill },
] satisfies { value: WorkspaceRole; label: string; icon: Icon }[];
