import Image from "next/future/image";
import Link from "next/link";
import {
  Airplay,
  Chart,
  Github,
  QR,
  UploadCloud,
} from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import CountingNumbers from "../shared/counting-numbers";
import styles from "./features.module.css";

const Features = ({ stars }: { stars: number }) => {
  return (
    <div>
      <MaxWidthWrapper className="py-20">
        <div className="mx-auto max-w-sm text-center sm:max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-black sm:text-5xl sm:leading-tight">
            Fast.{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Powerful.
            </span>{" "}
            Open source.
          </h2>
          <p className="mt-5 text-gray-600 sm:text-lg">
            With Dub, you get the best of both worlds: a powerful link shortener
            with built-in analytics, and the freedom to host it yourself.
          </p>
        </div>

        {/* Analytics */}
        <div className="my-20 flex flex-col-reverse items-center lg:flex-row lg:space-x-10">
          <div className="my-10 flex flex-col space-y-5 lg:my-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
              <Chart className="h-7 w-7 text-white" />
            </div>
            <h3 className="mt-5 font-display text-3xl font-bold text-black">
              Built-in analytics
            </h3>

            <p className="mt-3 text-gray-500">
              Dub provides powerful analytics for your links, including
              geolocation, device, and browser information.
            </p>
            <Link
              href={{ pathname: "/", query: { key: "github" } }}
              as="/stats/github"
              shallow
              scroll={false}
            >
              <a className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black">
                View demo
              </a>
            </Link>
          </div>

          <Image
            src="/_static/landing/analytics.png"
            alt="Built-in analytics"
            width={1120}
            height={919}
            className="w-full max-w-[700px] shadow-lg"
          />
        </div>

        {/* Custom Domains */}
        <div className="my-20 flex flex-col items-center lg:flex-row lg:space-x-16">
          <Image
            src="/_static/landing/domains.png"
            alt="Custom domains"
            width={1084}
            height={646}
            className="w-full max-w-[635px] rounded-2xl border border-gray-200 shadow-lg"
          />
          <div className="my-10 flex flex-col space-y-5 lg:my-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
              <Airplay className="h-7 w-7 text-white" />
            </div>
            <h3 className="mt-5 font-display text-3xl font-bold text-black">
              Free custom domains
            </h3>

            <p className="mt-3 text-gray-500">
              At Dub, we believe that you should be able to use your own domain
              when building your brand. That's why we offer free custom domains
              on all plans.
            </p>
            <Link href="https://app.dub.sh">
              <a className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black">
                Create your project
              </a>
            </Link>
          </div>
        </div>

        {/* QR Code */}
        <div className="my-20 flex flex-col-reverse items-center lg:flex-row lg:space-x-10">
          <div className="my-10 flex max-w-md flex-col space-y-5 lg:my-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
              <QR className="h-7 w-7 text-white" />
            </div>
            <h3 className="mt-5 font-display text-3xl font-bold text-black">
              QR code generator
            </h3>

            <p className="mt-3 text-gray-500">
              We also believe QR codes and short links are like peas in a pod.
              That's why we've built a QR code generator right into Dub.
            </p>
            <a
              href="https://dub.sh/qrcode"
              target="_blank"
              rel="noreferrer"
              className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
            >
              Watch the demo
            </a>
          </div>

          <Image
            src="/_static/landing/qr.png"
            alt="Custom domains"
            width={1084}
            height={646}
            className="w-full max-w-[700px] rounded-2xl border border-gray-200 shadow-lg"
          />
        </div>

        {/* Open Source */}
        <div className="my-20 flex flex-col items-center lg:flex-row lg:space-x-16">
          <div className="flex h-96 w-full max-w-[700px] items-center justify-center rounded-2xl bg-gray-900 shadow-lg">
            <div className="flex items-center">
              <a
                href="https://github.com/steven-tey/dub"
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center space-x-2 rounded-md border border-gray-600 bg-gray-800 p-4"
              >
                <Github className="h-5 w-5 text-white" />
                <p className="font-medium text-white">Star</p>
              </a>
              <div className={styles.label}>
                <CountingNumbers
                  value={stars}
                  className="font-display font-medium text-white"
                />
              </div>
            </div>
          </div>
          <div className="my-10 flex flex-col space-y-5 lg:my-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
              <UploadCloud className="h-7 w-7 text-white" />
            </div>
            <h3 className="mt-5 font-display text-3xl font-bold text-black">
              Proudly open source
            </h3>

            <p className="mt-3 text-gray-500">
              Our source code is available on GitHub - feel free to read,
              review, or contribute to it however you want!
            </p>
            <a
              href="https://github.com/steven-tey/dub"
              target="_blank"
              rel="noreferrer"
              className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
};

export default Features;
