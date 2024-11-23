import { ProgramProps } from "@/lib/types";
import { cn, DICEBEAR_AVATAR_URL, truncate } from "@dub/utils";
import { SVGProps, useId } from "react";

export function Screenshot({
  program,
  ...rest
}: { program: Pick<ProgramProps, "name" | "logo"> } & SVGProps<SVGSVGElement>) {
  const id = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1695"
      height="890"
      fill="none"
      viewBox="0 0 1695 890"
      {...rest}
      className={cn("select-none text-[var(--brand)]", rest.className)}
    >
      <g clipPath={`url(#${id}-a)`}>
        <path fill="#F5F5F5" d="M0 0h1695v940H0z" />
        <path fill="#F5F5F5" d="M0 0h240v940H0z" />
        <path
          fill="#000"
          fillRule="evenodd"
          d="M26.083 14.833h2.75V32.25h-2.75V31.1a6.417 6.417 0 1 1 0-10.533zM22.417 29.5a3.667 3.667 0 1 0 0-7.333 3.667 3.667 0 0 0 0 7.333m22.916-14.667h2.75v5.734a6.417 6.417 0 1 1-2.75 5.267zM51.75 29.5a3.667 3.667 0 1 0 0-7.334 3.667 3.667 0 0 0 0 7.334M33.417 19.417h-2.75v6.416a6.416 6.416 0 1 0 12.833 0v-6.416h-2.75v6.416a3.667 3.667 0 0 1-7.333 0z"
          clipRule="evenodd"
        />
        <g clipPath={`url(#${id}-b)`}>
          <path
            stroke="#737373"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M183.999 30.444a6.445 6.445 0 1 0 0-12.89 6.445 6.445 0 0 0 0 12.89"
          />
          <path
            stroke="#737373"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M182.156 21.884c.345-.94 1.15-1.327 1.938-1.327.796 0 1.616.567 1.616 1.607 0 1.586-1.614 1.305-1.863 2.725"
          />
          <path
            fill="#737373"
            d="M183.815 28.06a.89.89 0 1 1 .001-1.78.89.89 0 0 1-.001 1.78"
          />
        </g>
        <path
          fill="currentColor"
          d="M204 24c0-6.627 5.373-12 12-12s12 5.373 12 12-5.373 12-12 12-12-5.373-12-12"
          opacity="0.4"
        />
        <g filter={`url(#${id}-c)`} opacity="0.1">
          <circle
            cx="181.5"
            cy="181.5"
            r="181.5"
            fill={`url(#${id}-d)`}
            transform="matrix(-1 0 0 1 186 661)"
          />
        </g>
        {/* Little logo */}
        <image
          x="18"
          y="70"
          href={program.logo || `${DICEBEAR_AVATAR_URL}${program.name}`}
          width="32"
          height="32"
          clipPath="inset(0% round 32px)"
        />
        <text
          xmlSpace="preserve"
          fill="#171717"
          fontSize="13"
          fontWeight="600"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="60" y="83.727">
            {truncate(program.name, 18)}
          </tspan>
        </text>
        <circle cx="62" cy="94" r="2" fill="#4ADE80" />
        <text
          xmlSpace="preserve"
          fill="#737373"
          fontSize="10"
          fontWeight="500"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="68" y="97.636">
            Enrolled
          </tspan>
        </text>
        <g clipPath={`url(#${id}-e)`}>
          <path fill="currentColor" d="M12 124h216v30H12z" opacity="0.1" />
          <g clipPath={`url(#${id}-f)`}>
            <path
              fill="currentColor"
              stroke="currentColor"
              d="M28.167 135.222a.167.167 0 1 1-.334 0c0-.092.075-.166.167-.166s.167.074.167.166ZM30.838 136.329a.167.167 0 1 1-.334 0 .167.167 0 0 1 .334 0ZM31.944 139a.167.167 0 1 1-.334 0 .167.167 0 0 1 .334 0ZM25.496 136.329a.167.167 0 1 1-.334 0 .167.167 0 0 1 .334 0Z"
            />
            <path
              fill="currentColor"
              d="M24.222 139.667a.667.667 0 1 0 0-1.334.667.667 0 0 0 0 1.334"
            />
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M31.527 144.389A6.43 6.43 0 0 0 34.444 139a6.444 6.444 0 0 0-12.889 0 6.43 6.43 0 0 0 2.918 5.389"
            />
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M26.667 144.111c0-.736 1.333-6.222 1.333-6.222s1.333 5.486 1.333 6.222a1.334 1.334 0 0 1-2.666 0"
            />
          </g>
          <text
            xmlSpace="preserve"
            fill="currentColor"
            fontSize="13"
            fontWeight="500"
            letterSpacing="0em"
            style={{ whiteSpace: "pre" }}
          >
            <tspan x="46" y="143.727">
              Overview
            </tspan>
          </text>
        </g>
        <path
          stroke="#737373"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M28 171.667a1.778 1.778 0 1 0 0-3.556 1.778 1.778 0 0 0 0 3.556"
        />
        <path
          stroke="#737373"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M32.667 165.222h-9.334c-.981 0-1.777.796-1.777 1.778v5.778c0 .982.796 1.778 1.777 1.778h9.334c.981 0 1.777-.796 1.777-1.778V167c0-.982-.796-1.778-1.777-1.778"
        />
        <path
          fill="#737373"
          d="M23.778 170.556a.667.667 0 1 0-.001-1.334.667.667 0 0 0 0 1.334M32.222 170.556a.667.667 0 1 0 0-1.334.667.667 0 0 0 0 1.334"
        />
        <path
          stroke="#737373"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M23.333 162.556h9.334"
        />
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="13"
          fontWeight="500"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="46" y="173.727">
            Payouts
          </tspan>
        </text>
        <g
          stroke="#737373"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          clipPath={`url(#${id}-g)`}
        >
          <path d="m27.193 197.914 6.501 2.231c.197.067.201.345.006.418l-2.914 1.096a.22.22 0 0 0-.13.129l-1.096 2.915a.222.222 0 0 1-.418-.006l-2.231-6.501a.222.222 0 0 1 .283-.283zM30.691 201.694l3.744 3.744M26.887 192.556v1.777M30.66 194.117l-1.258 1.258M23.117 201.66l1.258-1.257M21.555 197.889h1.777M23.117 194.117l1.258 1.258" />
        </g>
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="13"
          fontWeight="500"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="46" y="203.727">
            Events
          </tspan>
        </text>
        <path
          stroke="#737373"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M27.556 227.068a3.1 3.1 0 0 0-.864.614l-.01.009a3.14 3.14 0 0 0 0 4.444l1.934 1.933a3.14 3.14 0 0 0 4.444 0l.01-.008a3.143 3.143 0 0 0 0-4.445l-.828-.827"
        />
        <path
          stroke="#737373"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M28.445 230.932a3.1 3.1 0 0 0 .865-.614l.01-.009a3.14 3.14 0 0 0 0-4.444l-1.934-1.933a3.14 3.14 0 0 0-4.445 0l-.009.008a3.143 3.143 0 0 0 0 4.445l.828.827"
        />
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="13"
          fontWeight="500"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="46" y="233.727">
            Links
          </tspan>
        </text>
        <path
          stroke="#737373"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="m25.859 263.97 5.814-5.814a.89.89 0 0 0 0-1.257l-1.572-1.572a.89.89 0 0 0-1.256 0l-.178.178"
        />
        <path
          stroke="#737373"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M24.445 264.556h8.222a.89.89 0 0 0 .889-.889v-2.223a.89.89 0 0 0-.89-.888h-.25"
        />
        <path
          fill="#737373"
          d="M24.444 263.222a.666.666 0 1 0 .001-1.332.666.666 0 0 0 0 1.332"
        />
        <path
          stroke="#737373"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M24.445 264.556a2 2 0 0 1-2-2v-8.223a.89.89 0 0 1 .888-.889h2.223a.89.89 0 0 1 .889.889v8.223a2 2 0 0 1-2 2"
        />
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="13"
          fontWeight="500"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="46" y="263.727">
            Resources
          </tspan>
        </text>
        <path
          fill="#fff"
          d="M1695.5 8v-.5H256c-9.113 0-16.5 7.387-16.5 16.5v916.5h1456V8"
        />
        <path
          stroke="#E5E5E5"
          d="M1695.5 8v-.5H256c-9.113 0-16.5 7.387-16.5 16.5v916.5h1456V8Z"
        />
        <text
          xmlSpace="preserve"
          fill="#171717"
          fontSize="24"
          fontWeight="600"
          letterSpacing="-.02em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="367.5" y="72.727">
            Overview
          </tspan>
        </text>
        <g clipPath={`url(#${id}-h)`}>
          <rect
            width="1200"
            height="306"
            x="367.5"
            y="104"
            fill="#FAFAFA"
            rx="12"
          />
          <rect
            xmlns="http://www.w3.org/2000/svg"
            width="1200"
            height="306"
            x="367.5"
            y="104"
            fill={`url(#${id}-grid)`}
          />
          <path fill={`url(#${id}-i)`} d="M367 104h1201v306H367z" />
          <path
            stroke="#737373"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M400.5 139a2 2 0 1 0 .001-3.999A2 2 0 0 0 400.5 139"
          />
          <path
            stroke="#737373"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M393.25 141.75v-9.5c2.396 1.074 4.568 1.221 7.25 0s4.854-1.25 7.25 0v9.5c-2.396-1.25-4.568-1.221-7.25 0s-4.854 1.074-7.25 0"
          />
          <text
            xmlSpace="preserve"
            fill="#737373"
            fontSize="14"
            letterSpacing="0em"
            style={{ whiteSpace: "pre" }}
          >
            <tspan x="417.5" y="142.091">
              Refer and Earn
            </tspan>
          </text>
          <text
            xmlSpace="preserve"
            fill="#171717"
            fontSize="18"
            fontWeight="600"
            letterSpacing="0em"
            style={{ whiteSpace: "pre" }}
          >
            <tspan x="852.891" y="262.045" />
            <tspan x="416.004" y="289.045" />
          </text>
          <text
            xmlSpace="preserve"
            fill="#171717"
            fontSize="18"
            letterSpacing="0em"
            style={{ whiteSpace: "pre" }}
            x="391.5"
            y="262.045"
          >
            <tspan>Earn </tspan>
            <tspan
              fontWeight="600"
              // Blur to avoid confusing a placeholder number for a real number
              style={{ filter: "blur(4px)", opacity: 0.4 }}
            >
              20%
            </tspan>
            <tspan> for each conversion, and again </tspan>
            <tspan fontWeight="600">every month</tspan>
          </text>
          <text
            xmlSpace="preserve"
            fill="#171717"
            fontSize="18"
            fontWeight="600"
            letterSpacing="0em"
            style={{ whiteSpace: "pre" }}
            x="391.5"
            y="289.045"
          >
            for the customer's lifetime.
          </text>
          <text
            xmlSpace="preserve"
            fill="#262626"
            fontSize="14"
            fontWeight="500"
            letterSpacing="0em"
            style={{ whiteSpace: "pre" }}
          >
            <tspan x="391.5" y="334.091">
              Referral link
            </tspan>
          </text>
          <path
            fill="#fff"
            d="M392 355.6c0-1.688 0-2.925.08-3.9.079-.97.234-1.637.519-2.197a5.5 5.5 0 0 1 2.404-2.404c.56-.285 1.227-.44 2.197-.519.975-.08 2.212-.08 3.9-.08h280.8c1.688 0 2.925 0 3.9.08.97.079 1.637.234 2.197.519a5.5 5.5 0 0 1 2.404 2.404c.285.56.44 1.227.519 2.197.08.975.08 2.212.08 3.9v20.8c0 1.688 0 2.925-.08 3.9-.079.97-.234 1.637-.519 2.197a5.5 5.5 0 0 1-2.404 2.404c-.56.285-1.227.44-2.197.519-.975.08-2.212.08-3.9.08H401.1c-1.688 0-2.925 0-3.9-.08-.97-.079-1.637-.234-2.197-.519a5.5 5.5 0 0 1-2.404-2.404c-.285-.56-.44-1.227-.519-2.197-.08-.975-.08-2.212-.08-3.9z"
          />
          <path
            stroke="#D4D4D4"
            d="M392 355.6c0-1.688 0-2.925.08-3.9.079-.97.234-1.637.519-2.197a5.5 5.5 0 0 1 2.404-2.404c.56-.285 1.227-.44 2.197-.519.975-.08 2.212-.08 3.9-.08h280.8c1.688 0 2.925 0 3.9.08.97.079 1.637.234 2.197.519a5.5 5.5 0 0 1 2.404 2.404c.285.56.44 1.227.519 2.197.08.975.08 2.212.08 3.9v20.8c0 1.688 0 2.925-.08 3.9-.079.97-.234 1.637-.519 2.197a5.5 5.5 0 0 1-2.404 2.404c-.56.285-1.227.44-2.197.519-.975.08-2.212.08-3.9.08H401.1c-1.688 0-2.925 0-3.9-.08-.97-.079-1.637-.234-2.197-.519a5.5 5.5 0 0 1-2.404-2.404c-.285-.56-.44-1.227-.519-2.197-.08-.975-.08-2.212-.08-3.9z"
          />
          <text
            xmlSpace="preserve"
            fill="#262626"
            fontSize="14"
            letterSpacing="0em"
            style={{ whiteSpace: "pre" }}
          >
            <tspan x="403.5" y="371.091">
              refer.dub.co/steven
            </tspan>
          </text>
          <path
            stroke="#737373"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M667.722 368.889h-.889a1.777 1.777 0 0 1-1.777-1.778v-4.889c0-.982.795-1.778 1.777-1.778h6.667c.982 0 1.778.796 1.778 1.778v.889m.889 8.445H669.5a1.78 1.78 0 0 1-1.778-1.778v-4.889c0-.982.796-1.778 1.778-1.778h6.667c.982 0 1.777.796 1.777 1.778v4.889c0 .982-.795 1.778-1.777 1.778"
          />
          <path
            fill="#171717"
            d="M707.5 352a6 6 0 0 1 6-6h135a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6h-135a6 6 0 0 1-6-6z"
          />
          <path
            stroke="#fff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M733.5 369.778a1.78 1.78 0 0 1-1.778-1.778v-4.222a4.222 4.222 0 1 0-8.444 0V368c0 .982-.796 1.778-1.778 1.778z"
          />
          <path
            fill="#fff"
            d="M728.912 371.498a.45.45 0 0 0-.345-.165h-2.133a.446.446 0 0 0-.434.536 1.53 1.53 0 0 0 1.501 1.242c.73 0 1.347-.511 1.501-1.242a.44.44 0 0 0-.09-.371"
          />
          <text
            xmlSpace="preserve"
            fill="#fff"
            fontSize="14"
            fontWeight="500"
            letterSpacing="0em"
            style={{ whiteSpace: "pre" }}
          >
            <tspan x="743.521" y="371.091">
              Invite via email
            </tspan>
          </text>
          <g filter={`url(#${id}-j)`} style={{ mixBlendMode: "overlay" }}>
            <path
              fill="#000"
              fillOpacity="0.5"
              d="M1680 507h-70.15c0-327.214-574.37-436.919-854.85-429.005V21h925z"
            />
          </g>
          <g filter={`url(#${id}-k)`} style={{ mixBlendMode: "soft-light" }}>
            <circle
              cx="600"
              cy="600"
              r="600"
              fill="currentColor"
              transform="matrix(-1 0 0 1 2007.5 -343)"
            />
          </g>
          <g clipPath={`url(#${id}-l)`}>
            <rect width="6" height="6" x="1404.5" y="174" fill="#fff" rx="3" />
            <rect
              width="6.75"
              height="6.75"
              x="1404.12"
              y="173.625"
              stroke="#000"
              strokeOpacity="0.3"
              strokeWidth="0.75"
              rx="3.375"
            />
            <circle cx="1407.5" cy="177" r="1" fill="#000" fillOpacity="0.3" />
            <rect
              width="6"
              height="6"
              x="1490.5"
              y="254"
              fill="#fff"
              rx="3"
              transform="rotate(90 1490.5 254)"
            />
            <rect
              width="6.75"
              height="6.75"
              x="1490.88"
              y="253.625"
              stroke="#000"
              strokeOpacity="0.3"
              strokeWidth="0.75"
              rx="3.375"
              transform="rotate(90 1490.88 253.625)"
            />
            <circle
              cx="1487.5"
              cy="257"
              r="1"
              fill="#000"
              fillOpacity="0.3"
              transform="rotate(90 1487.5 257)"
            />
            <rect
              width="6"
              height="6"
              x="1450.5"
              y="340"
              fill="#fff"
              rx="3"
              transform="rotate(-180 1450.5 340)"
            />
            <rect
              width="6.75"
              height="6.75"
              x="1450.87"
              y="340.375"
              stroke="#000"
              strokeOpacity="0.3"
              strokeWidth="0.75"
              rx="3.375"
              transform="rotate(-180 1450.87 340.375)"
            />
            <circle
              cx="1447.5"
              cy="337"
              r="1"
              fill="#000"
              fillOpacity="0.3"
              transform="rotate(-180 1447.5 337)"
            />
            <rect
              width="6"
              height="6"
              x="1324.5"
              y="260"
              fill="#fff"
              rx="3"
              transform="rotate(-90 1324.5 260)"
            />
            <rect
              width="6.75"
              height="6.75"
              x="1324.12"
              y="260.375"
              stroke="#000"
              strokeOpacity="0.3"
              strokeWidth="0.75"
              rx="3.375"
              transform="rotate(-90 1324.12 260.375)"
            />
            <circle
              cx="1327.5"
              cy="257"
              r="1"
              fill="#000"
              fillOpacity="0.3"
              transform="rotate(-90 1327.5 257)"
            />
            <rect
              width="6"
              height="6"
              x="1370.5"
              y="340"
              fill="#fff"
              rx="3"
              transform="rotate(-180 1370.5 340)"
            />
            <rect
              width="6.75"
              height="6.75"
              x="1370.87"
              y="340.375"
              stroke="#000"
              strokeOpacity="0.3"
              strokeWidth="0.75"
              rx="3.375"
              transform="rotate(-180 1370.87 340.375)"
            />
            <circle
              cx="1367.5"
              cy="337"
              r="1"
              fill="#000"
              fillOpacity="0.3"
              transform="rotate(-180 1367.5 337)"
            />
            <path
              stroke={`url(#${id}-m)`}
              strokeWidth="0.75"
              d="M1407.5 175.5V157m20-65v22.929c0 1.326-.53 2.598-1.46 3.535l-17.08 17.072a5.03 5.03 0 0 0-1.46 3.535V157m0 0-18.54-18.536a5.03 5.03 0 0 1-1.46-3.535V94.5"
              opacity="0.3"
            />
            <path
              stroke={`url(#${id}-n)`}
              strokeWidth="0.75"
              d="M1489 257h18.5m65 20h-22.93a4.97 4.97 0 0 1-3.53-1.464l-17.08-17.072a4.97 4.97 0 0 0-3.53-1.464h-17.93m0 0 18.54-18.536a4.97 4.97 0 0 1 3.53-1.464H1570"
              opacity="0.3"
            />
            <path
              stroke={`url(#${id}-o)`}
              strokeWidth="0.75"
              d="M1447.5 338.5V357m20 65v-22.929c0-1.326-.53-2.598-1.46-3.535l-17.08-17.072a5.03 5.03 0 0 1-1.46-3.535V357m0 0-18.54 18.536a5.03 5.03 0 0 0-1.46 3.535V419.5"
              opacity="0.3"
            />
            <path
              stroke={`url(#${id}-p)`}
              strokeWidth="0.75"
              d="M1326 257h-18.5m0 0h-17.93c-1.33 0-2.6.527-3.53 1.464l-17.08 17.072a4.97 4.97 0 0 1-3.53 1.464h-15.86a4.97 4.97 0 0 1-3.53-1.464l-17.08-17.072a4.97 4.97 0 0 0-3.53-1.464h-33.93m116 0-18.54-18.536a4.97 4.97 0 0 0-3.53-1.464h-77.93"
              opacity="0.3"
            />
            <path
              stroke={`url(#${id}-q)`}
              strokeWidth="0.75"
              d="M1367.5 338.5v16.429c0 1.326-.53 2.598-1.46 3.535l-17.08 17.072a5.03 5.03 0 0 0-1.46 3.535V419.5"
              opacity="0.3"
            />
          </g>
          <g filter={`url(#${id}-r)`}>
            <path
              fill={`url(#${id}-s)`}
              fillOpacity="0.01"
              d="M1327.5 177h160v160h-160z"
            />
            <path fill="#fff" fillOpacity="0.5" d="M1327.5 177h160v160h-160z" />
          </g>
          <path
            stroke="#000"
            strokeOpacity="0.1"
            strokeWidth="0.75"
            d="M1327.5 177h160v160h-160z"
          />
          {/* Big logo */}
          <image
            x="1367.5"
            y="217"
            href={program.logo || `${DICEBEAR_AVATAR_URL}${program.name}`}
            width="80"
            height="80"
            clipPath="inset(0% round 80px)"
          />
          <g filter={`url(#${id}-t)`} opacity="0.5">
            <path fill="#fff" fillOpacity="0.4" d="M1227.5 137h40v40h-40z" />
            <path
              stroke="#000"
              strokeOpacity="0.2"
              strokeWidth="0.75"
              d="M1227.5 137h40v40h-40z"
            />
            <g
              stroke="#212121"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              opacity="0.5"
            >
              <path d="M1247.5 159.222c1.23 0 2.22-.995 2.22-2.222s-.99-2.222-2.22-2.222-2.22.995-2.22 2.222.99 2.222 2.22 2.222" />
              <path d="M1239.44 162.278v-10.556c2.67 1.194 5.08 1.357 8.06 0s5.39-1.389 8.06 0v10.556c-2.67-1.389-5.08-1.357-8.06 0s-5.39 1.193-8.06 0" />
            </g>
          </g>
          <g filter={`url(#${id}-u)`} opacity="0.5">
            <path fill="#fff" fillOpacity="0.4" d="M1507.5 337h40v40h-40z" />
            <path
              stroke="#000"
              strokeOpacity="0.2"
              strokeWidth="0.75"
              d="M1507.5 337h40v40h-40z"
            />
            <g
              stroke="#212121"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              clipPath={`url(#${id}-v)`}
              opacity="0.5"
            >
              <path d="M1527.5 357.917c1.35 0 2.44-1.095 2.44-2.445a2.44 2.44 0 1 0-4.88 0c0 1.35 1.09 2.445 2.44 2.445M1522.77 364.639a4.88 4.88 0 0 1 4.73-3.667c2.28 0 4.19 1.559 4.73 3.667" />
              <path d="M1535.14 356.389v5.805a2.45 2.45 0 0 1-2.45 2.445h-10.38a2.443 2.443 0 0 1-2.45-2.445v-10.388a2.443 2.443 0 0 1 2.45-2.445h5.8M1534.53 346.917v6.111M1537.58 349.972h-6.11" />
            </g>
          </g>
          <g filter={`url(#${id}-w)`} opacity="0.1">
            <circle
              cx="600"
              cy="600"
              r="600"
              fill="currentColor"
              transform="matrix(-1 0 0 1 2007.5 -356)"
            />
          </g>
        </g>
        <rect
          width="1199"
          height="305"
          x="368"
          y="104.5"
          stroke="#E5E5E5"
          rx="11.5"
        />
        <path
          stroke="#E5E5E5"
          d="M368 442a7.5 7.5 0 0 1 7.5-7.5h1184c4.14 0 7.5 3.358 7.5 7.5v441c0 4.142-3.36 7.5-7.5 7.5h-1184a7.5 7.5 0 0 1-7.5-7.5z"
        />
        <text
          xmlSpace="preserve"
          fill="#737373"
          fontSize="14"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="391.5" y="470.591">
            Earnings
          </tspan>
        </text>
        <text
          xmlSpace="preserve"
          fill="#262626"
          fontSize="24"
          fontWeight="500"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="391.5" y="502.727">
            $1,234.00
          </tspan>
        </text>
        <path
          fill="#FAFAFA"
          d="M1403 464c0-3.038 2.46-5.5 5.5-5.5h129c3.04 0 5.5 2.462 5.5 5.5v20c0 3.038-2.46 5.5-5.5 5.5h-129c-3.04 0-5.5-2.462-5.5-5.5z"
        />
        <path
          stroke="#E5E5E5"
          d="M1403 464c0-3.038 2.46-5.5 5.5-5.5h129c3.04 0 5.5 2.462 5.5 5.5v20c0 3.038-2.46 5.5-5.5 5.5h-129c-3.04 0-5.5-2.462-5.5-5.5z"
        />
        <g
          stroke="#171717"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          clipPath={`url(#${id}-x)`}
        >
          <path d="M1417.61 468.444v-1.777M1423.39 468.444v-1.777M1424.72 468.444h-8.44c-.98 0-1.78.796-1.78 1.778v7.556c0 .982.8 1.778 1.78 1.778h8.44c.98 0 1.78-.796 1.78-1.778v-7.556c0-.982-.8-1.778-1.78-1.778M1414.5 471.556h12" />
        </g>
        <text
          xmlSpace="preserve"
          fill="#171717"
          fontSize="12"
          fontWeight="500"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="1436.5" y="478.364">
            Last 24 hours
          </tspan>
        </text>
        <path
          stroke="#A3A3A3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="m1531.97 472.611-3.47 3.472-3.47-3.472"
        />
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="394.922" y="549.864">
            100
          </tspan>
        </text>
        <path stroke="#E5E5E5" strokeWidth="0.75" d="M423.5 545.5h1120" />
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="400.605" y="607.064">
            80
          </tspan>
        </text>
        <path stroke="#E5E5E5" strokeWidth="0.75" d="M423.5 602.7h1120" />
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="400.512" y="664.264">
            60
          </tspan>
        </text>
        <path stroke="#E5E5E5" strokeWidth="0.75" d="M423.5 659.9h1120" />
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="400.301" y="721.464">
            40
          </tspan>
        </text>
        <path stroke="#E5E5E5" strokeWidth="0.75" d="M423.5 717.1h1120" />
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="400.734" y="778.664">
            20
          </tspan>
        </text>
        <path stroke="#E5E5E5" strokeWidth="0.75" d="M423.5 774.3h1120" />
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="408" y="835.864">
            0
          </tspan>
        </text>
        <path stroke="#E5E5E5" strokeWidth="0.75" d="M423.5 831.5h1120" />
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="431.5" y="856.864">
            Oct 1
          </tspan>
        </text>
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="605.167" y="856.864">
            Oct 5
          </tspan>
        </text>
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="779.833" y="856.864">
            Oct 10
          </tspan>
        </text>
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="960.5" y="856.864">
            Oct 15
          </tspan>
        </text>
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="1141.17" y="856.864">
            Oct 20
          </tspan>
        </text>
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="1323.83" y="856.864">
            Oct 25
          </tspan>
        </text>
        <text
          xmlSpace="preserve"
          fill="#525252"
          fontSize="12"
          letterSpacing="0em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="1506.5" y="856.864">
            Oct 31
          </tspan>
        </text>
        <mask
          id={`${id}-z`}
          width="1112"
          height="293"
          x="433"
          y="539"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "alpha" }}
        >
          <path fill={`url(#${id}-y)`} d="M433 539h1112v293H433z" />
        </mask>
        <g mask={`url(#${id}-z)`}>
          <path
            fill="currentColor"
            d="m1146.78 587.227-47.65 14.613-47.65 102.293-47.65-73.066-47.656 58.453-47.652-29.227-47.652-94.986-47.653 51.146-47.652 87.68h-47.652l-47.652-73.066-47.652-58.454L574.957 558l-47.653 43.84-47.652 29.227L432 777.2V832h1096V704.133h-47.65l-47.65-73.066-47.66 14.613-47.65-43.84-47.65 58.453-47.65 116.907-47.66 14.613z"
            opacity="0.15"
          />
        </g>
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="m433 776.437 47.494-145.274c.074-.226.226-.419.429-.543l47.212-28.882q.082-.05.154-.116l47.116-43.235a1 1 0 0 1 .968-.22l46.772 14.307c.189.058.357.17.482.323l47.416 58.015 47.313 72.36a1 1 0 0 0 .837.453h46.474a1 1 0 0 0 .878-.522l47.264-86.742q.06-.111.147-.204l46.543-49.827a1 1 0 0 1 1.624.233l46.836 93.12a1 1 0 0 0 .371.403l46.622 28.521a1 1 0 0 0 1.296-.22l46.192-56.517a.998.998 0 0 1 1.61.085l45.88 70.167a.997.997 0 0 0 1.74-.124l46.66-99.908c.12-.256.35-.45.62-.533l46.16-14.119a.995.995 0 0 1 1.26.729l47.13 201.791c.13.564.71.898 1.26.729l46.13-14.111c.29-.088.52-.3.64-.578l47.37-115.922q.06-.139.15-.254l46.85-57.315a1 1 0 0 1 1.45-.104l46.4 42.585c.26.24.63.323.97.22l46.34-14.176c.43-.13.89.037 1.13.409l46.91 71.731c.18.283.49.453.83.453H1528"
        />
      </g>
      <defs>
        <pattern
          xmlns="http://www.w3.org/2000/svg"
          id={`${id}-smallGrid`}
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="#0004"
            strokeWidth="0.5"
          />
        </pattern>
        <pattern
          xmlns="http://www.w3.org/2000/svg"
          id={`${id}-grid`}
          width="80"
          height="80"
          patternUnits="userSpaceOnUse"
        >
          <rect width="80" height="80" fill={`url(#${id}-smallGrid)`} />
          <path
            d="M 80 0 L 0 0 0 80"
            fill="none"
            stroke="#0001"
            strokeWidth="1"
          />
        </pattern>
        <clipPath id={`${id}-a`}>
          <path fill="#fff" d="M0 0h1695v940H0z" />
        </clipPath>
        <clipPath id={`${id}-b`}>
          <path fill="#fff" d="M176 16h16v16h-16z" />
        </clipPath>
        <clipPath id={`${id}-e`}>
          <path
            fill="#fff"
            d="M12 130a6 6 0 0 1 6-6h204a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z"
          />
        </clipPath>
        <clipPath id={`${id}-f`}>
          <path fill="#fff" d="M20 131h16v16H20z" />
        </clipPath>
        <clipPath id={`${id}-g`}>
          <path fill="#fff" d="M20 191h16v16H20z" />
        </clipPath>
        <clipPath id={`${id}-h`}>
          <rect
            width="1200"
            height="306"
            x="367.5"
            y="104"
            fill="#fff"
            rx="12"
          />
        </clipPath>
        <clipPath id={`${id}-l`}>
          <path fill="#fff" d="M1191.5 92h381v330h-381z" />
        </clipPath>
        <clipPath id={`${id}-v`}>
          <path fill="#fff" d="M1516.5 346h22v22h-22z" />
        </clipPath>
        <clipPath id={`${id}-x`}>
          <path fill="#fff" d="M1412.5 466h16v16h-16z" />
        </clipPath>
        <linearGradient
          id={`${id}-i`}
          x1="367"
          x2="1330.65"
          y1="410"
          y2="25.44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FAFAFA" />
          <stop offset="0.489" stopColor="#FAFAFA" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${id}-m`}
          x1="1407.5"
          x2="1407.5"
          y1="97.5"
          y2="175.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopOpacity="0" />
          <stop offset="1" />
        </linearGradient>
        <linearGradient
          id={`${id}-n`}
          x1="1567"
          x2="1489"
          y1="257"
          y2="257"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopOpacity="0" />
          <stop offset="1" />
        </linearGradient>
        <linearGradient
          id={`${id}-o`}
          x1="1447.5"
          x2="1447.5"
          y1="416.5"
          y2="338.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopOpacity="0" />
          <stop offset="1" />
        </linearGradient>
        <linearGradient
          id={`${id}-p`}
          x1="1210"
          x2="1326"
          y1="257"
          y2="257"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopOpacity="0" />
          <stop offset="1" />
        </linearGradient>
        <linearGradient
          id={`${id}-q`}
          x1="1367.5"
          x2="1367.5"
          y1="416.5"
          y2="338.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopOpacity="0" />
          <stop offset="1" />
        </linearGradient>
        <linearGradient
          id={`${id}-s`}
          x1="1407.5"
          x2="1407.5"
          y1="337"
          y2="177"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity="0.23" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient
          id={`${id}-y`}
          x1="989"
          x2="989"
          y1="539"
          y2="832"
          gradientUnits="userSpaceOnUse"
        >
          <stop />
          <stop offset="1" stopOpacity="0" />
        </linearGradient>
        <filter
          id={`${id}-c`}
          width="763"
          height="763"
          x="-377"
          y="461"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            result="effect1_foregroundBlur_0_1039"
            stdDeviation="100"
          />
        </filter>
        <filter
          id={`${id}-j`}
          width="1245"
          height="806"
          x="595"
          y="-139"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            result="effect1_foregroundBlur_0_1039"
            stdDeviation="80"
          />
        </filter>
        <filter
          id={`${id}-k`}
          width="1440"
          height="1440"
          x="687.5"
          y="-463"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            result="effect1_foregroundBlur_0_1039"
            stdDeviation="60"
          />
        </filter>
        <filter
          id={`${id}-r`}
          width="160.75"
          height="160.75"
          x="1327.12"
          y="176.625"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feMorphology
            in="SourceAlpha"
            radius="6"
            result="effect1_innerShadow_0_1039"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="6" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
          <feBlend in2="shape" result="effect1_innerShadow_0_1039" />
        </filter>
        <filter
          id={`${id}-t`}
          width="40.75"
          height="40.75"
          x="1227.12"
          y="136.625"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feMorphology
            in="SourceAlpha"
            radius="6"
            result="effect1_innerShadow_0_1039"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="6" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
          <feBlend in2="shape" result="effect1_innerShadow_0_1039" />
        </filter>
        <filter
          id={`${id}-u`}
          width="40.75"
          height="40.75"
          x="1507.12"
          y="336.625"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            result="hardAlpha"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          />
          <feMorphology
            in="SourceAlpha"
            radius="6"
            result="effect1_innerShadow_0_1039"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="6" />
          <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
          <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
          <feBlend in2="shape" result="effect1_innerShadow_0_1039" />
        </filter>
        <filter
          id={`${id}-w`}
          width="1600"
          height="1600"
          x="607.5"
          y="-556"
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur
            result="effect1_foregroundBlur_0_1039"
            stdDeviation="100"
          />
        </filter>
        <radialGradient
          id={`${id}-d`}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="rotate(-122.552 140.484 41.016)scale(147.858)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="red" />
          <stop offset="0.275" stopColor="#EAB308" />
          <stop offset="0.45" stopColor="#5CFF80" />
          <stop offset="0.6" stopColor="#00FFF9" />
          <stop offset="0.8" stopColor="#3A8BFD" />
          <stop offset="1" stopColor="#855AFC" />
        </radialGradient>
      </defs>
    </svg>
  );
}
