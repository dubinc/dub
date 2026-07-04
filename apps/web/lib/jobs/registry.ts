import { folderDeletedJob } from "./folder-deleted-job";
import { JobDefinition } from "./index";
import { partnerTagDeletedJob } from "./partner-tag-deleted-job";

// Every job must be registered here
const jobs: JobDefinition[] = [partnerTagDeletedJob, folderDeletedJob];

export const jobRegistry = new Map(jobs.map((job) => [job.name, job]));

if (jobRegistry.size !== jobs.length) {
  throw new Error("Duplicate job name detected in the job registry.");
}
