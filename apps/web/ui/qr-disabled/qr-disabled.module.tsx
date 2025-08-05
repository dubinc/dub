import { Flex, Heading, Text } from "@radix-ui/themes";
import Image from "next/image";
import Link from "next/link";
import { FC } from "react";
import QrDisabledIcon from "./assets/qr-disabled.svg";

export const QrDisabledModule: FC = () => {
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
            <Heading
              as="h1"
              size="4"
              className="text-neutral text-center leading-[120%] tracking-[0.02em]"
            >
              This QR code is temporarily deactivated.
            </Heading>

            <Flex direction="column" align="center">
              <Text as="p" size="2" className="text-neutral-800">
                Are you the owner?
              </Text>
              <Text as="span" size="2" className="text-center text-neutral-800">
                Please{" "}
                <Link href="/login" className="text-secondary">
                  Log in
                </Link>{" "}
                to renew your subscription or reactivate your QR code.
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
