import { Github, UploadCloud } from "@/components/shared/icons";
import CountingNumbers from "../shared/counting-numbers";
import MaxWidthWrapper from "../shared/max-width-wrapper";
import styles from "./features.module.css";

export default function OSS({ stars }: { stars: number }) {
  return (
    <MaxWidthWrapper className="mb-20 py-20">
      <div className="mx-auto max-w-md text-center sm:max-w-xl">
        <h2 className="bg-gradient-to-r from-gray-800 via-gray-500 to-gray-800 bg-clip-text font-display text-4xl font-extrabold leading-tight text-transparent sm:text-5xl sm:leading-tight">
          Proudly open-source
        </h2>
        <p className="mt-5 text-gray-600 sm:text-lg">
          Our source code is available on GitHub - feel free to read, review, or
          contribute to it however you want!
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
  );
}
