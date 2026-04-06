export function programScopeFilter(assignedProgramIds: string[] | undefined): {
  programId?: { in: string[] };
} {
  if (assignedProgramIds === undefined) {
    return {};
  }

  return {
    programId: {
      in: assignedProgramIds,
    },
  };
}
