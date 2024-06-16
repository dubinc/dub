export const scopes = [
  // Workspaces
  "workspaces.read",

  // Links
  "links.read",
  "links.write",

  // Analytics
  "analytics.read",

  // Tags
  "tags.read",
  "tags.write",
] as const;

export type Scope = typeof scopes[number];

// TODO:
// Make the structure of the scopes more dynamic so that it can be used in the UI

// export const scopes
//  = [
//   {
//     name: "Links",
//     description: "Create, read, update, and delete links",
//     endpoints: ["/links"],
//     permissions: [
//       {
//         scope: "links.read",
//         description: "Read links",
//       },
//       {
//         scope: "links.write",
//         description: "Write links",
//       },
//     ],
//   },
// ] as const;
