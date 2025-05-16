import { EQRType, QRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import { Card, Flex } from "@radix-ui/themes";
import { FC } from "react";

interface IQrTypeSelection {
  qrTypesList: QRType[];
  qrTypeActiveTab: EQRType;
  onSelect: (type: EQRType) => void;
}

export const QrTypeSelection: FC<IQrTypeSelection> = ({
  qrTypesList,
  qrTypeActiveTab,
  onSelect,
}) => {
  console.log("QrTypeSelection qrTypeActiveTab", qrTypeActiveTab);
  return (
    // <div>
    /*{qrTypesList.map((type, idx) => (*/
    //   <div
    //     key={type.id}
    //     className={cn(
    //       "text-neutral group flex w-48 items-center justify-center gap-2 rounded-md px-4 py-3.5 font-medium transition-colors",
    //       "hover:bg-border-100 hover:text-neutral",
    //       "data-[state=active]:bg-secondary-100 data-[state=active]:border-secondary data-[state=active]:text-secondary",
    //     )}
    //     onClick={onSelect}
    //   >
    //     <Icon
    //       icon={type.icon}
    //       className={cn(
    //         "h-5 w-5 flex-none",
    //         idx === 4
    //           ? "group-hover:[&>path]:fill-neutral [&>path]:fill-neutral-200"
    //           : "group-hover:[&>g]:stroke-neutral group-hover:[&>path]:stroke-neutral [&>g]:stroke-neutral-200 [&>path]:stroke-neutral-200",
    //         qrTypeActiveTab === type.id &&
    //           (idx === 4
    //             ? "[&>path]:fill-secondary group-hover:[&>path]:fill-secondary"
    //             : "[&>g]:stroke-secondary group-hover:[&>g]:stroke-secondary [&>path]:stroke-secondary group-hover:[&>path]:stroke-secondary"),
    //       )}
    //     />
    //     <span className="whitespace-nowrap text-xs font-normal">
    //       {type.label}
    //     </span>
    //   </div>
    // ))}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
      {qrTypesList.map((type, idx) => (
        <Card
          key={type.id}
          size="1"
          asChild
          // className={cn(
          //   "hover:border-border-500 cursor-pointer p-4 transition-colors",
          //   "flex flex-col items-center text-center",
          // )}
          className={cn(
            "text-neutral !border-border-500 w-42 group flex min-w-[254px] items-center justify-center gap-2 rounded-md border px-4 py-3.5 font-medium transition-colors [&_div]:p-0",
            "hover:bg-border-100 hover:text-neutral",
            "transition-all duration-300 ease-in-out",
            {
              "!bg-secondary-100 !border-secondary":
                qrTypeActiveTab === type.id,
            },
          )}
          onClick={() => onSelect(type.id)}
        >
          <Flex direction="column" align="start">
            <Flex direction="row" gap="2" align="center">
              <Icon
                icon={type.icon}
                className={cn(
                  "h-5 w-5 flex-none",
                  idx === 4
                    ? "group-hover:[&>path]:fill-neutral [&>path]:fill-neutral-200"
                    : "group-hover:[&>g]:stroke-neutral group-hover:[&>path]:stroke-neutral [&>g]:stroke-neutral-200 [&>path]:stroke-neutral-200",
                  qrTypeActiveTab === type.id &&
                    (idx === 4
                      ? "[&>path]:fill-secondary group-hover:[&>path]:fill-secondary"
                      : "[&>g]:stroke-secondary group-hover:[&>g]:stroke-secondary [&>path]:stroke-secondary group-hover:[&>path]:stroke-secondary"),
                )}
              />
              {/*<div className="bg-secondary-100 text-secondary mb-3 flex h-12 w-12 items-center justify-center rounded-full">*/}
              {/*  {type.icon}*/}
              {/*</div>*/}
              <h3
                className={cn("text-neutral text-lg font-medium", {
                  "!text-secondary": qrTypeActiveTab === type.id,
                })}
              >
                {type.label}
              </h3>
            </Flex>
            <p className="text-sm text-neutral-500">{type.info}</p>
          </Flex>
        </Card>
      ))}
    </div>
    // </div>
  );
};
