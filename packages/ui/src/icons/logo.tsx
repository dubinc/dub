import { cn } from "@dub/utils";

export default function Logo({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={cn("h-10 w-10 text-black", className)}
      fill="none"
      height="191"
      viewBox="0 0 191 191"
      width="191"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_1301_107)">
        <path
          clipRule="evenodd"
          d="M122 -14H144 9.17859 129.788 5.96937 122 3.72462V-14ZM122 3.72462C113.586 1.29941 104.695 0 95.5 0C42.7568 0 0 42.7568 0 95.5C0 148.243 42.7568 191 95.5 191C148.243 191 191 148.243 191 95.5C191 60.462 172.131 29.8311 144 13.2146V100V148H122V140.897C114.258 146.018 104.977 149 95 149C67.938 149 46 127.062 46 100C46 72.938 67.938 51 95 51C104.977 51 114.258 53.982 122 59.1034V3.72462Z"
          fill="currentColor"
          fillRule="evenodd"
          shapeRendering="geometricPrecision"
        />
      </g>
      <defs>
        <clipPath id="clip0_1301_107">
          <rect fill="white" height="191" rx="95.5" width="191" />
        </clipPath>
      </defs>
    </svg>
  );
}
