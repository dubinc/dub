import { DEFAULT_WEBSITE } from "@/ui/qr-builder/constants/qr-type-inputs-placeholders.ts";
import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import { FC } from "react";

interface IQRCodeDemoWebsiteProps {
  websiteLink: string;
  smallPreview?: boolean;
}

export const QRCodeDemoWebsite: FC<IQRCodeDemoWebsiteProps> = ({
  websiteLink,
  smallPreview = false,
}) => {
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
        d="M0 20.0001C0 8.95443 8.95431 0.00012207 20 0.00012207H250C261.046 0.00012207 270 8.95443 270 20.0001V352H0V20.0001Z"
        fill="white"
      />
      <path
        d="M0 20.0001C0 8.95443 8.95431 0.00012207 20 0.00012207H250C261.046 0.00012207 270 8.95443 270 20.0001V207H0V20.0001Z"
        fill="#006666"
      />
      <foreignObject x="15" y="25" width="240" height="39">
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            padding: "0 10px",
            borderRadius: "16px",
            background: "rgba(225, 225, 225, 0.4)",
            boxSizing: "border-box",
            boxShadow: "0.910463px 0px 10.9256px 1.82093px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Icon className="h-5 w-5 text-white" icon="streamline:web" />
          <input
            type="text"
            value={websiteLink || DEFAULT_WEBSITE}
            style={{
              height: "auto",
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "14px",
              fontWeight: 500,
              color: "white",
              background: "transparent",
              maxWidth: "200px",
              textOverflow: "ellipsis",
              pointerEvents: "none",
            }}
            readOnly
          />
        </div>
      </foreignObject>
      <g filter="url(#filter1_d_1609_3642)">
        <path
          d="M15 96.0001C15 87.1636 22.1634 80.0001 31 80.0001H239C247.837 80.0001 255 87.1636 255 96.0001V352H15V96.0001Z"
          fill="white"
        />
      </g>
      <path
        d="M27 108C27 99.1636 34.1634 92.0001 43 92.0001H85C93.8366 92.0001 101 99.1636 101 108V150C101 158.837 93.8366 166 85 166H43C34.1634 166 27 158.837 27 150V108Z"
        fill="#EFEFEF"
      />
      <path
        d="M27 194C27 185.163 34.1634 178 43 178H74C82.8366 178 90 185.163 90 194V225C90 233.837 82.8366 241 74 241H43C34.1634 241 27 233.837 27 225V194Z"
        fill="#EFEFEF"
      />
      <path
        d="M103 194C103 185.163 110.163 178 119 178H150C158.837 178 166 185.163 166 194V225C166 233.837 158.837 241 150 241H119C110.163 241 103 233.837 103 225V194Z"
        fill="#EFEFEF"
      />
      <path
        d="M179.998 194C179.998 185.163 187.161 178 195.998 178H226.998C235.835 178 242.998 185.163 242.998 194V225C242.998 233.837 235.835 241 226.998 241H195.998C187.161 241 179.998 233.837 179.998 225V194Z"
        fill="#EFEFEF"
      />
      <path
        d="M27 279C27 270.164 34.1634 263 43 263H227C235.837 263 243 270.164 243 279V291C243 299.837 235.837 307 227 307H43C34.1634 307 27 299.837 27 291V279Z"
        fill="#D1D1D1"
      />
      <rect
        x="111.998"
        y="92.0001"
        width="131"
        height="16"
        rx="6"
        fill="#EFEFEF"
      />
      <rect x="111.998" y="120" width="131" height="16" rx="6" fill="#EFEFEF" />
      <rect x="111.998" y="148" width="82" height="16" rx="6" fill="#EFEFEF" />
      <rect x="83" y="279" width="104" height="12" rx="6" fill="#EFEFEF" />
      <defs>
        <filter
          id="filter0_d_1609_3642"
          x="3.16398"
          y="12.2536"
          width="265.493"
          height="64.493"
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
            radius="1.82093"
            operator="dilate"
            in="SourceAlpha"
            result="effect1_dropShadow_1609_3642"
          />
          <feOffset dx="0.910463" />
          <feGaussianBlur stdDeviation="5.46278" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_1609_3642"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_1609_3642"
            result="shape"
          />
        </filter>
        <filter
          id="filter1_d_1609_3642"
          x="3.13596"
          y="67.2235"
          width="265.553"
          height="297.553"
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
            radius="1.82524"
            operator="dilate"
            in="SourceAlpha"
            result="effect1_dropShadow_1609_3642"
          />
          <feOffset dx="0.912618" />
          <feGaussianBlur stdDeviation="5.47571" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_1609_3642"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_1609_3642"
            result="shape"
          />
        </filter>
        <clipPath id="clip0_1609_3642">
          <rect
            width="18"
            height="18"
            fill="white"
            transform="translate(24.998 35.0001)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};
