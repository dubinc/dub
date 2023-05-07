import BlurImage from "#/ui/blur-image";
import Link from "next/link";

export default async function Author({
  username,
  imageOnly,
}: {
  username: string;
  imageOnly?: boolean;
}) {
  const response = await fetch(
    `https://api.twitter.com/1.1/users/show.json?screen_name=${username}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      next: {
        revalidate: 60 * 60 * 24, // 24 hours
      },
    },
  );

  const data = await response.json();
  if (data.errors) {
    console.error(data.errors);
    return null;
  }

  return imageOnly ? (
    <BlurImage
      src={data.profile_image_url_https.replace("_normal", "")}
      alt={data.name}
      width={36}
      height={36}
      className="rounded-full transition-all group-hover:brightness-90"
    />
  ) : (
    <Link
      href={`https://twitter.com/${data.screen_name}`}
      className="group flex items-center space-x-3"
      target="_blank"
      rel="noopener noreferrer"
    >
      <BlurImage
        src={data.profile_image_url_https.replace("_normal", "")}
        alt={data.name}
        width={48}
        height={48}
        className="rounded-full transition-all group-hover:brightness-90"
      />
      <div className="flex flex-col">
        <p className="font-bold text-gray-700">{data.name}</p>
        <p className="text-sm text-gray-500">@{data.screen_name}</p>
      </div>
    </Link>
  );
}
