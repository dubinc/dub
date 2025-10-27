import { cn } from "@dub/utils";
import { FC, useEffect, useState } from "react";
import { QR_DEMO_DEFAULTS } from "../../../constants/qr-type-inputs-placeholders";

interface QRCodeDemoWifiProps {
  networkName?: string;
  smallPreview?: boolean;
}

export const QRCodeDemoWifi: FC<QRCodeDemoWifiProps> = ({
  networkName,
  smallPreview = false,
}) => {
  const [currentNetworkName, setCurrentNetworkName] = useState<string>(
    networkName || QR_DEMO_DEFAULTS.WIFI_NETWORK_NAME,
  );

  useEffect(() => {
    setCurrentNetworkName(networkName || QR_DEMO_DEFAULTS.WIFI_NETWORK_NAME);
  }, [networkName]);

  return (
    <svg
      width="270"
      height="352"
      viewBox="0 0 270 352"
      className={cn("", {
        "h-[180px] w-[138px] lg:h-[209px] lg:w-[158px]": smallPreview,
      })}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 22C0 9.84974 9.84974 0 22 0H248C260.15 0 270 9.84974 270 22V352H0V22Z"
        fill="white"
      />
      <path
        d="M0 21.9718C0 9.83713 9.83712 0 21.9718 0H258C264.627 0 270 5.37258 270 12V207H0V21.9718Z"
        fill="#006666"
      />
      <g filter="url(#filter0_d_1608_3216)">
        <path
          d="M15 39C15 31.268 21.268 25 29 25H241C248.732 25 255 31.268 255 39V319H15V39Z"
          fill="white"
          shapeRendering="crispEdges"
        />
        <rect x="29" y="39" width="212" height="148" rx="6" fill="#D3E1E1" />
        <path
          d="M114.061 126.958C125.228 115.791 144.77 115.791 155.936 126.958M171.29 110.208C150.252 91.5988 121.04 91.5988 98.707 110.208"
          stroke="#006666"
          opacity="0.2"
          strokeWidth="8.375"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M79.166 93.4581C114.43 63.6822 155.568 63.6822 190.833 93.4581"
          stroke="#006666"
          opacity="0.2"
          strokeWidth="8.375"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M135 154.875C139.625 154.875 143.375 151.125 143.375 146.5C143.375 141.875 139.625 138.125 135 138.125C130.375 138.125 126.625 141.875 126.625 146.5C126.625 151.125 130.375 154.875 135 154.875Z"
          stroke="#006666"
          opacity="0.2"
          strokeWidth="8.375"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <foreignObject
          x="41"
          y="208"
          width="188"
          height="110"
          xmlns="http://www.w3.org/1999/xhtml"
        >
          <div className="h-full w-full overflow-y-clip truncate whitespace-pre-wrap text-center font-sans text-base font-semibold text-neutral-800">
            {`Connect to the `}
            <span className="inline max-w-[120px] overflow-hidden truncate whitespace-nowrap">
              {currentNetworkName}
            </span>
            {` Wifi network?`}
          </div>
        </foreignObject>
      </g>
      <defs>
        <filter
          id="filter0_d_1608_3216"
          x="4"
          y="13"
          width="264"
          height="318"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feMorphology
            radius="2"
            operator="dilate"
            in="SourceAlpha"
            result="effect1_dropShadow_1608_3216"
          />
          <feOffset dx="1" />
          <feGaussianBlur stdDeviation="5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_1608_3216"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_1608_3216"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};
