import { ProgramSchema } from "./programs";
import { GroupWithFormDataSchema } from "./groups";

// Prevent circular dependency
export const GroupWithProgramSchema = GroupWithFormDataSchema.extend({
  program: ProgramSchema
});
