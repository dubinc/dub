import { cn } from "@dub/utils";
import { Text } from "@radix-ui/themes";
import { FC, useEffect, useState } from "react";
import { QR_DEMO_DEFAULTS } from "../../../constants/qr-type-inputs-placeholders";

interface QRCodeDemoWhatsappProps {
  number?: string;
  message?: string;
  smallPreview?: boolean;
}

export const QRCodeDemoWhatsapp: FC<QRCodeDemoWhatsappProps> = ({
  number,
  message,
  smallPreview = false,
}) => {
  const [currentNumber, setCurrentNumber] = useState<string>(
    number || QR_DEMO_DEFAULTS.WHATSAPP_NUMBER,
  );
  const [currentMessage, setCurrentMessage] = useState<string>(
    message || QR_DEMO_DEFAULTS.WHATSAPP_MESSAGE,
  );

  useEffect(() => {
    setCurrentNumber(number || QR_DEMO_DEFAULTS.WHATSAPP_NUMBER);
  }, [number]);

  useEffect(() => {
    setCurrentMessage(message || QR_DEMO_DEFAULTS.WHATSAPP_MESSAGE);
  }, [message]);

  return (
    <div className="flex h-full items-center justify-center">
      <div
        className={cn(
          "relative flex h-[200px] w-[200px] flex-col overflow-hidden rounded-t-[14px] md:h-[352px] md:w-[270px] md:rounded-t-[22px]",
          {
            "h-[180px] w-[138px] lg:h-[209px] lg:w-[158px]": smallPreview,
          },
        )}
      >
        <div
          className={cn(
            "flex h-[40px] items-center bg-[#115740] px-2 md:h-16 md:px-3",
            {
              "h-10 md:h-10": smallPreview,
            },
          )}
        >
          <div
            className={cn("mr-1 md:mr-2", {
              "mr-1 md:mr-1": smallPreview,
            })}
          >
            <svg
              width="16"
              height="16"
              className={cn("md:h-[20px] md:w-[20px]", {
                "h-[11px] w-[11px] md:h-[12px] md:w-[12px]": smallPreview,
              })}
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16.6673 10H3.33398M3.33398 10L8.33398 5M3.33398 10L8.33398 15"
                stroke="#EAEAEA"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div
            className={cn("mr-1 md:mr-2", {
              "mr-1 md:mr-1": smallPreview,
            })}
          >
            <svg
              width="20"
              height="20"
              className={cn("md:h-[28px] md:w-[28px]", {
                "h-[14px] w-[14px] md:h-[15px] md:w-[15px]": smallPreview,
              })}
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="28" height="28" rx="14" fill="#12BB17" />
              <path
                d="M15.0545 16.1477C14.754 16.325 14.0974 16.3789 12.8487 15.1343C11.6 13.8897 11.6531 13.2347 11.8303 12.935C12.2827 12.8892 12.7147 12.5879 13.1174 12.1869C13.4138 11.8905 13.1737 11.171 12.5792 10.5789C11.9855 9.98763 11.2643 9.74753 10.9663 10.0432C9.05444 11.9493 10.0116 14.4499 11.7731 16.2057C13.5584 17.9861 15.9969 18.9612 17.9553 17.0093C18.2526 16.7137 18.0125 15.9934 17.4179 15.4021C16.8242 14.81 16.1023 14.5699 15.805 14.8664C15.4032 15.2666 15.1002 15.6969 15.0545 16.1477Z"
                fill="white"
              />
            </svg>
          </div>

          <div
            className={cn("text-[10px] text-white md:text-sm", {
              "text-[8px] md:text-[10px]": smallPreview,
            })}
          >
            {currentNumber}
          </div>

          <div
            className={cn("ml-auto flex gap-2 text-white", {
              "gap-1": smallPreview,
            })}
          >
            <span>
              <svg
                width="16"
                height="16"
                className={cn("md:h-[20px] md:w-[20px]", {
                  "h-[11px] w-[11px] md:h-[11px] md:w-[11px]": smallPreview,
                })}
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.9993 5.83335C14.9993 4.91419 14.2518 4.16669 13.3327 4.16669H3.33268C2.41352 4.16669 1.66602 4.91419 1.66602 5.83335V14.1667C1.66602 15.0859 2.41352 15.8334 3.33268 15.8334H13.3327C14.2518 15.8334 14.9993 15.0859 14.9993 14.1667V11.3892L18.3327 14.1667V5.83335L14.9993 8.61085V5.83335ZM13.3343 14.1667H3.33268V5.83335H13.3327L13.3335 9.99919L13.3327 10L13.3335 10.0009L13.3343 14.1667Z"
                  fill="white"
                />
              </svg>
            </span>
            <span>
              <svg
                width="16"
                height="16"
                className={cn("md:h-[20px] md:w-[20px]", {
                  "h-[11px] w-[11px] md:h-[11px] md:w-[11px]": smallPreview,
                })}
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16.6667 12.9167C15.6667 12.9167 14.5833 12.75 13.6667 12.4167H13.4167C13.1667 12.4167 13 12.5 12.8333 12.6667L11 14.5C8.66667 13.25 6.66667 11.3333 5.5 9L7.33333 7.16667C7.58333 6.91667 7.66667 6.58333 7.5 6.33333C7.25 5.41667 7.08333 4.33333 7.08333 3.33333C7.08333 2.91667 6.66667 2.5 6.25 2.5H3.33333C2.91667 2.5 2.5 2.91667 2.5 3.33333C2.5 11.1667 8.83333 17.5 16.6667 17.5C17.0833 17.5 17.5 17.0833 17.5 16.6667V13.75C17.5 13.3333 17.0833 12.9167 16.6667 12.9167ZM4.16667 4.16667H5.41667C5.5 4.91667 5.66667 5.66667 5.83333 6.33333L4.83333 7.33333C4.5 6.33333 4.25 5.25 4.16667 4.16667ZM15.8333 15.8333C14.75 15.75 13.6667 15.5 12.6667 15.1667L13.6667 14.1667C14.3333 14.3333 15.0833 14.5 15.8333 14.5V15.8333Z"
                  fill="white"
                />
              </svg>
            </span>
          </div>
        </div>

        <div className="flex flex-1 items-start justify-end bg-[#B4D8CD] p-2 md:p-4">
          <div className="relative flex max-w-[140px] flex-col rounded-xl bg-white p-2 shadow-sm md:max-w-[168px] md:rounded-2xl md:p-3">
            <Text
              as="p"
              className="text-neutral line-clamp-6 max-h-[110px] overflow-hidden text-xs md:hidden"
            >
              {currentMessage}
            </Text>
            <Text
              as="p"
              className="text-neutral line-clamp-9 hidden max-h-[230px] overflow-hidden text-xs md:inline-block"
            >
              {currentMessage}
            </Text>

            <Text
              as="span"
              className="mt-1 self-end text-right text-[6px] text-[#5F6C73] md:text-[8px]"
            >
              11:42
            </Text>

            <div className="absolute -right-1 bottom-3 h-2 w-2 rotate-45 bg-white md:h-3 md:w-3"></div>
          </div>
        </div>
      </div>
    </div>
  );
};