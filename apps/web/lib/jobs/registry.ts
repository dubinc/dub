import type { JobDefinition } from "./index";

// Add handlers/{name}-job.ts. Set defineJob({ name: "{name}-job" }).
// Each entry uses a static import() so webpack code-splits handlers into separate chunks.
const jobLoaders = {
  "folder-deleted-job": () =>
    import("./handlers/folder-deleted-job").then((m) => m.folderDeletedJob),

  "partner-tag-deleted-job": () =>
    import("./handlers/partner-tag-deleted-job").then(
      (m) => m.partnerTagDeletedJob,
    ),

  "unban-partner-job": () =>
    import("./handlers/unban-partner-job").then((m) => m.unbanPartnerJob),

  "link-tag-deleted-job": () =>
    import("./handlers/link-tag-deleted-job").then((m) => m.linkTagDeletedJob),

  "domain-deleted-job": () =>
    import("./handlers/domain-deleted-job").then((m) => m.domainDeletedJob),

  "default-link-deleted-job": () =>
    import("./handlers/default-link-deleted-job").then(
      (m) => m.defaultLinkDeletedJob,
    ),

  "create-tremendous-campaign-job": () =>
    import("./handlers/create-tremendous-campaign-job").then(
      (m) => m.createTremendousCampaignJob,
    ),
} as const satisfies Record<string, () => Promise<JobDefinition>>;

const jobCache = new Map<string, JobDefinition>();

export async function loadJob(
  name: string,
): Promise<JobDefinition | undefined> {
  const cached = jobCache.get(name);
  if (cached) return cached;

  const loader = jobLoaders[name as keyof typeof jobLoaders];
  if (!loader) return undefined;

  const job = await loader();
  if (job.name !== name) {
    throw new Error(`Job name mismatch: ${job.name} !== ${name}`);
  }

  jobCache.set(name, job);
  return job;
}

export const registeredJobNames = Object.keys(jobLoaders);
