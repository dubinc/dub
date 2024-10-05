import { getConfig } from "@/utils/config";
import { Dub } from "dub";

export async function createLink({ url, key }: { url: string; key?: string }) {
  const config = await getConfig();

  const dub = new Dub({
    token: config.key,
  });

  return await dub.links.create({
    domain: config.domain,
    url: url,
    key: key,
  });
}

export async function getLinks() {
  const config = await getConfig();

  const dub = new Dub({
    token: config.key,
  });

  return await dub.links.list();
}
