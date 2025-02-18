import { FolderPermission, FolderSummary } from "@/lib/types";
import { FolderAccessLevel, FolderUserRole } from "@dub/prisma/client";

export const FOLDER_WORKSPACE_ACCESS: Record<FolderAccessLevel, string> = {
  write: "Can edit",
  read: "Can view",
} as const;

export const FOLDER_USER_ROLE: Record<FolderUserRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
} as const;

export const FOLDER_PERMISSIONS = [
  "folders.read", // Read access to the folder
  "folders.write", // Full access to the folder
  "folders.links.write", // Manage links in the folder
  "folders.users.write", // Manage folder users
] as const;

export const FOLDER_WORKSPACE_ACCESS_TO_FOLDER_USER_ROLE: Record<
  FolderAccessLevel,
  FolderUserRole
> = {
  read: "viewer",
  write: "editor",
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

export const unsortedLinks: FolderSummary = {
  id: "unsorted",
  name: "Links",
  accessLevel: null,
  linkCount: -1,
};
