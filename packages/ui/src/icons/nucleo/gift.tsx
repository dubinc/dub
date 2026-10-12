import { SVGProps } from "react";

export function Gift({
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
              d="M3,9.5v4.75c0,1.517,1.233,2.75,2.75,2.75h2.5v-7.5H3Z"
              fill="currentColor"
            />
            <path
              d="M9.75,9.5v7.5h2.5c1.517,0,2.75-1.233,2.75-2.75v-4.75h-5.25Z"
              fill="currentColor"
            />
            <path
              d="M15.25,4.5h-.462c.135-.307,.212-.644,.212-1,0-1.378-1.121-2.5-2.5-2.5-1.761,0-2.864,1.231-3.5,2.339-.636-1.107-1.739-2.339-3.5-2.339-1.379,0-2.5,1.122-2.5,2.5,0,.356,.077,.693,.212,1h-.462c-.965,0-1.75,.776-1.75,1.75s.785,1.75,1.75,1.75H15.25c.965,0,1.75-.782,1.75-1.75s-.785-1.75-1.75-1.75Zm-2.75-2c.552,0,1,.449,1,1s-.448,1-1,1h-2.419c.405-.86,1.176-2,2.419-2ZM4.5,3.5c0-.551,.448-1,1-1,1.234,0,2.007,1.14,2.415,2h-2.415c-.552,0-1-.449-1-1Z"
              fill="currentColor"
            />
          </>
        ) : (
          <>
            <line
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x1="9"
              x2="9"
              y1="5.25"
              y2="16.25"
            />
            <path
              d="M3.75,3.5c0-.966,.784-1.75,1.75-1.75,2.589,0,3.5,3.5,3.5,3.5h-3.5c-.966,0-1.75-.784-1.75-1.75Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M12.5,5.25h-3.5s.911-3.5,3.5-3.5c.966,0,1.75,.784,1.75,1.75s-.784,1.75-1.75,1.75Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M14.25,8.25v6c0,1.105-.895,2-2,2H5.75c-1.105,0-2-.895-2-2v-6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <rect
              height="3"
              width="14.5"
              fill="none"
              rx="1"
              ry="1"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              x="1.75"
              y="5.25"
            />
          </>
        )}
      </g>
    </svg>
  );
}
