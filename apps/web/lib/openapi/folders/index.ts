import { ZodOpenApiPathsObject } from "zod-openapi";
import { createFolder } from "./create-folder";
import { deleteFolder } from "./delete-folder";
import { listFolders } from "./list-folders";
import { updateFolder } from "./update-folder";

export const foldersPaths: ZodOpenApiPathsObject = {
  "/folders": {
    post: createFolder,
    get: listFolders,
  },
  "/folders/{id}": {
    patch: updateFolder,
    delete: deleteFolder,
  },
};
