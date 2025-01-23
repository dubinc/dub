import { FolderPermission, FolderSummary } from "@/lib/types";
import { FolderAccessLevel, FolderUserRole } from "@dub/prisma/client";

export const FOLDER_WORKSPACE_ACCESS: Record<FolderAccessLevel, string> = {
  read: "Can view",
  write: "Can edit",
} as const;

export const FOLDER_USER_ROLE: Record<FolderUserRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
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
