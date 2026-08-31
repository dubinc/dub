import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";
import { subHours } from "date-fns";

const MAX_JOBS_PER_BATCH = 1000;
const RETENTION_HOURS = 24;

export async function cleanupPublishedJobs(): Promise<{
  deletedCount: number;
}> {
  const cutoff = subHours(new Date(), RETENTION_HOURS);
  let deletedCount = 0;

  while (true) {
    const jobs = await prisma.job.findMany({
      where: {
        status: JobStatus.published,
        createdAt: {
          lt: cutoff,
        },
      },
      select: {
        id: true,
      },
      take: MAX_JOBS_PER_BATCH,
    });

    if (jobs.length === 0) {
      break;
    }

    const { count } = await prisma.job.deleteMany({
      where: {
        id: {
          in: jobs.map((job) => job.id),
        },
      },
    });

    deletedCount += count;

    if (jobs.length < MAX_JOBS_PER_BATCH) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return {
    deletedCount,
  };
}
