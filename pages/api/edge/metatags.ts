import { NextRequest, NextResponse } from "next/server";
import { parse, walk, ELEMENT_NODE } from "ultrahtml";
import he from "he";

const getHtml = async (url: string) => {
	const res = await fetch(url);
	return await res.text();
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
const getMetaTags = async (url: string) => {
	const ast = await getAst(url);

	let final = {
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
				title && final.title.add(title);
			}

			if (unescapedContent) {
				const content = escapeEntities(unescapedContent);

				if (name === "meta") {
					const { description, image, title } = combinations;
					if (description.has(property)) {
						final.description.add(content);
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
						final.image.add(value);
					}

					if (title.has(property)) {
						final.title.add(content);
					}
				}
			}
		}
	});
	return {
		metaTags: {
			title: [...final.title],
			description: [...final.description],
			image: [...final.image],
		},
	};
};

export default async function handler(req: NextRequest, res: NextResponse) {
	const { searchParams } = new URL(req.url);
	const url = searchParams.get("url");

	if (typeof url === "string") {
		const tags = await getMetaTags(url);

		return new Response(JSON.stringify({ url, ...tags }), {
			status: 200,
			headers: {
				"content-type": "application/json",
			},
		});
	}

	return new Response("Please provide a URL!");
}

export const config = {
	runtime: "experimental-edge",
};
