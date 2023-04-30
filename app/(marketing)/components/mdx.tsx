"use client";

import Link from "next/link";
import { useMDXComponent } from "next-contentlayer/hooks";
import Tweet from "../../../components/shared/tweet";
import GithubRepo, { GithubRepoProps } from "@/components/shared/github-repo";
import BlurImage from "@/components/shared/blur-image";

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
    const tweet = tweets.find((tweet: any) => tweet.id === id);
    return <Tweet metadata={tweet} />;
  };

  const MDXRepo = ({ url }: { url: string }) => {
    if (!repos) return null;
    const repo = repos.find((repo) => repo.url === url);
    return <GithubRepo {...repo!} />;
  };

  return (
    <article className="prose prose-gray mx-5 w-full prose-headings:font-display prose-h2:text-3xl prose-thead:text-lg md:mx-0 md:prose-lg">
      <Component components={{ ...components, MDXImage, MDXTweet, MDXRepo }} />
    </article>
  );
}
