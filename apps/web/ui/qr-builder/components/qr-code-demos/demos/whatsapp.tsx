import { DEFAULT_WHATSAPP_MESSAGE } from "@/ui/qr-builder/constants/qr-type-inputs-placeholders.ts";
import { FC } from "react";

interface IQRCodeDemoWhatsappProps {
  number: string;
  message: string;
}

export const QRCodeDemoWhatsapp: FC<IQRCodeDemoWhatsappProps> = ({
  number,
  message,
}) => {
  return (
    <svg
      width="270"
      height="352"
      viewBox="0 0 270 352"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 64H270V330C270 342.15 260.15 352 248 352H22C9.84973 352 0 342.15 0 330V64Z"
        fill="#B4D8CD"
      />
      <path
        d="M0 21.9718C0 9.83713 9.83712 0 21.9718 0H248.028C260.163 0 270 9.83712 270 21.9718V64H0V21.9718Z"
        fill="#115740"
      />
      <foreignObject x="75" y="25" width="104" height="17">
        <div className="pointer-events-none max-w-[104px] select-none truncate text-center text-sm text-white">
          {number ?? "+1 123 456 789"}
        </div>
      </foreignObject>
      <foreignObject
        x="90"
        y="70"
        width="168"
        height="109"
        xmlns="http://www.w3.org/1999/xhtml"
      >
        <div
          style={{
            position: "relative",
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "10px 12px 4px 12px",
            fontSize: "10px",
            lineHeight: "12px",
            fontFamily: "Satoshi, sans-serif",
            color: "#212121",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div className="pointer-events-none select-none">
            {message ?? DEFAULT_WHATSAPP_MESSAGE}
          </div>
          <div className="pointer-events-none select-none self-end text-right text-[8px] text-[#5F6C73]">
            11:42
          </div>
          <div
            style={{
              content: "''",
              position: "absolute",
              bottom: "6px",
              right: "-6px",
              width: "12px",
              height: "12px",
              backgroundColor: "#FFFFFF",
              transform: "rotate(180deg)",
              borderBottomLeftRadius: "3px",
            }}
          />
        </div>
      </foreignObject>
      <rect x="38" y="22" width="28" height="28" rx="14" fill="#12BB17" />
      <path
        d="M53.0545 38.1477C52.754 38.325 52.0974 38.3789 50.8487 37.1343C49.6 35.8897 49.6531 35.2347 49.8303 34.935C50.2827 34.8892 50.7147 34.5879 51.1174 34.1869C51.4138 33.8905 51.1737 33.171 50.5792 32.5789C49.9855 31.9876 49.2643 31.7475 48.9663 32.0432C47.0544 33.9493 48.0116 36.4499 49.7731 38.2057C51.5584 39.9861 53.9969 40.9612 55.9553 39.0093C56.2526 38.7137 56.0125 37.9934 55.4179 37.4021C54.8242 36.81 54.1023 36.5699 53.805 36.8664C53.4032 37.2666 53.1002 37.6969 53.0545 38.1477Z"
        fill="white"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M51.9983 29.8161C50.8645 29.816 49.7526 30.1276 48.7839 30.7168C47.8153 31.3061 47.0273 32.1502 46.5061 33.1571C45.9849 34.164 45.7505 35.2947 45.8286 36.4258C45.9067 37.5569 46.2942 38.6447 46.9489 39.5704C47.0097 39.6561 47.0474 39.7561 47.0584 39.8606C47.0695 39.9652 47.0534 40.0708 47.0117 40.1674L46.1346 42.1952L48.7047 41.4495C48.8556 41.4057 49.0176 41.4214 49.1571 41.4936C49.9889 41.9234 50.9074 42.1587 51.8433 42.1818C52.7793 42.2049 53.7082 42.0152 54.5602 41.627C55.4121 41.2387 56.1648 40.6621 56.7614 39.9406C57.358 39.2191 57.783 38.3715 58.0044 37.4618C58.2257 36.5521 58.2376 35.604 58.0391 34.6891C57.8407 33.7741 57.437 32.9162 56.8587 32.1799C56.2803 31.4437 55.5424 30.8484 54.7004 30.4389C53.8585 30.0294 52.9345 29.8165 51.9983 29.8161ZM44.5895 35.9999C44.5899 34.3943 45.1118 32.8323 46.0768 31.5491C47.0417 30.2658 48.3975 29.3307 49.9398 28.8846C51.4822 28.4385 53.1277 28.5055 54.6287 29.0756C56.1297 29.6456 57.4049 30.6878 58.2623 32.0453C59.1197 33.4028 59.5129 35.0021 59.3827 36.6024C59.2525 38.2027 58.606 39.7174 57.5405 40.9185C56.4749 42.1195 55.0481 42.942 53.4747 43.2619C51.9013 43.5819 50.2666 43.382 48.8166 42.6925L45.2281 43.7338C45.1166 43.7661 44.9981 43.766 44.8866 43.7335C44.775 43.701 44.6751 43.6375 44.5983 43.5503C44.5215 43.4632 44.471 43.356 44.4529 43.2413C44.4347 43.1265 44.4495 43.009 44.4956 42.9024L45.7549 39.9885C44.9921 38.7982 44.5876 37.4137 44.5895 35.9999Z"
        fill="white"
      />
      <path
        d="M28.6673 36H15.334M15.334 36L20.334 31M15.334 36L20.334 41"
        stroke="#EAEAEA"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M224.999 31.8334C224.999 30.9142 224.252 30.1667 223.333 30.1667H213.333C212.414 30.1667 211.666 30.9142 211.666 31.8334V40.1667C211.666 41.0859 212.414 41.8334 213.333 41.8334H223.333C224.252 41.8334 224.999 41.0859 224.999 40.1667V37.3892L228.333 40.1667V31.8334L224.999 34.6109V31.8334ZM223.334 40.1667H213.333V31.8334H223.333L223.334 35.9992L223.333 36L223.334 36.0009L223.334 40.1667Z"
        fill="white"
      />
      <path
        d="M254.667 38.9167C253.667 38.9167 252.583 38.75 251.667 38.4167H251.417C251.167 38.4167 251 38.5 250.833 38.6667L249 40.5C246.667 39.25 244.667 37.3333 243.5 35L245.333 33.1667C245.583 32.9167 245.667 32.5833 245.5 32.3333C245.25 31.4167 245.083 30.3333 245.083 29.3333C245.083 28.9167 244.667 28.5 244.25 28.5H241.333C240.917 28.5 240.5 28.9167 240.5 29.3333C240.5 37.1667 246.833 43.5 254.667 43.5C255.083 43.5 255.5 43.0833 255.5 42.6667V39.75C255.5 39.3333 255.083 38.9167 254.667 38.9167ZM242.167 30.1667H243.417C243.5 30.9167 243.667 31.6667 243.833 32.3333L242.833 33.3333C242.5 32.3333 242.25 31.25 242.167 30.1667ZM253.833 41.8333C252.75 41.75 251.667 41.5 250.667 41.1667L251.667 40.1667C252.333 40.3333 253.083 40.5 253.833 40.5V41.8333Z"
        fill="white"
      />
      <defs>
        <filter
          id="filter0_f_1608_2950"
          x="89.8257"
          y="126.826"
          width="168.349"
          height="59.3486"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="0.587149"
            result="effect1_foregroundBlur_1608_2950"
          />
        </filter>
      </defs>
    </svg>
  );
};
