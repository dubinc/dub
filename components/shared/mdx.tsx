"use client";

import Link from "next/link";
import Image from "next/image";
import { useMDXComponent } from "next-contentlayer/hooks";
import cx from "classnames";
import { useEffect, useState } from "react";
import Tweet from "./tweet";
import RepoCard, { GithubRepoProps } from "@/components/shared/github-repo";

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
  images: { url: string; blurDataURL: string }[];
  tweets: any[];
  repos: GithubRepoProps[];
}

export function MDX({ code, images, tweets, repos }: MDXProps) {
  const Component = useMDXComponent(code);

  const BlurImage = (props: any) => {
    const image = images.find((image) => image.url === props.src);
    const [isLoading, setLoading] = useState(true);
    const [src, setSrc] = useState(props.src);
    useEffect(() => setSrc(props.src), [props.src]); // update the `src` value when the `prop.src` value changes
    return (
      <Image
        {...props}
        src={src}
        alt={props.alt}
        className={cx(
          props.className,
          "ease w-full rounded-lg duration-300",
          isLoading
            ? "blur-sm" // to create the blur loading effect
            : "blur-none",
        )}
        placeholder="blur"
        blurDataURL={
          image?.blurDataURL ||
          "data:image/webp;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
        }
        onLoadingComplete={async () => {
          setLoading(false);
        }}
      />
    );
  };

  const StaticTweet = ({ id }: { id: string }) => {
    const tweet = tweets.find((tweet: any) => tweet.id === id);
    return <Tweet metadata={tweet} />;
  };

  const GithubRepo = ({ url }: { url: string }) => {
    const repo = repos.find((repo) => repo.url === url);
    return <RepoCard {...repo!} />;
  };

  return (
    <article className="prose prose-thead:text-lg prose-headings:font-display prose-h2:text-3xl prose-neutral mx-5 sm:mx-auto">
      <Component
        components={{ ...components, BlurImage, StaticTweet, GithubRepo }}
      />
    </article>
  );
}
