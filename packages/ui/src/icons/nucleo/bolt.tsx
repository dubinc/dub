import { SVGProps } from "react";

export function Bolt({
  variant = "outline",
  ...props
}: SVGProps<SVGSVGElement> & { variant?: "outline" | "fill" }) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        {variant === "fill" ? (
          <>
            <path
              d="M14.922,7.657c-.218-.405-.64-.657-1.1-.657h-3.969l.752-5.83c.061-.464-.204-.902-.643-1.065-.438-.164-.926-.004-1.184,.387L3.134,9.063c-.253,.384-.274,.875-.056,1.28s.64,.657,1.1,.657h3.969l-.752,5.83c-.061,.464,.204,.902,.643,1.065,.115,.043,.234,.064,.352,.064,.328,0,.642-.162,.832-.45h0s5.645-8.572,5.645-8.572c.253-.384,.274-.875,.056-1.28Z"
              fill="currentColor"
            />
          </>
        ) : (
          <>
            <path
              d="m8.597,16.41l5.872-8.265c.118-.166,0-.395-.204-.395h-5.016l.604-5.98c.037-.26-.299-.394-.451-.18L3.531,9.855c-.118.166,0,.395.204.395h5.016l-.604,5.98c-.037.26.299.394.451.18Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </>
        )}
      </g>
    </svg>
  );
}
