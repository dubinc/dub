import { FolderAccessLevel, FolderUserRole } from "@prisma/client";
import { FolderPermission } from "./types";

export const FOLDER_WORKSPACE_ACCESS = {
  view: "Can view",
  edit: "Can edit",
} as const;

export const FOLDER_USER_ROLE = {
  owner: "Owner",
  viewer: "Viewer",
  editor: "Editor",
} as const;

export const FOLDER_PERMISSIONS = [
  "folders.read",
  "folders.write",
  "folders.links.write", // Move links to a folder
  "folders.users.write", // Add or remove users to a folder
] as const;

export const FOLDER_WORKSPACE_ACCESS_TO_USER_ROLE: Record<
  FolderAccessLevel,
  FolderUserRole
> = {
  view: "viewer",
  edit: "editor",
} as const;

export const FOLDER_USER_ROLE_TO_PERMISSIONS: Record<
  FolderUserRole,
  FolderPermission[]
> = {
  owner: [
    "folders.read",
    "folders.write",
    "folders.links.write",
    "folders.users.write",
  ],
  editor: ["folders.read", "folders.links.write"],
  viewer: ["folders.read"],
} as const;
