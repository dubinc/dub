import { createLinkBodySchemaAsync } from "./apps/web/lib/zod/schemas/links";
import { preprocessLinkPreviewImage } from "./apps/web/lib/zod/schemas/images";

const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function test() {
  try {
    const result = await createLinkBodySchemaAsync.parseAsync({
      url: "https://google.com",
      image: base64Image,
      proxy: true
    });
    console.log("Validation successful:", result.image === base64Image);
  } catch (e) {
    console.error("Validation failed:", e);
  }
}

test();
