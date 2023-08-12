import { Github } from "@/components/shared/icons";
import CountingNumbers from "../counting-numbers";
import MaxWidthWrapper from "../../../components/shared/max-width-wrapper";
import styles from "./features.module.css";

export default async function OSS() {
  const { stargazers_count: stars } = await fetch(
    "https://api.github.com/repos/steven-tey/dub",
    {
      // optional – feel free to remove if you don't want to display star count
      ...(process.env.GITHUB_OAUTH_TOKEN && {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_OAUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
      }),
      next: {
        revalidate: 3600,
      },
    },
  )
    .then((res) => res.json())
    .catch(() => ({ stargazers_count: 10000 }));

  return <OSSSection stars={stars} />;
}

export function OSSSection({ stars }: { stars: number }) {
  return (
    <div className="mt-20 border-t border-gray-200 bg-white/10 py-20 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur">
      <MaxWidthWrapper>
        <div className="mx-auto max-w-md text-center sm:max-w-xl">
          <h2 className="bg-gradient-to-r from-gray-800 via-gray-500 to-gray-800 bg-clip-text font-display text-4xl font-extrabold leading-tight text-transparent sm:text-5xl sm:leading-tight">
            Proudly open-source
          </h2>
          <p className="mt-5 text-gray-600 sm:text-lg">
            Our source code is available on GitHub - feel free to read, review,
            or contribute to it however you want!
          </p>
        </div>
        <div className="flex items-center justify-center py-10">
          <a
            href="https://github.com/steven-tey/dub"
            target="_blank"
            rel="noreferrer"
          >
            <div className="flex items-center">
              <div className="flex h-10 items-center space-x-2 rounded-md border border-gray-600 bg-gray-800 p-4">
                <Github className="h-5 w-5 text-white" />
                <p className="font-medium text-white">Star</p>
              </div>
              <div className={styles.label}>
                <CountingNumbers
                  value={stars}
                  className="font-display font-medium text-white"
                />
              </div>
            </div>
          </a>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
