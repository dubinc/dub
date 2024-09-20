export const FOLDER_WORKSPACE_ACCESS = {
  view: "Can view",
  edit: "Can edit",
} as const;

export const FOLDER_USER_ROLE = {
  owner: "Owner",
  viewer: "Viewer",
  editor: "Editor",
} as const;

export const FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE = {
  view: "viewer",
  edit: "editor",
} as const;
