"use client";

import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import { ProgramWithLanderDataProps } from "@/lib/types";
import { OG_AVATAR_URL, PARTNERS_DOMAIN, truncate } from "@dub/utils";
import { CSSProperties, useId } from "react";
import { useWatch } from "react-hook-form";
import { useBrandingFormContext } from "../branding-form";
import { PreviewWindow } from "../preview-window";

export function PortalPreview({
  program,
}: {
  program: ProgramWithLanderDataProps;
}) {
  const id = useId();

  const { getValues } = useBrandingFormContext();
  const { brandColor, logo } = {
    ...useWatch(),
    ...getValues(),
  };

  const partnerLink = getLinkStructureOptions({
    domain: program.domain,
    url: program.url,
  }).find(({ id }) => id === program.linkStructure)?.example;

  return (
    <div className="scrollbar-hide -mx-2 h-full w-auto overflow-y-auto px-2 pb-4">
      <PreviewWindow
        url={`${PARTNERS_DOMAIN}/programs/${program?.slug}`}
        className="h-auto rounded-b-xl bg-neutral-100"
        contentClassName="overflow-y-hidden"
      >
        <div
          className="relative z-0 mx-auto w-full select-none text-[var(--brand)]"
          style={
            {
              "--brand": brandColor || "#000000",
            } as CSSProperties
          }
          role="presentation"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            fill="none"
            viewBox="0 0 869 690"
            className="h-auto w-full [&_*]:tracking-[-0.035em]"
          >
            <defs>
              <path
                id={`${id}-o`}
                fill="#fff"
                d="M123.403 13.062a8.193 8.193 0 0 1 8.193-8.194H868.5v684.36H123.403z"
              ></path>
              <path id={`${id}-an`} fill="#fff" d="M0 0h8.194v8.194H0z"></path>
              <path id={`${id}-ao`} fill="#fff" d="M0 0h7.17v7.17H0z"></path>
              <path
                id={`${id}-ap`}
                fill="#fff"
                d="M0 0h614.513v135.193H0z"
              ></path>
            </defs>
            <g clipPath={`url(#${id}-a)`}>
              <path fill="#F5F5F5" d="M.5.771h868v688.457H.5z"></path>
              <path fill="#F5F5F5" d="M.5.771h122.903v688.457H.5z"></path>
              <path
                fill="#000"
                fillRule="evenodd"
                d="M13.857 8.368h1.408v8.919h-1.408v-.59a3.286 3.286 0 1 1 0-5.394zm-1.877 7.51a1.878 1.878 0 1 0 0-3.755 1.878 1.878 0 0 0 0 3.755m11.735-7.51h1.408v2.936A3.286 3.286 0 1 1 23.715 14zM27 15.878a1.878 1.878 0 1 0 0-3.755 1.878 1.878 0 0 0 0 3.755"
                clipRule="evenodd"
              ></path>
              <path
                fill="#000"
                d="M17.613 10.715h-1.409V14a3.285 3.285 0 0 0 3.286 3.286 3.29 3.29 0 0 0 2.324-.963 3.29 3.29 0 0 0 .962-2.323v-3.286h-1.408V14a1.877 1.877 0 0 1-3.206 1.327 1.88 1.88 0 0 1-.55-1.327z"
              ></path>
              <g
                stroke="#737373"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="0.768"
                clipPath={`url(#${id}-b)`}
              >
                <path d="M94.725 11.355v5.007m-2.39-5.804c0-.44.358-.796.797-.796 1.179 0 1.593 1.593 1.593 1.593h-1.593a.797.797 0 0 1-.796-.797m3.984.797h-1.594s.415-1.593 1.594-1.593a.797.797 0 0 1 0 1.593m.796 1.365v2.731a.91.91 0 0 1-.91.91h-2.959a.91.91 0 0 1-.91-.91v-2.73"></path>
                <path d="M97.57 11.355h-5.69a.455.455 0 0 0-.455.455v.455c0 .252.204.455.455.455h5.69a.455.455 0 0 0 .456-.455v-.455a.455.455 0 0 0-.456-.455"></path>
              </g>
              <g clipPath={`url(#${id}-c)`}>
                <circle cx="111.113" cy="13.062" r="6.146" fill="#ccc" />
              </g>
              <g clipPath={`url(#${id}-d)`}>
                {/* Little logo */}
                <image
                  width="16.387"
                  height="16.387"
                  x="9.718"
                  y="36.376"
                  href={logo || `${OG_AVATAR_URL}${program.name}`}
                  clipPath="inset(0% round 32px)"
                />
                <circle
                  cx="17.911"
                  cy="44.57"
                  r="7.937"
                  stroke="#D4D4D4"
                  strokeWidth="0.512"
                  opacity="0.5"
                ></circle>
              </g>
              <text
                xmlSpace="preserve"
                fill="#171717"
                fontSize="7.169"
                fontWeight="600"
                letterSpacing="-.02em"
                style={{ whiteSpace: "pre" }}
              >
                <tspan x="31.226" y="42.298">
                  {truncate(program?.name, 13)}
                </tspan>
              </text>
              <text
                xmlSpace="preserve"
                fill="#737373"
                fontSize="6.145"
                fontWeight="500"
                letterSpacing="-.02em"
                style={{ whiteSpace: "pre" }}
              >
                <tspan x="31.226" y="51.901">
                  Enrolled
                </tspan>
              </text>
              <g
                stroke="#A1A1A1"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="0.768"
                clipPath={`url(#${id}-e)`}
              >
                <path d="m110.262 43.619-1.195-1.195-1.195 1.195m2.39 1.877-1.195 1.195-1.195-1.195"></path>
              </g>
              <path
                fill="#F5F5F5"
                d="M6.645 65.836h110.612v61.451H6.645z"
              ></path>
              <g clipPath={`url(#${id}-f)`}>
                <path
                  fill="#DBEAFE"
                  d="M6.645 65.836h110.612v15.363H6.645z"
                  opacity="0.5"
                ></path>
                <g fill="#737373" clipPath={`url(#${id}-g)`}>
                  <path d="M14.839 71.924a.341.341 0 1 0 0-.683.341.341 0 0 0 0 .683m1.367.567a.341.341 0 1 0 0-.683.341.341 0 0 0 0 .683m.567 1.368a.341.341 0 1 0 0-.683.341.341 0 0 0 0 .683m-3.302-1.368a.341.341 0 1 0 0-.683.341.341 0 0 0 0 .683m-.567 1.368a.342.342 0 1 0 0-.683.342.342 0 0 0 0 .683"></path>
                  <path d="m15.137 76.123-.004-.04-.02-.13a12 12 0 0 0-.075-.399c-.055-.27-.126-.596-.2-.921-.073.325-.144.65-.199.921a12 12 0 0 0-.075.398l-.019.13-.005.04v.013a.299.299 0 0 0 .597 0zm2.618-2.606a2.916 2.916 0 1 0-4.512 2.44.384.384 0 1 1-.421.641 3.684 3.684 0 1 1 4.034 0 .384.384 0 1 1-.422-.642 2.91 2.91 0 0 0 1.32-2.439m-1.85 2.618a1.067 1.067 0 0 1-2.133 0c0-.084.016-.199.034-.308.02-.12.047-.265.08-.425.065-.321.151-.711.237-1.087a112 112 0 0 1 .313-1.335l.021-.09.008-.03v-.002l.021-.062a.385.385 0 0 1 .726.062v.002l.008.03.021.09.078.324c.064.27.15.635.236 1.01.085.377.171.767.236 1.088.033.16.06.305.08.425.018.109.034.224.034.308"></path>
                </g>
                <text
                  xmlSpace="preserve"
                  fill="#1447E6"
                  fontSize="7.169"
                  fontWeight="500"
                  letterSpacing="-.02em"
                  style={{ whiteSpace: "pre" }}
                >
                  <tspan x="24.056" y="75.745">
                    Overview
                  </tspan>
                </text>
              </g>
              <g clipPath={`url(#${id}-h)`}>
                <path
                  stroke="#737373"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="0.768"
                  d="M15.666 87.947c-.18-.424-.539-.52-.81-.52-.252 0-.915.134-.853.77.042.446.463.613.831.678s.902.206.915.744c.011.456-.398.766-.893.766-.473 0-.801-.184-.928-.6m.91-2.84v.482m0 2.958v.43m3.3-1.935a3.3 3.3 0 1 1-6.6 0 3.3 3.3 0 0 1 6.6 0"
                ></path>
              </g>
              <text
                xmlSpace="preserve"
                fill="#404040"
                fontSize="6.657"
                fontWeight="500"
                style={{ whiteSpace: "pre" }}
              >
                <tspan x="24.056" y="91.301">
                  Earnings
                </tspan>
              </text>
              <g clipPath={`url(#${id}-i)`}>
                <path
                  stroke="#737373"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="0.768"
                  d="M14.612 103.254a1.6 1.6 0 0 0-.443.314l-.005.004a1.61 1.61 0 0 0 0 2.276l.99.99a1.61 1.61 0 0 0 2.276 0l.005-.004a1.61 1.61 0 0 0 0-2.276l-.424-.424m-1.944 1.098q.242-.114.443-.314l.004-.005a1.61 1.61 0 0 0 0-2.276l-.99-.99a1.61 1.61 0 0 0-2.276 0l-.005.005a1.61 1.61 0 0 0 0 2.276l.424.424"
                ></path>
              </g>
              <text
                xmlSpace="preserve"
                fill="#404040"
                fontSize="6.657"
                fontWeight="500"
                style={{ whiteSpace: "pre" }}
              >
                <tspan x="24.056" y="106.664">
                  Links
                </tspan>
              </text>
              <g clipPath={`url(#${id}-j)`}>
                <path
                  fill="#737373"
                  d="M13.018 121.768a.342.342 0 1 0 0-.683.342.342 0 0 0 0 .683"
                ></path>
                <path
                  stroke="#737373"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="0.768"
                  d="m13.742 122.151 2.977-2.978a.454.454 0 0 0 0-.643l-.804-.805a.455.455 0 0 0-.644 0l-.091.091m-2.162 4.635h4.21a.456.456 0 0 0 .456-.456v-1.138a.455.455 0 0 0-.456-.455H17.1m-4.082 2.049a1.025 1.025 0 0 1-1.024-1.025v-4.21c0-.251.204-.455.455-.455h1.138c.251 0 .455.204.455.455v4.21c0 .566-.459 1.025-1.024 1.025"
                ></path>
              </g>
              <text
                xmlSpace="preserve"
                fill="#404040"
                fontSize="6.657"
                fontWeight="500"
                style={{ whiteSpace: "pre" }}
              >
                <tspan x="24.056" y="122.027">
                  Resources
                </tspan>
              </text>
              <mask id={`${id}-k`} fill="#fff">
                <path d="M.5 612.067h122.903v77.161H.5z"></path>
              </mask>
              <path
                fill="#D4D4D4"
                d="M.5 612.067v.512h122.903v-1.024H.5z"
                mask={`url(#${id}-k)`}
              ></path>
              <g clipPath={`url(#${id}-l)`}>
                <path
                  stroke="#737373"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="0.768"
                  d="M12.278 623.504a.797.797 0 1 0 0-1.594.797.797 0 0 0 0 1.594"
                ></path>
                <path
                  stroke="#737373"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="0.768"
                  d="M14.37 620.616h-4.183a.797.797 0 0 0-.796.797v2.589c0 .44.356.796.796.796h4.182c.44 0 .797-.356.797-.796v-2.589a.797.797 0 0 0-.797-.797"
                ></path>
                <path
                  fill="#737373"
                  d="M10.386 623.006a.299.299 0 1 0 0-.598.299.299 0 0 0 0 .598m3.784 0a.299.299 0 1 0 0-.598.299.299 0 0 0 0 .598"
                ></path>
                <path
                  stroke="#737373"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="0.768"
                  d="M10.187 619.421h4.182"
                ></path>
              </g>
              <text
                xmlSpace="preserve"
                fill="#737373"
                fontSize="6.145"
                fontWeight="500"
                style={{ whiteSpace: "pre" }}
              >
                <tspan x="18.935" y="624.543">
                  Payouts
                </tspan>
              </text>
              <g clipPath={`url(#${id}-m)`}>
                <path
                  stroke="#737373"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="0.768"
                  d="m46.463 620.886 1.423 1.423-1.423 1.422"
                ></path>
              </g>
              <text
                xmlSpace="preserve"
                fill="#737373"
                fontSize="6.145"
                fontWeight="500"
                style={{ whiteSpace: "pre" }}
              >
                <tspan x="8.694" y="642.382">
                  Upcoming payouts
                </tspan>
              </text>
              <text
                xmlSpace="preserve"
                fill="#404040"
                fontSize="6.657"
                fontWeight="500"
                style={{ whiteSpace: "pre" }}
              >
                <tspan x="8.694" y="653.665">
                  $0.00
                </tspan>
              </text>
              <text
                xmlSpace="preserve"
                fill="#737373"
                fontSize="6.145"
                fontWeight="500"
                style={{ whiteSpace: "pre" }}
              >
                <tspan x="8.694" y="668.672">
                  Lifetime earnings
                </tspan>
              </text>
              <text
                xmlSpace="preserve"
                fill="#404040"
                fontSize="6.657"
                fontWeight="500"
                style={{ whiteSpace: "pre" }}
              >
                <tspan x="8.694" y="679.955">
                  $0.00
                </tspan>
              </text>
              <g clipPath={`url(#${id}-n)`}>
                <use xlinkHref={`#${id}-o`}></use>
                <path
                  fill="#fff"
                  d="M188.695 21.255h614.513v24.58H188.695z"
                ></path>
                <text
                  xmlSpace="preserve"
                  fill="#171717"
                  fontSize="12.29"
                  fontWeight="600"
                  letterSpacing="-.02em"
                  style={{ whiteSpace: "pre" }}
                >
                  <tspan x="188.695" y="37.708">
                    Overview
                  </tspan>
                </text>
                <path
                  fill={`url(#${id}-C)`}
                  d="M188.695 54.03h614.513v131.12H188.695z"
                ></path>
                <g clipPath={`url(#${id}-p)`}>
                  <rect
                    width="614.513"
                    height="131.491"
                    x="188.695"
                    y="54.029"
                    fill="#FAFAFA"
                    rx="4.097"
                  ></rect>
                  <rect
                    xmlns="http://www.w3.org/2000/svg"
                    width="614.513"
                    height="131.491"
                    x="188.695"
                    y="54.029"
                    opacity="0.25"
                    fill={`url(#${id}-grid)`}
                  />
                  <path fill={`url(#${id}-aq)`} d="M188 54h615v131H189z" />
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="8.194"
                    fontWeight="600"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="200.985" y="75.444">
                      Referral link
                    </tspan>
                  </text>
                  <rect
                    width="198.003"
                    height="19.972"
                    x="201.241"
                    y="85.721"
                    fill="#fff"
                    rx="2.817"
                  ></rect>
                  <rect
                    width="198.003"
                    height="19.972"
                    x="201.241"
                    y="85.721"
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    rx="2.817"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="7.169"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="207.13" y="98.314">
                      {partnerLink}
                    </tspan>
                  </text>
                  <path
                    fill="#171717"
                    d="M405.645 88.537a3.073 3.073 0 0 1 3.073-3.072h52a3.07 3.07 0 0 1 3.072 3.072v14.339a3.07 3.07 0 0 1-3.072 3.073h-52a3.073 3.073 0 0 1-3.073-3.073z"
                  ></path>
                  <path
                    stroke="#fff"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="0.768"
                    d="M415.275 97.186h-.455a.91.91 0 0 1-.91-.91v-2.504a.91.91 0 0 1 .91-.91h3.414a.91.91 0 0 1 .91.91v.455m.455 4.325h-3.414a.91.91 0 0 1-.91-.91v-2.504a.91.91 0 0 1 .91-.91h3.414a.91.91 0 0 1 .911.91v2.503a.91.91 0 0 1-.911.91"
                  ></path>
                  <text
                    xmlSpace="preserve"
                    fill="#fff"
                    fontSize="7.169"
                    fontWeight="600"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="423.256" y="98.314">
                      Copy link
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="8.194"
                    fontWeight="600"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="200.985" y="139.653">
                      Rewards
                    </tspan>
                  </text>
                  <path
                    fill="#fff"
                    d="M204.057 147.882h245.806a2.816 2.816 0 0 1 2.816 2.816v19.46a2.816 2.816 0 0 1-2.816 2.816H204.057a2.816 2.816 0 0 1-2.816-2.816v-19.46a2.816 2.816 0 0 1 2.816-2.816"
                  ></path>
                  <path
                    stroke="#E5E5E5"
                    strokeWidth="0.512"
                    d="M204.057 147.882h245.806a2.816 2.816 0 0 1 2.816 2.816v19.46a2.816 2.816 0 0 1-2.816 2.816H204.057a2.816 2.816 0 0 1-2.816-2.816v-19.46a2.816 2.816 0 0 1 2.816-2.816Z"
                  ></path>
                  <text
                    xmlSpace="preserve"
                    fill="#999"
                    fontSize="8.194"
                    fontWeight="600"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="210" y="161">
                      ...
                    </tspan>
                  </text>
                  <rect
                    width="56.288"
                    height="11.097"
                    x="738.935"
                    y="165.858"
                    fill="#fff"
                    rx="3.073"
                  ></rect>
                  <rect
                    width="56.8"
                    height="11.609"
                    x="738.679"
                    y="165.602"
                    stroke="#000"
                    strokeOpacity="0.1"
                    strokeWidth="0.512"
                    rx="3.329"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontSize="5.91"
                    fontWeight="500"
                    style={{
                      whiteSpace: "pre",
                    }}
                  >
                    <tspan x="743.397" y="173.556">
                      Powered by
                    </tspan>
                  </text>
                  <path
                    fill="#171717"
                    fillRule="evenodd"
                    d="M781.571 168.637h.819v5.263h-.819v-.348a1.9 1.9 0 0 1-1.092.348c-1.055 0-1.911-.868-1.911-1.939s.856-1.939 1.911-1.939c.406 0 .783.128 1.092.347zm-1.092 4.432a1.1 1.1 0 0 0 1.092-1.108 1.1 1.1 0 0 0-1.092-1.108 1.1 1.1 0 0 0-1.092 1.108 1.1 1.1 0 0 0 1.092 1.108m6.825-4.432h.819v1.732c.31-.219.686-.347 1.092-.347 1.056 0 1.911.868 1.911 1.939s-.855 1.939-1.911 1.939c-1.055 0-1.911-.868-1.911-1.939zm1.911 4.432a1.1 1.1 0 0 0 1.092-1.108 1.1 1.1 0 0 0-1.092-1.108 1.1 1.1 0 0 0-1.092 1.108 1.1 1.1 0 0 0 1.092 1.108"
                    clipRule="evenodd"
                  ></path>
                  <path
                    fill="#171717"
                    d="M783.755 170.022h-.819v1.939a1.96 1.96 0 0 0 .56 1.371 1.9 1.9 0 0 0 1.351.568 1.907 1.907 0 0 0 1.766-1.197c.096-.235.145-.488.145-.742v-1.939h-.819v1.939c0 .294-.115.576-.32.783a1.08 1.08 0 0 1-1.544 0 1.11 1.11 0 0 1-.32-.783z"
                  ></path>
                  <mask
                    id={`${id}-s`}
                    width="164"
                    height="164"
                    x="639"
                    y="38"
                    maskUnits="userSpaceOnUse"
                    style={{ maskType: "alpha" }}
                  >
                    <circle
                      cx="721.017"
                      cy="120.32"
                      r="81.679"
                      fill={`url(#${id}-r)`}
                    ></circle>
                  </mask>
                  <g mask={`url(#${id}-s)`}>
                    <g filter={`url(#${id}-t)`}>
                      <rect
                        width="20.484"
                        height="20.484"
                        x="649.58"
                        y="68.855"
                        fill={`url(#${id}-u)`}
                        rx="4.097"
                      ></rect>
                      <rect
                        width="20.484"
                        height="20.484"
                        x="649.58"
                        y="68.855"
                        stroke="#000"
                        strokeOpacity="0.06"
                        strokeWidth="0.384"
                        rx="4.097"
                      ></rect>
                      <g
                        stroke="#737373"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="0.768"
                        clipPath={`url(#${id}-v)`}
                        opacity="0.2"
                      >
                        <path d="M659.821 80.234a1.138 1.138 0 1 0 0-2.275 1.138 1.138 0 0 0 0 2.275"></path>
                        <path d="M655.696 81.8v-5.406c1.364.611 2.599.695 4.125 0s2.762-.711 4.126 0V81.8c-1.364-.712-2.6-.695-4.126 0-1.526.694-2.761.61-4.125 0"></path>
                      </g>
                    </g>
                    <g filter={`url(#${id}-w)`}>
                      <rect
                        width="20.484"
                        height="20.484"
                        x="772.482"
                        y="150.789"
                        fill={`url(#${id}-x)`}
                        rx="4.097"
                      ></rect>
                      <rect
                        width="20.484"
                        height="20.484"
                        x="772.482"
                        y="150.789"
                        stroke="#000"
                        strokeOpacity="0.06"
                        strokeWidth="0.384"
                        rx="4.097"
                      ></rect>
                      <g
                        stroke="#737373"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="0.768"
                        clipPath={`url(#${id}-y)`}
                        opacity="0.2"
                      >
                        <path d="M782.724 161.502a1.253 1.253 0 1 0-.001-2.505 1.253 1.253 0 0 0 .001 2.505m-2.425 3.442a2.505 2.505 0 0 1 4.85 0"></path>
                        <path d="M786.636 160.719v2.973c0 .692-.56 1.252-1.252 1.252h-5.32c-.692 0-1.252-.56-1.252-1.252v-5.32c0-.691.56-1.251 1.252-1.251h2.973m3.286-1.252v3.129m1.565-1.564h-3.13"></path>
                      </g>
                    </g>
                    <g filter={`url(#${id}-z)`}>
                      {/* Rounded rectangle behind large logo */}
                      <path
                        fill={`url(#${id}-A)`}
                        d="M680.305 87.29a8.194 8.194 0 0 1 8.194-8.194h65.548a8.193 8.193 0 0 1 8.193 8.193v65.548a8.193 8.193 0 0 1-8.193 8.194h-65.548a8.194 8.194 0 0 1-8.194-8.194z"
                      ></path>
                    </g>
                    <path
                      stroke="#000"
                      strokeOpacity="0.06"
                      strokeWidth="0.384"
                      d="M680.305 87.29a8.194 8.194 0 0 1 8.194-8.194h65.548a8.193 8.193 0 0 1 8.193 8.193v65.548a8.193 8.193 0 0 1-8.193 8.194h-65.548a8.194 8.194 0 0 1-8.194-8.194z"
                    ></path>
                    <g filter={`url(#${id}-B)`} opacity="0.3">
                      <circle
                        cx="721.273"
                        cy="120.063"
                        r="22.02"
                        fill="#f00"
                        opacity="0.5"
                      ></circle>
                    </g>
                    {/* Big logo */}
                    <image
                      width="40.968"
                      height="40.968"
                      x="700.789"
                      y="99.58"
                      href={logo || `${OG_AVATAR_URL}${program.name}`}
                      clipPath="inset(0% round 80px)"
                    />
                    <rect
                      width="40.456"
                      height="40.456"
                      x="701.045"
                      y="99.836"
                      stroke="#000"
                      strokeOpacity="0.08"
                      strokeWidth="0.512"
                      rx="20.228"
                    ></rect>
                  </g>
                  <g
                    filter={`url(#${id}-D)`}
                    style={{ mixBlendMode: "soft-light" }}
                  >
                    {brandColor && (
                      <ellipse
                        cx="722.553"
                        cy="120.066"
                        fill="currentColor"
                        opacity="0.4"
                        rx="150.3"
                        ry="158.749"
                      />
                    )}
                  </g>
                  <g filter={`url(#${id}-E)`} opacity="0.15">
                    {brandColor ? (
                      <ellipse
                        cx="150.3"
                        cy="120.139"
                        fill="currentColor"
                        opacity="0.7"
                        rx="150.3"
                        ry="120.139"
                        transform="matrix(1 0 0 -1 572.254 249.368)"
                      />
                    ) : (
                      <foreignObject width="250" height="250" x="596" y="-6">
                        <div
                          className="size-full rounded-full saturate-150"
                          style={{
                            background:
                              "conic-gradient(from -66deg at 50% 50%, #855afc -32deg, red 63deg, #eab308 158deg, #5cff80 240deg, #855afc 328deg, red 423deg)",
                          }}
                        ></div>
                      </foreignObject>
                    )}
                  </g>
                </g>
                <rect
                  width="614.001"
                  height="130.979"
                  x="188.951"
                  y="54.285"
                  stroke="#E5E5E5"
                  strokeWidth="0.512"
                  rx="3.841"
                ></rect>
                <g clipPath={`url(#${id}-F)`}>
                  <rect
                    width="404.555"
                    height="134.681"
                    x="188.951"
                    y="206.261"
                    fill="#fff"
                    rx="3.841"
                  ></rect>
                  <rect
                    width="404.555"
                    height="134.681"
                    x="188.951"
                    y="206.261"
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    rx="3.841"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="8.194"
                    fontWeight="600"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="198.937" y="223.726">
                      Earnings
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="9.218"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="198.937" y="237.695">
                      $0.00
                    </tspan>
                  </text>
                  <mask
                    id={`${id}-H`}
                    width="386"
                    height="27"
                    x="198"
                    y="289"
                    maskUnits="userSpaceOnUse"
                    style={{ maskType: "alpha" }}
                  >
                    <path
                      fill={`url(#${id}-G)`}
                      d="M0 0h384.754v26.629H0z"
                      transform="translate(198.937 289.132)"
                    ></path>
                  </mask>
                  <g mask={`url(#${id}-H)`}>
                    <path
                      fill={
                        brandColor
                          ? "currentColor"
                          : `url(#${id}-color-gradient)`
                      }
                      d="m535.639 294.779-47.886 8.902q-.251.046-.506.03l-47.882-3.07-48.137 2.469-48.137-.617-47.934-3.38a2 2 0 0 0-.404.011l-47.936 6.146-48.137 2.469v8.022h385.095v-24.068z"
                      opacity="0.2"
                    ></path>
                  </g>
                  <path
                    stroke={
                      brandColor ? "currentColor" : `url(#${id}-color-gradient)`
                    }
                    strokeLinejoin="round"
                    strokeWidth="0.768"
                    d="m198.937 307.941 48.094-3.115 47.805-5.705q.289-.035.58-.014l47.803 3.367 48.094.522 48.095-2.091 47.737 2.595q.357.02.708-.044l47.743-8.541 48.094-3.126"
                  ></path>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="198.937" y="329.69">
                      Jan 2024
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="554.519" y="329.69">
                      Dec 2024
                    </tspan>
                  </text>
                  <g filter={`url(#${id}-J)`}>
                    <g clipPath={`url(#${id}-K)`}>
                      <path
                        fill="#fff"
                        d="M250.914 247.996h68.62v14.194h-68.62z"
                      ></path>
                      <text
                        xmlSpace="preserve"
                        fill="#404040"
                        fontSize="5.633"
                        fontWeight="500"
                        style={{ whiteSpace: "pre" }}
                      >
                        <tspan x="255.011" y="257.141">
                          Mar 2024
                        </tspan>
                      </text>
                      <text
                        xmlSpace="preserve"
                        fill="#737373"
                        fontSize="5.633"
                        style={{ whiteSpace: "pre" }}
                      >
                        <tspan x="299.438" y="257.141">
                          $0.00
                        </tspan>
                      </text>
                    </g>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M255.011 248.252h60.427a3.84 3.84 0 0 1 3.84 3.84v6a3.84 3.84 0 0 1-3.84 3.841h-60.427a3.84 3.84 0 0 1-3.841-3.841v-6a3.84 3.84 0 0 1 3.841-3.84Z"
                      shapeRendering="crispEdges"
                    ></path>
                  </g>
                  <path
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    d="M244.769 247.996v68.108"
                  ></path>
                  <circle
                    cx="244.513"
                    cy="305.095"
                    r="2.817"
                    fill="currentColor"
                    stroke="#fff"
                    strokeWidth="1.024"
                  ></circle>
                  <rect
                    width="33.097"
                    height="11.097"
                    x="228.894"
                    y="321.908"
                    fill="#F5F5F5"
                    rx="3.073"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="230.942" y="329.691">
                      Mar 2024
                    </tspan>
                  </text>
                  <path
                    fill="#fff"
                    d="M510.098 216.503h70.605a2.817 2.817 0 0 1 2.817 2.816v8.194a2.817 2.817 0 0 1-2.817 2.817h-70.605a2.82 2.82 0 0 1-2.817-2.817v-8.194a2.82 2.82 0 0 1 2.817-2.816"
                  ></path>
                  <path
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    d="M510.098 216.503h70.605a2.817 2.817 0 0 1 2.817 2.816v8.194a2.817 2.817 0 0 1-2.817 2.817h-70.605a2.82 2.82 0 0 1-2.817-2.817v-8.194a2.82 2.82 0 0 1 2.817-2.816Z"
                  ></path>
                  <g
                    stroke="#171717"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="0.768"
                    clipPath={`url(#${id}-L)`}
                  >
                    <path d="M514.764 220.571v-.91m2.959.91v-.91m.683.91h-4.325a.91.91 0 0 0-.91.91v3.869a.91.91 0 0 0 .91.911h4.325c.502 0 .91-.408.91-.911v-3.869a.91.91 0 0 0-.91-.91m-5.235 1.593h6.145"></path>
                  </g>
                  <text
                    xmlSpace="preserve"
                    fill="#171717"
                    fontSize="6.145"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="524.437" y="225.651">
                      Last 12 months
                    </tspan>
                  </text>
                  <g clipPath={`url(#${id}-M)`}>
                    <path
                      stroke="#737373"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="0.768"
                      d="m577.872 222.704-1.778 1.778-1.778-1.778"
                    ></path>
                  </g>
                  <rect
                    width="196.644"
                    height="134.681"
                    x="606.308"
                    y="206.261"
                    fill="#fff"
                    rx="3.841"
                  ></rect>
                  <rect
                    width="196.644"
                    height="134.681"
                    x="606.308"
                    y="206.261"
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    rx="3.841"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="8.194"
                    fontWeight="600"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.293" y="223.835">
                      Payouts
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontSize="7.169"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="742.966" y="223.462">
                      4
                    </tspan>
                    <tspan x="758.418" y="223.462">
                      24 r
                    </tspan>
                    <tspan x="776.11" y="223.462">
                      s
                    </tspan>
                    <tspan x="784.218" y="223.462">
                      l
                    </tspan>
                    <tspan x="788.607" y="223.462">
                      s
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontSize="7.169"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="747.657" y="223.462">
                      {" "}
                      of{" "}
                    </tspan>
                    <tspan x="771.902" y="223.462">
                      e
                    </tspan>
                    <tspan x="779.954" y="223.462">
                      u
                    </tspan>
                    <tspan x="786.003" y="223.462">
                      t
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="6.145"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.293" y="244.235">
                      $123.45
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontSize="5.633"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.293" y="252.597">
                      Dec 15, 2024
                    </tspan>
                  </text>
                  <path
                    fill="#DBEAFE"
                    d="M742.555 242.952a3.07 3.07 0 0 1 3.072-3.073h44.266a3.073 3.073 0 0 1 3.073 3.073v6.145a3.07 3.07 0 0 1-3.073 3.072h-44.266a3.07 3.07 0 0 1-3.072-3.072z"
                  ></path>
                  <g clipPath={`url(#${id}-N)`}>
                    <path
                      stroke="#1447E6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="0.512"
                      d="M750.236 244.331v1.693l1.295.896"
                    ></path>
                    <path
                      stroke="#1447E6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="0.512"
                      d="M750.236 243.136a2.888 2.888 0 1 1 0 5.775"
                    ></path>
                    <path
                      fill="#1447E6"
                      d="M748.194 248.365a.3.3 0 1 0 0-.598.3.3 0 0 0 0 .598m-.845-2.042a.298.298 0 1 0 0-.597.298.298 0 0 0 0 .597m.845-2.043a.298.298 0 1 0 .001-.597.298.298 0 0 0-.001.597m.937 4.71a.298.298 0 1 0 .001-.597.298.298 0 0 0-.001.597m-1.563-1.563a.3.3 0 1 0 0-.598.3.3 0 0 0 0 .598m0-2.21a.3.3 0 1 0 0-.598.3.3 0 0 0 0 .598m1.563-1.562a.3.3 0 1 0 0-.598.3.3 0 0 0 0 .598"
                    ></path>
                  </g>
                  <text
                    xmlSpace="preserve"
                    fill="#1447E6"
                    fontSize="6.145"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="756.094" y="248.259">
                      Processing
                    </tspan>
                  </text>
                  <path
                    fill="#E5E5E5"
                    d="M616.293 258.669h176.673v.512H616.293z"
                  ></path>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="6.145"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.293" y="270.037">
                      $123.45
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontSize="5.633"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.293" y="278.399">
                      Jul 15, 2024
                    </tspan>
                  </text>
                  <path
                    fill="#DCFCE7"
                    d="M742.555 268.754a3.07 3.07 0 0 1 3.072-3.073h44.266a3.073 3.073 0 0 1 3.073 3.073v6.145a3.073 3.073 0 0 1-3.073 3.073h-44.266a3.07 3.07 0 0 1-3.072-3.073z"
                  ></path>
                  <g
                    stroke="#008236"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="0.512"
                    clipPath={`url(#${id}-O)`}
                  >
                    <path d="M750.236 274.715a2.888 2.888 0 1 0 0-5.776 2.888 2.888 0 0 0 0 5.776"></path>
                    <path d="m748.942 271.927.896.996 1.693-2.191"></path>
                  </g>
                  <text
                    xmlSpace="preserve"
                    fill="#008236"
                    fontSize="6.145"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="756.226" y="274.061">
                      Completed
                    </tspan>
                  </text>
                  <path
                    fill="#E5E5E5"
                    d="M616.293 284.472h176.673v.512H616.293z"
                  ></path>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="6.145"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.293" y="295.839">
                      $123.45
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontSize="5.633"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.293" y="304.201">
                      Mar 15, 2024
                    </tspan>
                  </text>
                  <path
                    fill="#DCFCE7"
                    d="M742.555 294.556a3.07 3.07 0 0 1 3.072-3.072h44.266a3.07 3.07 0 0 1 3.073 3.072v6.145a3.073 3.073 0 0 1-3.073 3.073h-44.266a3.07 3.07 0 0 1-3.072-3.073z"
                  ></path>
                  <g
                    stroke="#008236"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="0.512"
                    clipPath={`url(#${id}-P)`}
                  >
                    <path d="M750.236 300.517a2.888 2.888 0 1 0 0-5.776 2.888 2.888 0 0 0 0 5.776"></path>
                    <path d="m748.942 297.729.896.996 1.693-2.191"></path>
                  </g>
                  <text
                    xmlSpace="preserve"
                    fill="#008236"
                    fontSize="6.145"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="756.226" y="299.864">
                      Completed
                    </tspan>
                  </text>
                  <path
                    fill="#E5E5E5"
                    d="M616.293 310.274h176.673v.512H616.293z"
                  ></path>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="6.145"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.293" y="321.642">
                      $123.45
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontSize="5.633"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.293" y="330.004">
                      Mar 10, 2024
                    </tspan>
                  </text>
                  <path
                    fill="#FFE2E2"
                    d="M757.555 320.359a3.07 3.07 0 0 1 3.072-3.073h29.266a3.073 3.073 0 0 1 3.073 3.073v6.145a3.07 3.07 0 0 1-3.073 3.072h-29.266a3.07 3.07 0 0 1-3.072-3.072z"
                  ></path>
                  <g clipPath={`url(#${id}-Q)`}>
                    <path
                      stroke="#C10007"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="0.512"
                      d="M765.236 326.318a2.888 2.888 0 1 0 0-5.776 2.888 2.888 0 0 0 0 5.776m0-4.309v1.648"
                    ></path>
                    <path
                      fill="#C10007"
                      d="M765.236 325.19a.398.398 0 1 1 0-.797.398.398 0 0 1 0 .797"
                    ></path>
                  </g>
                  <text
                    xmlSpace="preserve"
                    fill="#C10007"
                    fontSize="6.145"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="771.069" y="325.666">
                      Failed
                    </tspan>
                  </text>
                </g>
                <g clipPath={`url(#${id}-R)`}>
                  <rect
                    width="196.132"
                    height="134.681"
                    x="188.951"
                    y="353.744"
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    rx="3.841"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="8.194"
                    fontWeight="600"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="198.936" y="371.209">
                      Clicks
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="9.218"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="198.936" y="385.178">
                      830
                    </tspan>
                  </text>
                  <mask
                    id={`${id}-T`}
                    width="178"
                    height="28"
                    x="198"
                    y="436"
                    maskUnits="userSpaceOnUse"
                    style={{ maskType: "alpha" }}
                  >
                    <path
                      fill={`url(#${id}-S)`}
                      d="M0 0h176.331v26.629H0z"
                      transform="translate(198.937 436.616)"
                    ></path>
                  </mask>
                  <g mask={`url(#${id}-T)`}>
                    <path
                      fill={
                        brandColor
                          ? "currentColor"
                          : `url(#${id}-color-gradient)`
                      }
                      d="m353.034 442.357-21.34 8.647a2.05 2.05 0 0 1-1.053.13l-21.285-2.974a2 2 0 0 0-.511-.007l-21.828 2.44-22.084-.617-21.648-3.327a2 2 0 0 0-.862.052l-21.499 6.008q-.159.043-.324.063l-21.92 2.45v8.023h176.673v-24.069l-21.833 3.051q-.251.035-.486.13"
                      opacity="0.2"
                    ></path>
                  </g>
                  <path
                    stroke={
                      brandColor ? "currentColor" : `url(#${id}-color-gradient)`
                    }
                    strokeLinejoin="round"
                    strokeWidth="0.768"
                    d="m198.937 455.425 22.041-3.115 21.427-5.58a3.1 3.1 0 0 1 1.241-.063l21.415 3.29 22.041.523 21.715-2.06q.327-.03.652.008l20.953 2.484a3.06 3.06 0 0 0 1.479-.189l20.993-8.194q.332-.13.686-.18l21.688-3.076"
                  ></path>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="198.937" y="477.173">
                      Jan 2024
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="346.097" y="477.173">
                      Dec 2024
                    </tspan>
                  </text>
                  <g filter={`url(#${id}-U)`}>
                    <g clipPath={`url(#${id}-V)`}>
                      <path
                        fill="#fff"
                        d="M250.914 395.48h68.62v14.194h-68.62z"
                      ></path>
                      <text
                        xmlSpace="preserve"
                        fill="#404040"
                        fontSize="5.633"
                        fontWeight="500"
                        style={{ whiteSpace: "pre" }}
                      >
                        <tspan x="255.011" y="404.625">
                          Mar 2024
                        </tspan>
                      </text>
                      <text
                        xmlSpace="preserve"
                        fill="#737373"
                        fontSize="5.633"
                        style={{ whiteSpace: "pre" }}
                      >
                        <tspan x="305.438" y="404.625">
                          143
                        </tspan>
                      </text>
                    </g>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M255.011 395.736h60.427a3.84 3.84 0 0 1 3.84 3.841v6a3.84 3.84 0 0 1-3.84 3.84h-60.427a3.84 3.84 0 0 1-3.841-3.84v-6a3.84 3.84 0 0 1 3.841-3.841Z"
                      shapeRendering="crispEdges"
                    ></path>
                  </g>
                  <rect
                    width="33.097"
                    height="11.097"
                    x="230.43"
                    y="469.734"
                    fill="#F5F5F5"
                    rx="3.073"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="232.479" y="477.517">
                      Mar 2024
                    </tspan>
                  </text>
                  <path
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    d="M244.769 395.48v68.109"
                  ></path>
                  <circle
                    cx="245.025"
                    cy="447.458"
                    r="2.817"
                    fill="currentColor"
                    stroke="#fff"
                    strokeWidth="1.024"
                  ></circle>
                  <rect
                    width="196.132"
                    height="134.681"
                    x="397.885"
                    y="353.744"
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    rx="3.841"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="8.194"
                    fontWeight="600"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="407.871" y="371.209">
                      Leads
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="9.218"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="407.871" y="385.178">
                      415
                    </tspan>
                  </text>
                  <mask
                    id={`${id}-X`}
                    width="178"
                    height="28"
                    x="407"
                    y="436"
                    maskUnits="userSpaceOnUse"
                    style={{ maskType: "alpha" }}
                  >
                    <path
                      fill={`url(#${id}-W)`}
                      d="M0 0h176.331v26.629H0z"
                      transform="translate(407.871 436.616)"
                    ></path>
                  </mask>
                  <g mask={`url(#${id}-X)`}>
                    <path
                      fill={
                        brandColor
                          ? "currentColor"
                          : `url(#${id}-color-gradient)`
                      }
                      d="m561.969 442.357-21.341 8.647c-.333.135-.696.18-1.052.13l-21.285-2.974a2 2 0 0 0-.511-.007l-21.829 2.44-22.084-.617-21.647-3.327a2 2 0 0 0-.862.052l-21.499 6.008a2 2 0 0 1-.324.063l-21.92 2.45v8.023h176.673v-24.069l-21.833 3.051q-.251.035-.486.13"
                      opacity="0.2"
                    ></path>
                  </g>
                  <path
                    stroke={
                      brandColor ? "currentColor" : `url(#${id}-color-gradient)`
                    }
                    strokeLinejoin="round"
                    strokeWidth="0.768"
                    d="m407.871 455.425 22.042-3.115 21.427-5.58a3.1 3.1 0 0 1 1.241-.063l21.414 3.29 22.042.523 21.715-2.06a3 3 0 0 1 .652.008l20.952 2.484a3.06 3.06 0 0 0 1.479-.189l20.993-8.194q.332-.13.686-.18l21.688-3.076"
                  ></path>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="407.871" y="477.173">
                      Jan 2024
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="555.032" y="477.173">
                      Dec 2024
                    </tspan>
                  </text>
                  <rect
                    width="33.097"
                    height="11.097"
                    x="439.365"
                    y="469.734"
                    fill="#F5F5F5"
                    rx="3.073"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="441.413" y="477.517">
                      Mar 2024
                    </tspan>
                  </text>
                  <g filter={`url(#${id}-Y)`}>
                    <g clipPath={`url(#${id}-Z)`}>
                      <path
                        fill="#fff"
                        d="M459.849 395.48h68.62v14.194h-68.62z"
                      ></path>
                      <text
                        xmlSpace="preserve"
                        fill="#404040"
                        fontSize="5.633"
                        fontWeight="500"
                        style={{ whiteSpace: "pre" }}
                      >
                        <tspan x="463.945" y="404.625">
                          Mar 2024
                        </tspan>
                      </text>
                      <text
                        xmlSpace="preserve"
                        fill="#737373"
                        fontSize="5.633"
                        style={{ whiteSpace: "pre" }}
                      >
                        <tspan x="516.373" y="404.625">
                          42
                        </tspan>
                      </text>
                    </g>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M463.945 395.736h60.427a3.84 3.84 0 0 1 3.841 3.841v6a3.84 3.84 0 0 1-3.841 3.84h-60.427a3.84 3.84 0 0 1-3.84-3.84v-6a3.84 3.84 0 0 1 3.84-3.841Z"
                      shapeRendering="crispEdges"
                    ></path>
                  </g>
                  <path
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    d="M453.704 395.48v68.109"
                  ></path>
                  <circle
                    cx="453.96"
                    cy="447.458"
                    r="2.817"
                    fill="currentColor"
                    stroke="#fff"
                    strokeWidth="1.024"
                  ></circle>
                  <rect
                    width="196.132"
                    height="134.681"
                    x="606.82"
                    y="353.744"
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    rx="3.841"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="8.194"
                    fontWeight="600"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.806" y="371.209">
                      Sales
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="9.218"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.806" y="385.178">
                      200
                    </tspan>
                  </text>
                  <mask
                    id={`${id}-ab`}
                    width="178"
                    height="28"
                    x="616"
                    y="436"
                    maskUnits="userSpaceOnUse"
                    style={{ maskType: "alpha" }}
                  >
                    <path
                      fill={`url(#${id}-aa)`}
                      d="M0 0h176.331v26.629H0z"
                      transform="translate(616.806 436.616)"
                    ></path>
                  </mask>
                  <g mask={`url(#${id}-ab)`}>
                    <path
                      fill={
                        brandColor
                          ? "currentColor"
                          : `url(#${id}-color-gradient)`
                      }
                      d="m770.903 442.357-21.34 8.647a2.05 2.05 0 0 1-1.053.13l-21.285-2.974a2 2 0 0 0-.511-.007l-21.828 2.44-22.084-.617-21.648-3.327a2 2 0 0 0-.862.052l-21.499 6.008q-.159.043-.324.063l-21.92 2.45v8.023h176.673v-24.069l-21.833 3.051q-.251.035-.486.13"
                      opacity="0.2"
                    ></path>
                  </g>
                  <path
                    stroke={
                      brandColor ? "currentColor" : `url(#${id}-color-gradient)`
                    }
                    strokeLinejoin="round"
                    strokeWidth="0.768"
                    d="m616.806 455.425 22.041-3.115 21.427-5.58a3.1 3.1 0 0 1 1.241-.063l21.415 3.29 22.041.523 21.715-2.06q.327-.03.652.008l20.953 2.484a3.06 3.06 0 0 0 1.479-.189l20.993-8.194q.332-.13.686-.18l21.688-3.076"
                  ></path>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="616.806" y="477.173">
                      Jan 2024
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="763.966" y="477.173">
                      Dec 2024
                    </tspan>
                  </text>
                  <rect
                    width="33.097"
                    height="11.097"
                    x="648.299"
                    y="469.734"
                    fill="#F5F5F5"
                    rx="3.073"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.145"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="650.348" y="477.517">
                      Mar 2024
                    </tspan>
                  </text>
                  <g filter={`url(#${id}-ac)`}>
                    <g clipPath={`url(#${id}-ad)`}>
                      <path
                        fill="#fff"
                        d="M668.783 395.48h68.62v14.194h-68.62z"
                      ></path>
                      <text
                        xmlSpace="preserve"
                        fill="#404040"
                        fontSize="5.633"
                        fontWeight="500"
                        style={{ whiteSpace: "pre" }}
                      >
                        <tspan x="672.88" y="404.625">
                          Mar 2024
                        </tspan>
                      </text>
                      <text
                        xmlSpace="preserve"
                        fill="#737373"
                        fontSize="5.633"
                        style={{ whiteSpace: "pre" }}
                      >
                        <tspan x="726.307" y="404.625">
                          20
                        </tspan>
                      </text>
                    </g>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M672.88 395.736h60.427a3.84 3.84 0 0 1 3.84 3.841v6a3.84 3.84 0 0 1-3.84 3.84H672.88a3.84 3.84 0 0 1-3.841-3.84v-6a3.84 3.84 0 0 1 3.841-3.841Z"
                      shapeRendering="crispEdges"
                    ></path>
                  </g>
                  <path
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    d="M662.638 395.48v68.109"
                  ></path>
                  <circle
                    cx="662.894"
                    cy="447.458"
                    r="2.817"
                    fill="currentColor"
                    stroke="#fff"
                    strokeWidth="1.024"
                  ></circle>
                </g>
                <text
                  xmlSpace="preserve"
                  fill="#171717"
                  fontSize="8.194"
                  fontWeight="600"
                  style={{ whiteSpace: "pre" }}
                >
                  <tspan x="188.695" y="519.313">
                    Recent earnings
                  </tspan>
                </text>
                <rect
                  width="36.73"
                  height="13.826"
                  x="766.222"
                  y="509.421"
                  fill="#fff"
                  rx="3.528"
                ></rect>
                <rect
                  width="36.73"
                  height="13.826"
                  x="766.222"
                  y="509.421"
                  stroke="#D4D4D4"
                  strokeWidth="0.512"
                  rx="3.528"
                ></rect>
                <text
                  xmlSpace="preserve"
                  fill="#171717"
                  fontSize="7.169"
                  fontWeight="500"
                  style={{ whiteSpace: "pre" }}
                >
                  <tspan x="771.351" y="518.562">
                    View all
                  </tspan>
                </text>
                <g clipPath={`url(#${id}-ae)`}>
                  <g clipPath={`url(#${id}-af)`}>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M188.695 531.697h83.898v22.339h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#171717"
                      fontSize="7.169"
                      fontWeight="600"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="197.267" y="545.473">
                        Date
                      </tspan>
                    </text>
                    <g
                      stroke="#525252"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="0.768"
                      clipPath={`url(#${id}-ag)`}
                    >
                      <path d="m222.964 541.77-1.394-1.394-1.394 1.394m2.788 2.19-1.394 1.394-1.394-1.394"></path>
                    </g>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M188.695 554.035h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="197.014" y="567.908">
                        Feb 4, 2025
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M188.695 576.567h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="197.014" y="590.44">
                        Feb 4, 2025
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M188.695 599.1h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="197.014" y="612.973">
                        Feb 4, 2025
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M188.695 621.632h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="197.014" y="635.505">
                        Feb 4, 2025
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M272.593 531.696h83.898v22.339h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#171717"
                      fontSize="7.169"
                      fontWeight="600"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="281.213" y="545.473">
                        Type
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M272.593 554.035h83.898v22.532h-83.898z"
                    ></path>
                    <g
                      stroke="#00BBA7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="0.768"
                      clipPath={`url(#${id}-ah)`}
                    >
                      <path d="M287.5 562.912v5.69l-1.251-.683-1.366.683-1.366-.683-1.251.683v-5.69a.91.91 0 0 1 .91-.91h3.414a.91.91 0 0 1 .91.91"></path>
                      <path d="M285.668 564.189c-.171-.402-.511-.494-.769-.494-.239 0-.868.128-.809.731.041.424.44.581.789.644.349.062.856.195.868.706.01.432-.378.727-.847.727-.449 0-.76-.175-.881-.569m.864-2.567v.328m0 2.807v.279"></path>
                    </g>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="295.281" y="567.908">
                        Sale
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M272.593 576.567h83.898v22.532h-83.898z"
                    ></path>
                    <g
                      stroke="#00BBA7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="0.768"
                      clipPath={`url(#${id}-ai)`}
                    >
                      <path d="M287.5 585.444v5.69l-1.251-.683-1.366.683-1.366-.683-1.251.683v-5.69a.91.91 0 0 1 .91-.91h3.414a.91.91 0 0 1 .91.91"></path>
                      <path d="M285.668 586.721c-.171-.403-.511-.494-.769-.494-.239 0-.868.127-.809.731.04.424.44.581.789.644.349.062.856.195.868.706.01.432-.378.727-.847.727-.449 0-.76-.175-.881-.569m.864-2.567v.328m0 2.808v.279"></path>
                    </g>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="295.281" y="590.44">
                        Sale
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M272.593 599.099h83.898v22.532h-83.898z"
                    ></path>
                    <g
                      stroke="#00BBA7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="0.768"
                      clipPath={`url(#${id}-aj)`}
                    >
                      <path d="M287.5 607.975v5.69l-1.251-.683-1.366.683-1.366-.683-1.251.683v-5.69a.91.91 0 0 1 .91-.91h3.414a.91.91 0 0 1 .91.91"></path>
                      <path d="M285.668 609.252c-.171-.403-.511-.494-.769-.494-.239 0-.868.127-.809.731.04.424.44.581.789.644.349.062.856.195.868.706.01.432-.378.727-.847.727-.449 0-.76-.175-.881-.569m.864-2.567v.328m0 2.807v.279"></path>
                    </g>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="295.281" y="612.973">
                        Sale
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M272.593 621.632h83.898v22.532h-83.898z"
                    ></path>
                    <g
                      stroke="#00BBA7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="0.768"
                      clipPath={`url(#${id}-ak)`}
                    >
                      <path d="M287.5 630.509v5.69l-1.251-.683-1.366.683-1.366-.683-1.251.683v-5.69a.91.91 0 0 1 .91-.91h3.414a.91.91 0 0 1 .91.91"></path>
                      <path d="M285.668 631.786c-.171-.402-.511-.494-.769-.494-.239 0-.868.128-.809.731.041.424.44.581.789.644.349.062.856.195.868.706.01.432-.378.727-.847.727-.449 0-.76-.175-.881-.569m.864-2.567v.328m0 2.807v.279"></path>
                    </g>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="295.281" y="635.505">
                        Sale
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M356.491 531.696h111.124v22.339H356.491z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#171717"
                      fontSize="7.169"
                      fontWeight="600"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="364.994" y="545.473">
                        Link
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M356.491 554.035h111.124v22.529H356.491z"
                    ></path>
                    <path
                      fill="#000"
                      fillRule="evenodd"
                      d="M368.779 569.394a4.094 4.094 0 0 0 2.048-7.642v5.595h-1.024v-.274a2.048 2.048 0 1 1 0-3.547v-2.193a4.096 4.096 0 1 0-1.024 8.061"
                      clipRule="evenodd"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="379.02" y="567.906">
                        {truncate(program?.domain, 12)}/stey
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M356.491 576.564h111.124v22.529H356.491z"
                    ></path>
                    <path
                      fill="#000"
                      d="M370.332 584.039a4.095 4.095 0 1 1-.529-.177v2.194a2.048 2.048 0 1 0-1.023 3.82 2.03 2.03 0 0 0 1.023-.277v.277h1.024v-5.594a4 4 0 0 0-.495-.243m-.222-.084"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="379.02" y="590.435">
                        {truncate(program?.domain, 12)}/stey
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M356.491 599.092h111.124v22.529H356.491z"
                    ></path>
                    <path
                      fill="#000"
                      d="M370.332 606.567a4.096 4.096 0 1 1-.529-.176v2.194a2.048 2.048 0 1 0-1.023 3.819c.373 0 .722-.102 1.023-.276v.276h1.024v-5.593a4 4 0 0 0-.495-.244m-.222-.084"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="379.02" y="612.964">
                        {truncate(program?.domain, 12)}/stey
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M356.491 621.621h111.124v22.529H356.491z"
                    ></path>
                    <path
                      fill="#000"
                      d="M370.332 629.096a4.096 4.096 0 1 1-.529-.177v2.195a2.048 2.048 0 1 0-1.023 3.819c.373 0 .722-.102 1.023-.276v.276h1.024v-5.594a4 4 0 0 0-.495-.243m-.222-.084"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="379.02" y="635.492">
                        {truncate(program?.domain, 12)}/stey
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M467.615 531.696h83.898v22.339h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#171717"
                      fontSize="7.169"
                      fontWeight="600"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="476.212" y="545.473">
                        Customer
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M467.615 554.035h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="475.939" y="567.908">
                        t**@dub.co
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M467.615 576.567h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="475.939" y="590.44">
                        t**@dub.co
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M467.615 599.099h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="475.969" y="612.973">
                        s****n@dub.co
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M467.615 621.632h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="475.896" y="635.505">
                        k****n@dub.co
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M551.513 531.696h83.898v22.339h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#171717"
                      fontSize="7.169"
                      fontWeight="600"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="560.153" y="545.473">
                        Sale Amount
                      </tspan>
                    </text>
                    <g
                      stroke="#525252"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="0.768"
                      clipPath={`url(#${id}-al)`}
                    >
                      <path d="m613.782 541.77-1.394-1.394-1.394 1.394m2.788 2.19-1.394 1.394-1.394-1.394"></path>
                    </g>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M551.513 554.035h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="560.029" y="567.908">
                        $15.00
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M551.513 576.567h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="560.029" y="590.44">
                        $15.00
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M551.513 599.099h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="560.029" y="612.973">
                        $15.00
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M551.513 621.632h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="560.029" y="635.505">
                        $15.00
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M635.412 531.696h83.898v22.339h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#171717"
                      fontSize="7.169"
                      fontWeight="600"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="643.937" y="545.473">
                        Earnings
                      </tspan>
                    </text>
                    <g
                      stroke="#525252"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="0.768"
                      clipPath={`url(#${id}-am)`}
                    >
                      <path d="m683.681 541.77-1.395-1.394-1.394 1.394m2.788 2.19-1.394 1.394-1.394-1.394"></path>
                    </g>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M635.412 554.035h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="643.836" y="567.908">
                        $10.00
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M635.412 576.567h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="643.836" y="590.44">
                        $10.00
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M635.412 599.099h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="643.836" y="612.973">
                        $10.00
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M635.412 621.632h83.898v22.532h-83.898z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#525252"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="643.836" y="635.505">
                        $10.00
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M719.31 531.696h83.898v22.339H719.31z"
                    ></path>
                    <text
                      xmlSpace="preserve"
                      fill="#171717"
                      fontSize="7.169"
                      fontWeight="600"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="727.745" y="545.473">
                        Status
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M719.31 554.035h83.898v22.532H719.31z"
                    ></path>
                    <rect
                      width="37.194"
                      height="12.29"
                      x="727.503"
                      y="559.156"
                      fill="#FFEDD4"
                      rx="3.073"
                    ></rect>
                    <text
                      xmlSpace="preserve"
                      fill="#CA3500"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="732.094" y="567.908">
                        Pending
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M719.31 576.567h83.898v22.532H719.31z"
                    ></path>
                    <rect
                      width="23.194"
                      height="12.29"
                      x="727.503"
                      y="581.688"
                      fill="#DCFCE7"
                      rx="3.073"
                    ></rect>
                    <text
                      xmlSpace="preserve"
                      fill="#008236"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="731.647" y="590.44">
                        Paid
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M719.31 599.099h83.898v22.532H719.31z"
                    ></path>
                    <rect
                      width="23.194"
                      height="12.29"
                      x="727.503"
                      y="604.22"
                      fill="#DCFCE7"
                      rx="3.073"
                    ></rect>
                    <text
                      xmlSpace="preserve"
                      fill="#008236"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="731.647" y="612.973">
                        Paid
                      </tspan>
                    </text>
                    <path
                      stroke="#E5E5E5"
                      strokeWidth="0.512"
                      d="M719.31 621.632h83.898v22.532H719.31z"
                    ></path>
                    <rect
                      width="28.194"
                      height="12.29"
                      x="727.503"
                      y="626.752"
                      fill="#FFE2E2"
                      rx="3.073"
                    ></rect>
                    <text
                      xmlSpace="preserve"
                      fill="#C10007"
                      fontSize="7.169"
                      fontWeight="500"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="731.749" y="635.505">
                        Fraud
                      </tspan>
                    </text>
                  </g>
                  <path
                    stroke="#E5E5E5"
                    strokeWidth="0.512"
                    d="M188.695 536.818a5.12 5.12 0 0 1 5.121-5.121h604.271a5.12 5.12 0 0 1 5.121 5.121v107.346H188.695zm0 107.346h614.513v28.677H188.695z"
                  ></path>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="6.657"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="196.888" y="660.923">
                      Viewing 1-100 of 3,159 earnings
                    </tspan>
                  </text>
                  <rect
                    width="39.73"
                    height="13.826"
                    x="723.69"
                    y="651.589"
                    fill="#F5F5F5"
                    rx="3.528"
                  ></rect>
                  <rect
                    width="39.73"
                    height="13.826"
                    x="723.69"
                    y="651.589"
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    rx="3.528"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#A1A1A1"
                    fontSize="7.169"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="728.772" y="660.73">
                      Previous
                    </tspan>
                  </text>
                  <rect
                    width="26.73"
                    height="13.826"
                    x="768.029"
                    y="651.589"
                    fill="#fff"
                    rx="3.528"
                  ></rect>
                  <rect
                    width="26.73"
                    height="13.826"
                    x="768.029"
                    y="651.589"
                    stroke="#D4D4D4"
                    strokeWidth="0.512"
                    rx="3.528"
                  ></rect>
                  <text
                    xmlSpace="preserve"
                    fill="#171717"
                    fontSize="7.169"
                    fontWeight="500"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="773.349" y="660.73">
                      Next
                    </tspan>
                  </text>
                </g>
                <rect
                  width="614.001"
                  height="140.632"
                  x="188.951"
                  y="531.953"
                  stroke="#E5E5E5"
                  strokeWidth="0.512"
                  rx="5.889"
                ></rect>
              </g>
              <path
                stroke="#E5E5E5"
                strokeWidth="0.512"
                d="M868.756 4.612v684.872H123.147V13.062a8.45 8.45 0 0 1 8.449-8.45z"
              ></path>
            </g>
            <defs>
              <pattern
                xmlns="http://www.w3.org/2000/svg"
                id={`${id}-smallGrid`}
                width="10.2425"
                height="10.2425"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 10.2425 0 L 0 0 0 10.2425"
                  fill="none"
                  stroke="#0004"
                  strokeWidth="0.5"
                />
              </pattern>
              <pattern
                xmlns="http://www.w3.org/2000/svg"
                id={`${id}-grid`}
                width="81.94"
                height="81.94"
                patternUnits="userSpaceOnUse"
                x="-6"
                y="-3"
              >
                <rect
                  width="81.94"
                  height="81.94"
                  fill={`url(#${id}-smallGrid)`}
                />
                <path
                  d="M 81.94 0 L 0 0 0 81.94"
                  fill="none"
                  stroke="#0001"
                  strokeWidth="1"
                />
              </pattern>
              <clipPath id={`${id}-a`}>
                <path fill="#fff" d="M.5.771h868v688.457H.5z"></path>
              </clipPath>
              <clipPath id={`${id}-b`}>
                <use
                  xlinkHref={`#${id}-an`}
                  transform="translate(90.629 8.965)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-c`}>
                <path
                  fill="#fff"
                  d="M104.967 13.062a6.146 6.146 0 1 1 12.291 0 6.146 6.146 0 0 1-12.291 0"
                ></path>
              </clipPath>
              <clipPath id={`${id}-d`}>
                <rect
                  width="16.387"
                  height="16.387"
                  x="9.718"
                  y="36.376"
                  fill="#fff"
                  rx="8.194"
                ></rect>
              </clipPath>
              <clipPath id={`${id}-e`}>
                <path
                  fill="#fff"
                  d="M105.991 41.497h6.145v6.145h-6.145z"
                ></path>
              </clipPath>
              <clipPath id={`${id}-f`}>
                <path
                  fill="#fff"
                  d="M6.645 68.908a3.073 3.073 0 0 1 3.073-3.072h104.467a3.073 3.073 0 0 1 3.073 3.072v9.218a3.073 3.073 0 0 1-3.073 3.073H9.718a3.073 3.073 0 0 1-3.073-3.073z"
                ></path>
              </clipPath>
              <clipPath id={`${id}-g`}>
                <use
                  xlinkHref={`#${id}-an`}
                  transform="translate(10.742 69.42)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-h`}>
                <use
                  xlinkHref={`#${id}-an`}
                  transform="translate(10.742 84.783)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-i`}>
                <use
                  xlinkHref={`#${id}-an`}
                  transform="translate(10.742 100.146)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-j`}>
                <use
                  xlinkHref={`#${id}-an`}
                  transform="translate(10.742 115.509)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-l`}>
                <use
                  xlinkHref={`#${id}-ao`}
                  transform="translate(8.694 618.724)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-m`}>
                <path fill="#fff" d="M44.984 620.26h4.097v4.097h-4.097z"></path>
              </clipPath>
              <clipPath id={`${id}-n`}>
                <use xlinkHref={`#${id}-o`}></use>
              </clipPath>
              <clipPath id={`${id}-p`}>
                <rect
                  width="614.513"
                  height="131.491"
                  x="188.695"
                  y="54.029"
                  fill="#fff"
                  rx="4.097"
                ></rect>
              </clipPath>
              <clipPath id={`${id}-q`}>
                <use
                  xlinkHref={`#${id}-an`}
                  transform="translate(383.113 91.61)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-v`}>
                <path
                  fill="#fff"
                  d="M654.701 73.976h10.242v10.242H654.7z"
                ></path>
              </clipPath>
              <clipPath id={`${id}-y`}>
                <path
                  fill="#fff"
                  d="M777.091 155.398h11.266v11.266h-11.266z"
                ></path>
              </clipPath>
              <clipPath id={`${id}-F`}>
                <use
                  xlinkHref={`#${id}-ap`}
                  transform="translate(188.695 206.005)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-K`}>
                <path
                  fill="#fff"
                  d="M250.914 252.093a4.097 4.097 0 0 1 4.097-4.097h60.427a4.097 4.097 0 0 1 4.097 4.097v6a4.096 4.096 0 0 1-4.097 4.096h-60.427a4.096 4.096 0 0 1-4.097-4.096z"
                ></path>
              </clipPath>
              <clipPath id={`${id}-L`}>
                <use
                  xlinkHref={`#${id}-an`}
                  transform="translate(512.147 219.319)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-M`}>
                <path fill="#fff" d="M573.534 220.856h5.12v5.12h-5.12z"></path>
              </clipPath>
              <clipPath id={`${id}-N`}>
                <use
                  xlinkHref={`#${id}-ao`}
                  transform="translate(746.652 242.44)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-O`}>
                <use
                  xlinkHref={`#${id}-ao`}
                  transform="translate(746.652 268.242)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-P`}>
                <use
                  xlinkHref={`#${id}-ao`}
                  transform="translate(746.652 294.044)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-Q`}>
                <use
                  xlinkHref={`#${id}-ao`}
                  transform="translate(761.652 319.847)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-R`}>
                <use
                  xlinkHref={`#${id}-ap`}
                  transform="translate(188.695 353.488)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-V`}>
                <path
                  fill="#fff"
                  d="M250.914 399.577a4.097 4.097 0 0 1 4.097-4.097h60.427a4.097 4.097 0 0 1 4.097 4.097v6a4.096 4.096 0 0 1-4.097 4.096h-60.427a4.096 4.096 0 0 1-4.097-4.096z"
                ></path>
              </clipPath>
              <clipPath id={`${id}-Z`}>
                <path
                  fill="#fff"
                  d="M459.849 399.577a4.096 4.096 0 0 1 4.096-4.097h60.428a4.096 4.096 0 0 1 4.096 4.097v6a4.096 4.096 0 0 1-4.096 4.096h-60.428a4.096 4.096 0 0 1-4.096-4.096z"
                ></path>
              </clipPath>
              <clipPath id={`${id}-ad`}>
                <path
                  fill="#fff"
                  d="M668.783 399.577a4.097 4.097 0 0 1 4.097-4.097h60.427a4.097 4.097 0 0 1 4.097 4.097v6a4.096 4.096 0 0 1-4.097 4.096H672.88a4.096 4.096 0 0 1-4.097-4.096z"
                ></path>
              </clipPath>
              <clipPath id={`${id}-ae`}>
                <rect
                  width="614.513"
                  height="141.145"
                  x="188.695"
                  y="531.697"
                  fill="#fff"
                  rx="6.145"
                ></rect>
              </clipPath>
              <clipPath id={`${id}-af`}>
                <path
                  fill="#fff"
                  d="M188.695 536.818a5.12 5.12 0 0 1 5.121-5.121h604.271a5.12 5.12 0 0 1 5.121 5.121v107.346H188.695z"
                ></path>
              </clipPath>
              <clipPath id={`${id}-ag`}>
                <use
                  xlinkHref={`#${id}-ao`}
                  transform="translate(217.985 539.281)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-ah`}>
                <use
                  xlinkHref={`#${id}-an`}
                  transform="translate(280.786 561.205)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-ai`}>
                <use
                  xlinkHref={`#${id}-an`}
                  transform="translate(280.786 583.737)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-aj`}>
                <use
                  xlinkHref={`#${id}-an`}
                  transform="translate(280.786 606.269)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-ak`}>
                <use
                  xlinkHref={`#${id}-an`}
                  transform="translate(280.786 628.801)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-al`}>
                <use
                  xlinkHref={`#${id}-ao`}
                  transform="translate(608.804 539.281)"
                ></use>
              </clipPath>
              <clipPath id={`${id}-am`}>
                <use
                  xlinkHref={`#${id}-ao`}
                  transform="translate(678.702 539.281)"
                ></use>
              </clipPath>
              <filter
                id={`${id}-t`}
                width="20.868"
                height="20.868"
                x="649.388"
                y="68.663"
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                <feBlend
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                ></feBlend>
                <feColorMatrix
                  in="SourceAlpha"
                  result="hardAlpha"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                ></feColorMatrix>
                <feOffset></feOffset>
                <feGaussianBlur stdDeviation="3.073"></feGaussianBlur>
                <feComposite
                  in2="hardAlpha"
                  k2="-1"
                  k3="1"
                  operator="arithmetic"
                ></feComposite>
                <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"></feColorMatrix>
                <feBlend
                  in2="shape"
                  result="effect1_innerShadow_1_1135"
                ></feBlend>
              </filter>
              <filter
                id={`${id}-w`}
                width="20.868"
                height="20.868"
                x="772.29"
                y="150.597"
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                <feBlend
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                ></feBlend>
                <feColorMatrix
                  in="SourceAlpha"
                  result="hardAlpha"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                ></feColorMatrix>
                <feOffset></feOffset>
                <feGaussianBlur stdDeviation="3.073"></feGaussianBlur>
                <feComposite
                  in2="hardAlpha"
                  k2="-1"
                  k3="1"
                  operator="arithmetic"
                ></feComposite>
                <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"></feColorMatrix>
                <feBlend
                  in2="shape"
                  result="effect1_innerShadow_1_1135"
                ></feBlend>
              </filter>
              <filter
                id={`${id}-z`}
                width="82.319"
                height="82.319"
                x="680.113"
                y="78.904"
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                <feBlend
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                ></feBlend>
                <feColorMatrix
                  in="SourceAlpha"
                  result="hardAlpha"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                ></feColorMatrix>
                <feOffset></feOffset>
                <feGaussianBlur stdDeviation="3.073"></feGaussianBlur>
                <feComposite
                  in2="hardAlpha"
                  k2="-1"
                  k3="1"
                  operator="arithmetic"
                ></feComposite>
                <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"></feColorMatrix>
                <feBlend
                  in2="shape"
                  result="effect1_innerShadow_1_1135"
                ></feBlend>
              </filter>
              <filter
                id={`${id}-B`}
                width="74.766"
                height="74.766"
                x="683.89"
                y="82.68"
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                <feBlend
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                ></feBlend>
                <feGaussianBlur
                  result="effect1_foregroundBlur_1_1135"
                  stdDeviation="7.681"
                ></feGaussianBlur>
              </filter>
              <filter
                id={`${id}-D`}
                width="403.018"
                height="419.917"
                x="521.044"
                y="-89.892"
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                <feBlend
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                ></feBlend>
                <feGaussianBlur
                  result="effect1_foregroundBlur_1_1135"
                  stdDeviation="25.605"
                ></feGaussianBlur>
              </filter>
              <filter
                id={`${id}-E`}
                width="423.502"
                height="363.18"
                x="510.803"
                y="-52.361"
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                <feBlend
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                ></feBlend>
                <feGaussianBlur
                  result="effect1_foregroundBlur_1_1135"
                  stdDeviation="30.726"
                ></feGaussianBlur>
              </filter>
              <filter
                id={`${id}-J`}
                width="71.693"
                height="17.266"
                x="249.378"
                y="247.996"
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                <feColorMatrix
                  in="SourceAlpha"
                  result="hardAlpha"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                ></feColorMatrix>
                <feOffset dy="1.536"></feOffset>
                <feGaussianBlur stdDeviation="0.768"></feGaussianBlur>
                <feComposite in2="hardAlpha" operator="out"></feComposite>
                <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"></feColorMatrix>
                <feBlend
                  in2="BackgroundImageFix"
                  result="effect1_dropShadow_1_1135"
                ></feBlend>
                <feBlend
                  in="SourceGraphic"
                  in2="effect1_dropShadow_1_1135"
                  result="shape"
                ></feBlend>
              </filter>
              <filter
                id={`${id}-U`}
                width="71.693"
                height="17.266"
                x="249.378"
                y="395.48"
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                <feColorMatrix
                  in="SourceAlpha"
                  result="hardAlpha"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                ></feColorMatrix>
                <feOffset dy="1.536"></feOffset>
                <feGaussianBlur stdDeviation="0.768"></feGaussianBlur>
                <feComposite in2="hardAlpha" operator="out"></feComposite>
                <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"></feColorMatrix>
                <feBlend
                  in2="BackgroundImageFix"
                  result="effect1_dropShadow_1_1135"
                ></feBlend>
                <feBlend
                  in="SourceGraphic"
                  in2="effect1_dropShadow_1_1135"
                  result="shape"
                ></feBlend>
              </filter>
              <filter
                id={`${id}-Y`}
                width="71.693"
                height="17.266"
                x="458.312"
                y="395.48"
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                <feColorMatrix
                  in="SourceAlpha"
                  result="hardAlpha"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                ></feColorMatrix>
                <feOffset dy="1.536"></feOffset>
                <feGaussianBlur stdDeviation="0.768"></feGaussianBlur>
                <feComposite in2="hardAlpha" operator="out"></feComposite>
                <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"></feColorMatrix>
                <feBlend
                  in2="BackgroundImageFix"
                  result="effect1_dropShadow_1_1135"
                ></feBlend>
                <feBlend
                  in="SourceGraphic"
                  in2="effect1_dropShadow_1_1135"
                  result="shape"
                ></feBlend>
              </filter>
              <filter
                id={`${id}-ac`}
                width="71.693"
                height="17.266"
                x="667.247"
                y="395.48"
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                <feColorMatrix
                  in="SourceAlpha"
                  result="hardAlpha"
                  values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                ></feColorMatrix>
                <feOffset dy="1.536"></feOffset>
                <feGaussianBlur stdDeviation="0.768"></feGaussianBlur>
                <feComposite in2="hardAlpha" operator="out"></feComposite>
                <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"></feColorMatrix>
                <feBlend
                  in2="BackgroundImageFix"
                  result="effect1_dropShadow_1_1135"
                ></feBlend>
                <feBlend
                  in="SourceGraphic"
                  in2="effect1_dropShadow_1_1135"
                  result="shape"
                ></feBlend>
              </filter>
              <linearGradient
                id={`${id}-u`}
                x1="659.821"
                x2="659.821"
                y1="89.338"
                y2="68.855"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#fff" stopOpacity="0.23"></stop>
                <stop offset="1" stopColor="#fff" stopOpacity="0.3"></stop>
              </linearGradient>
              <linearGradient
                id={`${id}-x`}
                x1="782.724"
                x2="782.724"
                y1="171.273"
                y2="150.789"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#fff" stopOpacity="0.23"></stop>
                <stop offset="1" stopColor="#fff" stopOpacity="0.3"></stop>
              </linearGradient>
              <linearGradient
                id={`${id}-A`}
                x1="721.273"
                x2="721.273"
                y1="161.031"
                y2="79.096"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#fff" stopOpacity="1"></stop>
                <stop offset="1" stopColor="#fff" stopOpacity="1"></stop>
              </linearGradient>
              <linearGradient
                id={`${id}-C`}
                x1="465.996"
                x2="687.415"
                y1="119.59"
                y2="-17.134"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#FAFAFA"></stop>
                <stop offset="1" stopColor="#FAFAFA" stopOpacity="0"></stop>
              </linearGradient>
              <linearGradient
                id={`${id}-G`}
                x1="192.377"
                x2="192.377"
                y1="0"
                y2="26.629"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.2" stopColor="#fff"></stop>
                <stop offset="0.955" stopColor="#fff" stopOpacity="0"></stop>
              </linearGradient>
              <linearGradient
                id={`${id}-S`}
                x1="88.166"
                x2="88.166"
                y1="0"
                y2="26.629"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.2" stopColor="#fff"></stop>
                <stop offset="0.955" stopColor="#fff" stopOpacity="0"></stop>
              </linearGradient>
              <linearGradient
                id={`${id}-W`}
                x1="88.166"
                x2="88.166"
                y1="0"
                y2="26.629"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.2" stopColor="#fff"></stop>
                <stop offset="0.955" stopColor="#fff" stopOpacity="0"></stop>
              </linearGradient>
              <linearGradient
                id={`${id}-aa`}
                x1="88.166"
                x2="88.166"
                y1="0"
                y2="26.629"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.2" stopColor="#fff"></stop>
                <stop offset="0.955" stopColor="#fff" stopOpacity="0"></stop>
              </linearGradient>
              <radialGradient
                id={`${id}-r`}
                cx="0"
                cy="0"
                r="1"
                gradientTransform="rotate(90 300.349 420.668)scale(81.6791)"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0.73" stopColor="#fff"></stop>
                <stop offset="1" stopColor="#fff" stopOpacity="0"></stop>
              </radialGradient>
              <linearGradient
                id={`${id}-aq`}
                x1="188"
                x2="700"
                y1="410"
                y2="25.44"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#FAFAFA" />
                <stop offset="0.489" stopColor="#FAFAFA" />
                <stop offset="1" stopColor="#FAFAFA" stopOpacity="0" />
              </linearGradient>
              {/* Rainbow chart line gradient */}
              <linearGradient
                id={`${id}-color-gradient`}
                x1="0"
                x2="1"
                gradientUnits="objectBoundingBox"
              >
                <stop offset="0%" stopColor="#7D3AEC" stopOpacity="1"></stop>
                <stop offset="100%" stopColor="#DA2778" stopOpacity="1"></stop>
              </linearGradient>
            </defs>
          </svg>
        </div>
      </PreviewWindow>
    </div>
  );
}
