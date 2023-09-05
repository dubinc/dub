import { defineDocumentType, makeSource } from "contentlayer/source-files";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import GithubSlugger from "github-slugger";
import { capitalize } from "./lib/utils";

export const BlogPost = defineDocumentType(() => ({
  name: "BlogPost",
  filePathPattern: `**/blog/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true,
    },
    seoTitle: {
      type: "string",
    },
    publishedAt: {
      type: "string",
      required: true,
    },
    summary: {
      type: "string",
      required: true,
    },
    seoDescription: {
      type: "string",
    },
    image: {
      type: "string",
      required: true,
    },
    author: {
      type: "string",
      required: true,
    },
    categories: {
      type: "list",
      of: {
        type: "enum",
        options: ["company", "education", "customer-stories"],
        default: "company",
      },
      required: true,
    },
    related: {
      type: "list",
      of: {
        type: "string",
      },
    },
  },
  // @ts-ignore
  computedFields: computedFields("blog"),
}));

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

export const HelpPost = defineDocumentType(() => ({
  name: "HelpPost",
  filePathPattern: `**/help/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true,
    },
    updatedAt: {
      type: "string",
      required: true,
    },
    summary: {
      type: "string",
      required: true,
    },
    author: {
      type: "string",
      required: true,
    },
    categories: {
      type: "list",
      of: {
        type: "enum",
        options: [
          "overview",
          "getting-started",
          "link-management",
          "custom-domains",
          "migrating",
          "saml-sso",
          "api",
        ],
        default: "overview",
      },
      required: true,
    },
    related: {
      type: "list",
      of: {
        type: "string",
      },
    },
    excludeHeadingsFromSearch: {
      type: "boolean",
    },
  },
  // @ts-ignore
  computedFields: computedFields("help"),
}));

export const LegalPost = defineDocumentType(() => ({
  name: "LegalPost",
  filePathPattern: `**/legal/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true,
    },
    updatedAt: {
      type: "string",
      required: true,
    },
  },
  // @ts-ignore
  computedFields: computedFields("legal"),
}));

const computedFields = (type: "blog" | "changelog" | "help" | "legal") => ({
  slug: {
    type: "string",
    resolve: (doc) => doc._raw.flattenedPath.replace(`${type}/`, ""),
  },
  tableOfContents: {
    type: "array",
    resolve: (doc) => {
      // get all markdown heading 2 nodes (##)
      const headings = doc.body.raw.match(/^##\s.+/gm);
      const slugger = new GithubSlugger();
      return (
        headings?.map((heading) => {
          const title = heading.replace(/^##\s/, "");
          return {
            title,
            slug: slugger.slug(title),
          };
        }) || []
      );
    },
  },
  images: {
    type: "array",
    resolve: (doc) => {
      return (
        doc.body.raw.match(/(?<=<Image[^>]*\bsrc=")[^"]+(?="[^>]*\/>)/g) || []
      );
    },
  },
  tweetIds: {
    type: "array",
    resolve: (doc) => {
      const tweetMatches = doc.body.raw.match(/<Tweet\sid="[0-9]+"\s\/>/g);
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
      url: `https://dub.co/${doc._raw.flattenedPath}`,
      author: {
        "@type": "Person",
        name: doc.author,
      },
    }),
  },
});

export default makeSource({
  contentDirPath: "content",
  documentTypes: [BlogPost, ChangelogPost, LegalPost, HelpPost],
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
            "data-mdx-heading": "",
          },
        },
      ],
    ],
  },
});
