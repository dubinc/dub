import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { parse, walk, ELEMENT_NODE } from "ultrahtml";
import he from "he";
import { recordMetatags } from "@/lib/upstash";

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

const validateUrl = (input: string) => {
  let url: URL;

  try {
    url = new URL(input);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
};

export const getMetaTags = async (url: string, ev: NextFetchEvent) => {
  const ast = await getAst(url);

  let data = {
    title: new Set(),
    description: new Set(),
    image: new Set(),
  };

  // I use a Set here because Set.has() is O(1). Array.includes() is O(n)
  const combinations = {
    description: new Set([
      "description",
      "og:description",
      "twitter:description",
    ]),
    image: new Set(["og:image", "twitter:image", "icon", "image_src"]),
    title: new Set(["og:title", "twitter:title", "title"]),
  };

  await walk(ast, (node) => {
    if (node.type === ELEMENT_NODE) {
      const { name, attributes } = node;

      const { content: unescapedContent } = attributes;

      const property = attributes.property || attributes.name;

      if (name === "title") {
        const title: string = node.children[0].value;
        title && data.title.add(title);
      }

      if (unescapedContent) {
        const content = escapeEntities(unescapedContent);

        if (name === "meta") {
          const { description, image, title } = combinations;
          if (description.has(property)) {
            data.description.add(content);
          }

          if (image.has(property)) {
            const isUrl = validateUrl(content);
            let value = "";
            if (isUrl) {
              value = content;
            } else {
              const { protocol, host } = new URL(url);
              const baseURL = `${protocol}//${host}`;

              value = new URL(content, baseURL).toString();
            }
            data.image.add(value);
          }

          if (title.has(property)) {
            data.title.add(content);
          }
        }
      }
    }
  });

  // ev.waitUntil(
  //   recordMetatags(url, data.title && data.description && data.image ? false : true),
  // );

  return {
    title: [...data.title],
    description: [...data.description],
    image: [...data.image],
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
