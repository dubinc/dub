import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { FC, ReactNode } from "react";

interface IGetInfoCardProps {
  title: string;
  content: string;
  img: ReactNode;
}
export const FeaturesCard: FC<IGetInfoCardProps> = ({
  title,
  content,
  img,
}) => {
  return (
    <Card className="border-border-100 border">
      <Flex
        direction="column"
        align="start"
        justify="start"
        gap={{ sm: "3", md: "4" }}
      >
        <Box className="[&_svg>path]:fill-primary [&_svg>g]:stroke-primary [&_svg]:h-8 [&_svg]:w-8">
          {img}
        </Box>
        <Heading as="h3" size="3" weight="bold" className="text-neutral">
          {title}
        </Heading>
        <Text size="2" className="text-neutral-300">
          {content}
        </Text>
      </Flex>
    </Card>
  );
};
