import { ZodOpenApiPathsObject } from "zod-openapi";
import { createFolder } from "./create-folder";
import { deleteFolder } from "./delete-folder";
import { getFolders } from "./get-folders";
import { updateFolder } from "./update-folder";

export const foldersPaths: ZodOpenApiPathsObject = {
  "/folders": {
    post: createFolder,
    get: getFolders,
  },
  "/folders/{id}": {
    patch: updateFolder,
    delete: deleteFolder,
  },
};
