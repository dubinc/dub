import { defineDocumentType, makeSource } from "contentlayer/source-files";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { capitalize } from "./lib/utils";

export const ChangelogPost = defineDocumentType(() => ({
  name: "ChangelogPost",
  filePathPattern: `**/changelog/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true,
    },
    publishedAt: {
      type: "string",
      required: true,
    },
    summary: {
      type: "string",
      required: true,
    },
    image: {
      type: "string",
      required: true,
    },
    author: {
      type: "string",
      required: true,
    },
  },
  // @ts-ignore
  computedFields: computedFields("changelog"),
}));

const computedFields = (type: "changelog" | "blog") => ({
  slug: {
    type: "string",
    resolve: (doc) => doc._raw.flattenedPath.replace(`${type}/`, ""),
  },
  images: {
    type: "array",
    resolve: (doc) => {
      return doc.body.raw.match(
        /(?<=<BlurImage[^>]*\bsrc=")[^"]+(?="[^>]*\/>)/g,
      );
    },
  },
  tweetIds: {
    type: "array",
    resolve: (doc) => {
      const tweetMatches = doc.body.raw.match(
        /<StaticTweet\sid="[0-9]+"\s\/>/g,
      );
      return tweetMatches?.map((tweet) => tweet.match(/[0-9]+/g)[0]) || [];
    },
  },
  githubRepos: {
    type: "array",
    resolve: (doc) => {
      // match all <GithubRepo url=""/> and extract the url
      return doc.body.raw.match(
        /(?<=<GithubRepo[^>]*\burl=")[^"]+(?="[^>]*\/>)/g,
      );
    },
  },
  structuredData: {
    type: "object",
    resolve: (doc) => ({
      "@context": "https://schema.org",
      "@type": `${capitalize(type)}Posting`,
      headline: doc.title,
      datePublished: doc.publishedAt,
      dateModified: doc.publishedAt,
      description: doc.summary,
      image: doc.image,
      url: `https://dub.sh/${doc._raw.flattenedPath}`,
      author: {
        "@type": "Person",
        name: doc.author,
      },
    }),
  },
});

export default makeSource({
  contentDirPath: "posts",
  documentTypes: [ChangelogPost],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypePrettyCode,
        {
          theme: "one-dark-pro",
          onVisitLine(node) {
            // Prevent lines from collapsing in `display: grid` mode, and allow empty
            // lines to be copy/pasted
            if (node.children.length === 0) {
              node.children = [{ type: "text", value: " " }];
            }
          },
          onVisitHighlightedLine(node) {
            node.properties.className.push("line--highlighted");
          },
          onVisitHighlightedWord(node) {
            node.properties.className = ["word--highlighted"];
          },
        },
      ],
      [
        rehypeAutolinkHeadings,
        {
          properties: {
            className: ["anchor"],
          },
        },
      ],
    ],
  },
});
