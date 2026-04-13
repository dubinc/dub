import { Program } from "@dub/prisma/client";

export function programScopeFilter(
  assignedPrograms: Pick<Program, "id" | "slug">[] | undefined,
): {
  programId?: { in: string[] };
} {
  if (assignedPrograms === undefined) {
    return {};
  }

  return {
    programId: {
      in: assignedPrograms.map(({ id }) => id),
    },
  };
}
