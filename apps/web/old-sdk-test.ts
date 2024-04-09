import Dub from "dub";

const dub = new Dub({ baseURL: "/api/v1", token: "my-token" });

const testMethods = async () => {
  // Create link
  await dub.links.create({ url: "https://example.com" });

  // Get link
  // .info() not available in the SDK
  // await dub.links.info()

  // This expression is not callable.
  // Type 'Info' has no call signatures.

  // Update link
  await dub.links.update("my-link-id", { url: "https://example.com" });

  // Delete link
  await dub.links.deleteLink("my-link-id", { projectSlug: "my-project-slug" });

  // List links
  await dub.links.list({ projectSlug: "my-project-slug" });

  // Bulk create links
  // .bulk() not available in the SDK
  // await dub.links.bulk([
  //   { url: "https://example.com" },
  //   { url: "https://example.com" },
  // ]);
};
