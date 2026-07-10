import { prisma } from "@/lib/prisma";

export async function appUninstalled({ shopDomain }: { shopDomain: string }) {
  await prisma.project.update({
    where: {
      shopifyStoreId: shopDomain,
    },
    data: {
      shopifyStoreId: null,
    },
  });

  return "[Shopify] App Uninstalled received.";
}
