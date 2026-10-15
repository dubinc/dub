// Workspace create and rename reject slugs ending in `-staging`, so this slug
// is only ever taken by the workspace's own staging workspace or program.
export function getPreferredStagingSlug(slug: string) {
  return `${slug}-staging`;
}
