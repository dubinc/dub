import { SVGProps } from "react";

export function MarkdownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 22 14" {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M19.5 1.25h-17c-.69 0-1.25.56-1.25 1.25v9c0 .69.56 1.25 1.25 1.25h17c.69 0 1.25-.56 1.25-1.25v-9c0-.69-.56-1.25-1.25-1.25M2.5 0A2.5 2.5 0 0 0 0 2.5v9A2.5 2.5 0 0 0 2.5 14h17a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 19.5 0zM3 3.5h1.69l.297.324L7 6.02l2.013-2.196.297-.324H11v7H9V6.798L7.737 8.176 7 8.98l-.737-.804L5 6.798V10.5H3v-7M15 7V3.5h2V7h2.5L17 9.5l-1 1-1-1L12.5 7z"
        clipRule="evenodd"
      />
    </svg>
  );
}
