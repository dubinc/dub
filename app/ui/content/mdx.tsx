"use client";

import Link from "next/link";
import { useMDXComponent } from "next-contentlayer/hooks";
import Tweet from "#/ui/tweet";
import GithubRepo, { GithubRepoProps } from "@/components/shared/github-repo";
import BlurImage from "#/ui/blur-image";
import { Tweet as TweetProps } from "react-tweet/api";

const CustomLink = (props: any) => {
  const href = props.href;

  if (href.startsWith("/")) {
    return (
      <Link {...props} href={href}>
        {props.children}
      </Link>
    );
  }

  if (href.startsWith("#")) {
    return <a {...props} />;
  }

  return <a target="_blank" rel="noopener noreferrer" {...props} />;
};

const components = {
  a: CustomLink,
};

interface MDXProps {
  code: string;
  images?: { url: string; blurDataURL: string }[];
  tweets?: any[];
  repos?: GithubRepoProps[];
}

export function MDX({ code, images, tweets, repos }: MDXProps) {
  const Component = useMDXComponent(code);

  const MDXImage = (props: any) => {
    if (!images) return null;
    const blurDataURL = images.find(
      (image) => image.url === props.src,
    )?.blurDataURL;

    return (
      <BlurImage
        {...props}
        alt={props.alt || "Image"}
        placeholder="blur"
        blurDataURL={
          blurDataURL ||
          "data:image/webp;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
        }
      />
    );
  };

  const MDXTweet = ({ id }: { id: string }) => {
    if (!tweets) return null;
    const tweet = tweets.find((tweet: TweetProps) => tweet.id_str === id);
    return <Tweet data={tweet} />;
  };

  const MDXRepo = ({ url }: { url: string }) => {
    if (!repos) return null;
    const repo = repos.find((repo) => repo.url === url);
    return <GithubRepo {...repo!} />;
  };

  return (
    <article
      data-mdx-container
      className={`
    prose prose-gray w-full transition-all prose-headings:relative prose-headings:scroll-mt-20 prose-headings:font-display prose-headings:font-bold
    prose-h2:text-2xl prose-a:font-medium
    prose-a:text-gray-500 prose-a:underline-offset-4 hover:prose-a:text-black prose-code:rounded-md 
    prose-code:bg-gray-200 prose-code:px-2 prose-code:py-1 prose-code:font-medium prose-code:text-rose-500 prose-code:before:hidden prose-code:after:hidden prose-thead:text-lg 
    `}
    >
      <Component components={{ ...components, MDXImage, MDXTweet, MDXRepo }} />
    </article>
  );
}
