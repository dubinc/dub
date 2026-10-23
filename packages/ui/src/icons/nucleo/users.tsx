import { SVGProps } from "react";

export function Users({
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
            <circle cx="5.75" cy="6.25" fill="currentColor" r="2.75" />
            <circle cx="12" cy="3.75" fill="currentColor" r="2.75" />
            <path
              d="M17.196,11.098c-.811-2.152-2.899-3.598-5.196-3.598-1.417,0-2.752,.553-3.759,1.48,1.854,.709,3.385,2.169,4.109,4.089,.112,.296,.162,.603,.182,.91,1.211-.05,2.409-.26,3.565-.646,.456-.152,.834-.487,1.041-.919,.2-.42,.221-.888,.059-1.316Z"
              fill="currentColor"
            />
            <path
              d="M10.946,13.598c-.811-2.152-2.899-3.598-5.196-3.598S1.365,11.446,.554,13.598c-.162,.429-.141,.896,.059,1.316,.206,.432,.585,.767,1.041,.919,1.325,.442,2.704,.667,4.096,.667s2.771-.225,4.096-.667c.456-.152,.834-.487,1.041-.919,.2-.42,.221-.888,.059-1.316Z"
              fill="currentColor"
            />
          </>
        ) : (
          <>
            <circle
              cx="5.75"
              cy="6.25"
              fill="none"
              r="2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <circle
              cx="12"
              cy="3.75"
              fill="none"
              r="2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M9.609,15.122c.523-.175,.83-.744,.636-1.259-.685-1.818-2.436-3.112-4.494-3.112s-3.809,1.294-4.494,3.112c-.194,.516,.113,1.085,.636,1.259,.962,.321,2.281,.628,3.859,.628s2.897-.307,3.858-.628Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M12.749,13.227c1.248-.077,2.304-.336,3.109-.605,.523-.175,.83-.744,.636-1.259-.685-1.818-2.436-3.112-4.494-3.112-.977,0-1.885,.292-2.643,.793"
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
