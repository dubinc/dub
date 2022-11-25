import { NextFetchEvent, NextRequest } from "next/server";
import { parse, walk, ELEMENT_NODE } from "ultrahtml";
import he from "he";
import { recordMetatags } from "@/lib/upstash";
import { isValidUrl } from "@/lib/utils";

const getHtml = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // timeout if it takes longer than 5 seconds
  return await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent": "dub-bot/1.0",
    },
  }).then((res) => {
    clearTimeout(timeoutId);
    return res.text();
  });
};

const getAst = async (url: string) => {
  const html = await getHtml(url);
  const ast = parse(html);
  return ast;
};

const escapeEntities = (string: string) => {
  return he.decode(string);
};

const getRelativeUrl = (url: string, imageUrl: string) => {
  if (!imageUrl) return null;
  if (isValidUrl(imageUrl)) {
    return imageUrl;
  }
  const { protocol, host } = new URL(url);
  const baseURL = `${protocol}//${host}`;
  return new URL(imageUrl, baseURL).toString();
};

export const getMetaTags = async (url: string, ev: NextFetchEvent) => {
  const obj = {};
  const ast = await getAst(url);

  await walk(ast, (node) => {
    if (node.type === ELEMENT_NODE) {
      const { name, attributes } = node;
      const property =
        attributes.name ||
        attributes.property ||
        attributes.itemprop ||
        attributes.rel ||
        attributes["http-equiv"];
      const content = attributes.content || attributes.href;

      if (name === "title") {
        obj["title"] = escapeEntities(node.children[0].value);
        // if content is not string, skip
      } else if (typeof content !== "string") {
        return;
      } else {
        obj[property] = escapeEntities(content);
      }
    }
  });

  const title = obj["og:title"] || obj["twitter:title"] || obj["title"];

  const description =
    obj["description"] || obj["og:description"] || obj["twitter:description"];

  const image =
    obj["og:image"] || obj["twitter:image"] || obj["image_src"] || obj["icon"];

  ev.waitUntil(
    recordMetatags(url, title && description && image ? false : true),
  );

  return {
    title,
    description,
    image: getRelativeUrl(url, image),
  };
};

export default async function handler(req: NextRequest, ev: NextFetchEvent) {
  if (req.method === "GET") {
    const url = req.nextUrl.searchParams.get("url");
    try {
      new URL(url).hostname;
    } catch (e) {
      return new Response("Invalid URL", { status: 400 });
    }
    const metatags = await getMetaTags(url, ev);
    return new Response(JSON.stringify(metatags), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}

export const config = {
  runtime: "experimental-edge",
};
