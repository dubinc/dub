import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { FC, ReactNode } from "react";

interface IGetInfoCardProps {
  title: string;
  content: string;
  img: ReactNode;
  cardNumber: number;
}
export const InfoCard: FC<IGetInfoCardProps> = ({
  title,
  content,
  img,
  cardNumber,
}) => {
  return (
    <Card className="border-border-100 rounded-lg border">
      <Flex direction="column" gap={{ initial: "3", lg: "4" }} align="center">
        <Flex
          justify="center"
          className="bg-border-100 relative h-[140px] w-full max-w-[342px] flex-shrink-0 overflow-hidden rounded-lg [&>img]:w-[140px] [&>img]:self-end"
        >
          <Box className="to-border-300 from-border-100 absolute bottom-0 left-1/2 h-[140px] w-[342px] -translate-x-1/2 rounded-[99px] bg-gradient-to-b opacity-50 blur-[80px]"></Box>
          {img}
        </Flex>
        <Flex gap="2" align="center" className="w-full flex-row">
          <Flex
            align="center"
            justify="center"
            className="relative h-7 w-7 rounded-full md:h-8 md:w-8"
          >
            <Box
              className="absolute inset-0 -m-[2px] rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #115740 20.53%, #25BD8B 37.79%)",
                padding: "2px",
              }}
            >
              <Flex
                align="center"
                justify="center"
                className="text-neutral h-full w-full rounded-full bg-white text-xs font-semibold md:text-sm"
              >
                {cardNumber}
              </Flex>
            </Box>
          </Flex>

          <Heading as="h3" size={"3"} weight={"bold"} className="text-neutral">
            {title}
          </Heading>
        </Flex>
        <Text as="div" size="2" className="text-neutral-300">
          {content}
        </Text>
      </Flex>
    </Card>
  );
};
