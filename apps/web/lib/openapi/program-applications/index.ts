import { ZodOpenApiPathsObject } from "zod-openapi";
import { approveProgramApplication } from "./approve-program-application";
import { listProgramApplications } from "./list-program-applications";
import { rejectProgramApplication } from "./reject-program-application";

export const programApplicationsPaths: ZodOpenApiPathsObject = {
  "/program-applications": {
    get: listProgramApplications,
  },
  "/program-applications/approve": {
    post: approveProgramApplication,
  },
  "/program-applications/reject": {
    post: rejectProgramApplication,
  },
};
