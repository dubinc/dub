import {
  linksDisplayPropertyIds,
  linksSortOptions,
  linksViewModes,
} from "@/lib/links/links-display";
import { z } from "zod";

export const linksDisplaySchema = z.object({
  viewMode: z.enum(linksViewModes),
  sortBy: z.enum(
    linksSortOptions.map(({ slug }) => slug) as [string, ...string[]],
  ),
  showArchived: z.boolean(),
  displayProperties: z.array(z.enum(linksDisplayPropertyIds)),
});

export const workspacePreferencesValueSchemas = {
  linksDisplay: linksDisplaySchema.nullish(),
} as const;

export const workspacePreferencesSchema = z.object(
  workspacePreferencesValueSchemas,
);

export type WorkspacePreferencesKey =
  keyof typeof workspacePreferencesValueSchemas;

export type WorkspacePreferencesValue<K extends WorkspacePreferencesKey> =
  z.infer<(typeof workspacePreferencesValueSchemas)[K]>;
