import { TooltipComponent } from "@/ui/qr-builder/components/tooltip.tsx";
import { Flex } from "@radix-ui/themes";
import { FC } from "react";

interface IFileCardHeaderProps {
  title?: string;
  isLogo?: boolean;
}

export const FileCardTitle: FC<IFileCardHeaderProps> = ({
  title,
  isLogo = false,
}) => {
  return (
    <Flex gap="2" align="center">
      <h3 className="text-neutral text-sm font-medium">{`Upload your ${title}`}</h3>
      {!isLogo && (
        <TooltipComponent
          tooltip={`People will be able to view this ${title} when they scan your QR code.`}
        />
      )}
    </Flex>
  );
};
