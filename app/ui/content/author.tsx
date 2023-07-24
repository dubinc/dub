import { timeAgo } from "#/lib/utils";
import BlurImage from "#/ui/blur-image";
import Link from "next/link";

export default async function Author({
  username,
  updatedAt,
  imageOnly,
}: {
  username: string;
  updatedAt?: string;
  imageOnly?: boolean;
}) {
  const authors = {
    steventey: {
      name: "Steven Tey",
      image:
        "https://pbs.twimg.com/profile_images/1506792347840888834/dS-r50Je_400x400.jpg",
    },
    fmerian: {
      name: "Flo Merian",
      image:
        "https://pbs.twimg.com/profile_images/846637761792790528/WtCc8Xy7_400x400.jpg",
    },
  };

  return imageOnly ? (
    <BlurImage
      src={authors[username].image}
      alt={authors[username].namee}
      width={36}
      height={36}
      className="rounded-full transition-all group-hover:brightness-90"
    />
  ) : updatedAt ? (
    <div className="flex items-center space-x-3">
      <BlurImage
        src={authors[username].image}
        alt={authors[username].name}
        width={36}
        height={36}
        className="rounded-full"
      />
      <div className="flex flex-col">
        <p className="text-sm text-gray-500">
          Written by {authors[username].name}
        </p>
        <p className="text-sm font-light text-gray-400">
          Last updated {timeAgo(new Date(updatedAt))}
        </p>
      </div>
    </div>
  ) : (
    <Link
      href={`https://twitter.com/${username}`}
      className="group flex items-center space-x-3"
      target="_blank"
      rel="noopener noreferrer"
    >
      <BlurImage
        src={authors[username].image}
        alt={authors[username].name}
        width={48}
        height={48}
        className="rounded-full transition-all group-hover:brightness-90"
      />
      <div className="flex flex-col">
        <p className="font-bold text-gray-700">{authors[username].name}</p>
        <p className="text-sm text-gray-500">@{username}</p>
      </div>
    </Link>
  );
}
