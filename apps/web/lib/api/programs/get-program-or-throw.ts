import { ProgramProps } from "@/lib/types";
import {
  ProgramSchema,
  ProgramWithLanderDataSchema,
} from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export const getProgramOrThrow = async (
  {
    workspaceId,
    programId,
  }: {
    workspaceId: string;
    programId: string;
  },
  {
    includeLanderData = false,
  }: {
    includeLanderData?: boolean;
  } = {},
) => {
  const program = (await prisma.program.findUnique({
    where: {
      id: programId,
      workspaceId,
    },
  })) as ProgramProps | null;

  if (!program) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found",
    });
  }

  return (
    includeLanderData ? ProgramWithLanderDataSchema : ProgramSchema
  ).parse(program);
};
