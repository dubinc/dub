"use client";

import BlurImage from "#/ui/blur-image";
import { cn, nFormatter, truncate } from "#/lib/utils";
import { Heart, Message, Twitter } from "@/components/shared/icons";
import Tilt from "react-parallax-tilt";
import { enrichTweet } from "react-tweet";
import { Tweet } from "react-tweet/api";

export default function Tweet({
  data,
  className,
  noTilt,
}: {
  data: Tweet | null;
  className?: string;
  noTilt?: boolean;
}) {
  // if data is null
  if (!data) {
    return (
      <div
        className={`${className} prose flex h-[20rem] break-inside-avoid items-center justify-center rounded-lg border border-gray-300 bg-white/20 bg-clip-padding p-6 pb-4 text-center text-sm backdrop-blur-lg backdrop-filter`}
      >
        There was an error loading this tweet.
      </div>
    );
  }

  const enrichedData = enrichTweet(data);

  const {
    url,
    text,
    user,
    photos,
    video,
    entities,
    favorite_count,
    conversation_count,
    like_url,
    reply_url,
    created_at,
  } = enrichedData;

  const createdAt = new Date(created_at);

  const TweetBody = (
    <div
      className={`${
        noTilt ? className : ""
      } not-prose break-inside-avoid rounded-lg border border-gray-300 bg-white/20 bg-clip-padding p-6 pb-4 backdrop-blur-lg backdrop-filter`}
    >
      {/* User info, verified badge, twitter logo, text, etc. */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <a href={user.follow_url} target="_blank" rel="noreferrer">
              <BlurImage
                alt={user.screen_name}
                height={48}
                width={48}
                src={user.profile_image_url_https}
                className={cn(
                  "h-10 w-10 overflow-hidden rounded-full border border-gray-200 transition-all ease-in-out hover:scale-105",
                  {
                    "rounded-full": user.profile_image_shape === "Circle",
                    "rounded-md": user.profile_image_shape === "Square",
                  },
                )}
              />
            </a>
            <div>
              <a
                href={user.follow_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center font-semibold text-gray-900"
              >
                {truncate(user.name, 20)}
                {user.verified ||
                user.is_blue_verified ||
                user.verified_type ? (
                  <svg
                    aria-label="Verified Account"
                    className={cn("ml-1 inline h-4 w-4", {
                      "text-blue-500": user.is_blue_verified,
                      "text-yellow-500": user.verified_type === "Business",
                    })}
                    viewBox="0 0 24 24"
                  >
                    <g fill="currentColor">
                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                    </g>
                  </svg>
                ) : null}
              </a>
              <div className="flex items-center space-x-1">
                <a
                  href={user.follow_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-gray-500 transition-all duration-75 hover:text-gray-900"
                >
                  @{truncate(user.screen_name, 16)}
                </a>
                <p>·</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-gray-500 transition-all duration-75 hover:text-gray-900"
                >
                  {createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </a>
              </div>
            </div>
          </div>
          <a href={url} target="_blank" rel="noreferrer">
            <span className="sr-only">Link to tweet</span>
            <Twitter className="h-5 w-5 text-[#3BA9EE] transition-all ease-in-out hover:scale-105" />
          </a>
        </div>
        <div className="mb-2 mt-4 truncate whitespace-pre-wrap text-[15px] text-gray-700">
          {entities.map((item, i) => {
            switch (item.type) {
              case "hashtag":
              case "mention":
              case "url":
              case "symbol":
                return (
                  <a
                    key={i}
                    className="font-normal text-[rgb(29,161,242)] no-underline"
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.text}
                  </a>
                );
              case "media":
                return;
              default:
                // We use `dangerouslySetInnerHTML` to preserve the text encoding.
                // https://github.com/vercel-labs/react-tweet/issues/29
                return (
                  <span
                    key={i}
                    dangerouslySetInnerHTML={{ __html: item.text }}
                  />
                );
            }
          })}
        </div>
      </div>

      {/* Images, Preview images, videos, polls, etc. */}
      <div className="my-3">
        {video && (
          <video
            className="rounded-lg border border-gray-200 drop-shadow-sm"
            loop
            autoPlay
            muted
            playsInline
          >
            <source src={video.variants[0].src} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
        {photos && (
          <div
            className={cn({
              "inline-grid grid-cols-2 gap-x-2 gap-y-2": photos.length > 1,
            })}
          >
            {photos.map((m) => (
              <a key={m.url} href={url} target="_blank">
                <BlurImage
                  key={m.url}
                  alt={text}
                  width={2048}
                  height={m.height * (2048 / m.width)}
                  src={m.url}
                  className="rounded-lg border border-gray-200 drop-shadow-sm"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center space-x-8 text-sm text-gray-500">
        <a
          className="group flex items-center space-x-3 hover:text-red-600"
          href={like_url}
          target="_blank"
          rel="noreferrer"
        >
          <Heart className="h-4 w-4 group-hover:fill-red-600" />
          <p>{nFormatter(favorite_count)}</p>
        </a>
        <a
          className="group flex items-center space-x-3 hover:text-blue-600"
          href={reply_url}
          target="_blank"
          rel="noreferrer"
        >
          <Message className="h-4 w-4 group-hover:fill-blue-600" />
          <p>{nFormatter(conversation_count)}</p>
        </a>
      </div>
    </div>
  );

  return noTilt ? (
    TweetBody
  ) : (
    <Tilt
      glareEnable={true}
      glareMaxOpacity={0.3}
      glareColor="#ffffff"
      glarePosition="all"
      glareBorderRadius="8px"
      tiltMaxAngleX={10}
      tiltMaxAngleY={10}
      className={className}
    >
      {TweetBody}
    </Tilt>
  );
}
