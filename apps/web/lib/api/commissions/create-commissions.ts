import { createCommissionBodySchema } from "@/lib/zod/schemas/commissions";
import { z } from "zod";

export async function createCommissions(
  input: z.infer<typeof createCommissionBodySchema> & { programId: string },
) {
  //
}
