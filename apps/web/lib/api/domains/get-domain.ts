import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { DUB_WORKSPACE_ID, isDubDomain } from "@dub/utils";
import { Domain } from "@prisma/client";
import { DubApiError } from "../errors";

// Find domain
// export const getDomain = async ({
//   workspace,
//   domain,
// }: {
//   workspace: WorkspaceProps;
//   domain: string;
// }) => {
//   let domainRecord: Domain | null = null;

//   if (domain) {
//     domainRecord = await prisma.domain.findUnique({
//       where: {
//         slug: domain,
//       },
//     });
//   }

//   if (!domainRecord) {
//     throw new DubApiError({
//       code: "not_found",
//       message: "Domain not found",
//     });
//   }

//   if (domainRecord.projectId !== workspace.id) {
//     throw new DubApiError({
//       code: "forbidden",
//       message: "Domain not found",
//     });
//   }

//   return domain;
// };

// Verify workspace domain ownership
// export const throwIfDomainNotOwned = ({
//   workspace,
//   domain,
// }: {
//   workspace: WorkspaceProps;
//   domain: string;
// }) => {
//   if (isDubDomain(domain)) {
//     if (workspace.id !== DUB_WORKSPACE_ID) {
//       throw new DubApiError({
//         code: "forbidden",
//         message: "Domain does not belong to workspace.",
//       });
//     }
//   }

//   if (!workspace.domains.find((d) => d.slug === domain)) {
//     throw new DubApiError({
//       code: "forbidden",
//       message: "Domain does not belong to workspace.",
//     });
//   }
// };