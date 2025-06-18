import { Flex, Heading, Text } from "@radix-ui/themes";
import Image from "next/image";
import Link from "next/link";
import QrDisabledIcon from "../ui/qr-disabled/assets/qr-disabled.svg";

export default function NotFound() {
  return (
    <Flex
      direction="column"
      align="center"
      justify="start"
      className="bg-primary-100 h-[calc(100vh-51px)] w-full px-3 py-6"
    >
      <Flex
        direction="column"
        align="center"
        gap="4"
        className="w-full max-w-[375px] px-3 py-6"
      >
        <Flex
          direction="column"
          align="center"
          className="w-full gap-[18px] rounded-lg bg-white p-4 pb-6"
        >
          <Flex justify="center" align="center">
            <Image
              src={QrDisabledIcon}
              alt="Disabled QR Code"
              width={216}
              height={280}
              className="object-contain"
              priority
            />

            <div className="absolute bottom-0 left-0 right-0 h-[100px] bg-gradient-to-t from-white via-white/70 to-transparent" />
          </Flex>

          <Flex
            direction="column"
            justify="center"
            align="center"
            gap="3"
            className="w-full px-0"
          >
            <Heading as="h1" size="6" className="text-secondary font-semibold">
              404
            </Heading>

            <Text as="p" size="3" className="text-neutral-600">
              The page you're looking for doesn't exist
            </Text>

            <Link
              href="/"
              className="border-secondary bg-secondary hover:bg-secondary-800 hover:ring-secondary-200 mt-4 flex h-9 w-fit items-center justify-center rounded-md border px-4 text-sm text-white transition-all hover:ring-4"
            >
              Go back home
            </Link>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}
