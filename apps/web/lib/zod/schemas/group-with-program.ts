import { GroupWithFormDataSchema } from "./groups";
import { ProgramSchema } from "./programs";

// we're keeping this in a separate file to avoid circular dependency
export const GroupWithProgramSchema = GroupWithFormDataSchema.extend({
  program: ProgramSchema,
});
