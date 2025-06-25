import { cn } from "@dub/utils";
import { Heading } from "@radix-ui/themes";
import { FC } from "react";

interface ISectionTitleProps {
  titleFirstPart: string;
  highlightedTitlePart?: string;
  titleSecondPart?: string;
  className?: string;
}

export const SectionTitle: FC<ISectionTitleProps> = ({
  titleFirstPart,
  highlightedTitlePart,
  titleSecondPart,
  className,
}) => (
  <Heading
    as="h2"
    weight="bold"
    align="center"
    className={cn(
      "text-neutral max-w-[300px] !text-[28px] lg:max-w-none lg:!text-[48px] lg:!leading-10",
      className,
    )}
  >
    {titleFirstPart}
    {highlightedTitlePart && (
      <>
        {" "}
        <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
          {highlightedTitlePart}
        </span>
      </>
    )}
    {titleSecondPart && ` ${titleSecondPart}`}
  </Heading>
);
