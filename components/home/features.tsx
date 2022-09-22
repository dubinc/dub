import Link from "next/link";
import { Github, Chart, Airplay, UploadCloud } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Image from "next/future/image";
import styles from "./features.module.css";
import CountingNumbers from "../shared/counting-numbers";

const Features = ({ stars }: { stars: number }) => {
  return (
    <div className="bg-white">
      <MaxWidthWrapper className="py-20">
        <div className="max-w-sm sm:max-w-md mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl leading-tight sm:leading-tight font-display font-extrabold text-black">
            Fast.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Powerful.
            </span>{" "}
            Open source.
          </h2>
          <p className="text-gray-600 sm:text-lg mt-5">
            With Dub, you get the best of both worlds: a powerful link shortener
            with built-in analytics, and the freedom to host it yourself.
          </p>
        </div>

        {/* Analytics */}
        <div className="flex lg:space-x-10 flex-col-reverse lg:flex-row items-center my-20">
          <div className="flex flex-col space-y-5 my-10 lg:my-0">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
              <Chart className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-3xl font-bold font-display text-black mt-5">
              Built-in analytics
            </h3>

            <p className="text-gray-500 mt-3">
              Dub provides powerful analytics for your links, including
              geolocation, device, and browser information.
            </p>
            <Link
              href={{ pathname: "/", query: { key: "github" } }}
              as="/stats/github"
              shallow
              scroll={false}
            >
              <a className="rounded-full px-4 py-1.5 bg-black text-white hover:bg-white hover:text-black text-sm border border-black block max-w-fit transition-all">
                View demo
              </a>
            </Link>
          </div>

          <Image
            src="/static/landing/analytics.png"
            alt="Built-in analytics"
            width={1120}
            height={919}
            className="w-full max-w-[700px]"
          />
        </div>

        {/* Custom Domains */}
        <div className="flex lg:space-x-16 flex-col lg:flex-row items-center my-20">
          <Image
            src="/static/landing/domains.png"
            alt="Custom domains"
            width={1084}
            height={646}
            className="w-full max-w-[600px] rounded-2xl border border-gray-200"
          />
          <div className="flex flex-col space-y-5 my-10 lg:my-0">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
              <Airplay className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-3xl font-bold font-display text-black mt-5">
              Free custom domains
            </h3>

            <p className="text-gray-500 mt-3">
              At Dub, we believe that you should be able to use your own domain
              when building your brand. That's why we offer free custom domains
              on all plans.
            </p>
            <Link href="https://app.dub.sh">
              <a className="rounded-full px-4 py-1.5 bg-black text-white hover:bg-white hover:text-black text-sm border border-black block max-w-fit transition-all">
                Create your project
              </a>
            </Link>
          </div>
        </div>

        {/* Open source */}
        <div className="flex lg:space-x-10 flex-col-reverse lg:flex-row items-center my-20">
          <div className="flex flex-col space-y-5 my-10 lg:my-0 max-w-md">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
              <UploadCloud className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-3xl font-bold font-display text-black mt-5">
              Proudly open source
            </h3>

            <p className="text-gray-500 mt-3">
              Our source code is available on GitHub – feel free to read,
              review, or contribute to it however you want!
            </p>
            <a
              href="https://github.com/steven-tey/dub"
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-4 py-1.5 bg-black text-white hover:bg-white hover:text-black text-sm border border-black block max-w-fit transition-all"
            >
              Star on GitHub
            </a>
          </div>

          <div className="flex items-center justify-center rounded-2xl w-full max-w-[700px] bg-gray-900 h-96">
            <div className="flex items-center">
              <a
                href="https://github.com/steven-tey/dub"
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 p-4 h-10 rounded-md bg-gray-800 border border-gray-600"
              >
                <Github className="text-white w-5 h-5" />
                <p className="text-white font-medium">Star</p>
              </a>
              <div className={styles.label}>
                <CountingNumbers
                  value={stars}
                  className="text-white font-medium font-display"
                />
              </div>
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
};

export default Features;
