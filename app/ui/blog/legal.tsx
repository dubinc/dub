import { LegalPost } from "contentlayer/generated";
import { MDX } from "#/ui/blog/mdx";
import { formatDate } from "#/lib/utils";

export default function LegalPage({ post }: { post: LegalPost }) {
  return (
    <div className="bg-gray-50">
      <div className="bg-white py-20 sm:py-40">
        <h1 className="mt-5 text-center font-display text-4xl font-extrabold leading-[1.15] text-black sm:text-6xl sm:leading-[1.15]">
          {post.title}
        </h1>
      </div>
      <div className="flex flex-col items-center pb-10 pt-20">
        <MDX code={post.body.code} />
        <div className="mt-10 w-full max-w-screen-md border-t border-gray-200 pt-10 text-center">
          <p className="text-gray-500">
            Last updated: {formatDate(post.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
