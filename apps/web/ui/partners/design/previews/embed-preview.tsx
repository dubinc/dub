"use client";

import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import { ProgramWithLanderDataProps } from "@/lib/types";
import { OG_AVATAR_URL } from "@dub/utils";
import { CSSProperties, useId } from "react";
import { useWatch } from "react-hook-form";
import { useBrandingFormContext } from "../branding-form";
import { PreviewWindow } from "../preview-window";
import { StudsPattern } from "../studs-pattern";

export function EmbedPreview({
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
    <div className="scrollbar-hide @container -mx-2 h-full w-auto overflow-y-auto px-2 pb-4">
      <PreviewWindow
        url={program.url!}
        showViewButton={false}
        className="h-auto rounded-b-xl bg-neutral-100"
        contentClassName="overflow-y-hidden"
      >
        <div className="@[800px]:p-16 @[800px]:gap-12 grid grid-cols-[minmax(0,1fr)_minmax(0,5fr)] gap-8 p-8">
          <div>
            <img
              className="@[800px]:size-11 size-6"
              src={program.logo || `${OG_AVATAR_URL}${program.name}`}
            />
            <div className="@[800px]:mt-6 @[800px]:gap-4 mt-4 flex flex-col gap-2">
              {[100, 90, 70, 80, 65].map((p, idx) => (
                <div
                  key={idx}
                  className="h-4 rounded bg-neutral-200"
                  style={{ width: `${p}%` }}
                />
              ))}
            </div>
          </div>
          <div
            className="relative z-0 mx-auto w-full select-none text-[var(--brand)]"
            style={
              {
                "--brand": brandColor || "#000000",
              } as CSSProperties
            }
            role="presentation"
          >
            <div className="relative rounded-xl bg-neutral-100">
              <StudsPattern />
              {/* Inner shadow on top of studs */}
              <div className="absolute inset-0 overflow-hidden rounded-xl shadow-[0_12px_20px_0_#00000026_inset,0_2px_5px_0_#00000026_inset,0_2px_13px_2px_#FFFFFF59]" />

              <div className="@[800px]:-translate-y-10 @[800px]:translate-x-10 [@media(min-resolution:2dppx)]:@[800px]:rotate-[2.4deg] relative overflow-hidden rounded-xl border border-black/10 bg-white drop-shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  fill="none"
                  viewBox="0 0 1031 898"
                  className="h-auto w-full [&_*]:tracking-[-0.035em]"
                >
                  <defs>
                    <path id={`${id}-N`} fill="#fff" d="M0 0h16v16H0z" />
                  </defs>
                  <path fill="#fff" d="M.5.5h1030v897H.5z" />
                  <g clipPath={`url(#${id}-a)`}>
                    {/* Hero background */}
                    <rect
                      width="983"
                      height="258"
                      x="24"
                      y="24"
                      fill="#FAFAFA"
                      rx="8"
                    />
                    {/* Grid */}
                    <rect
                      xmlns="http://www.w3.org/2000/svg"
                      width="983"
                      height="258"
                      x="24"
                      y="24"
                      opacity="0.5"
                      fill={`url(#${id}-grid)`}
                    />
                    {/* Grid gradient cover */}
                    <path fill={`url(#${id}-aq)`} d="M24 24h983v258H24z" />
                    <text
                      xmlSpace="preserve"
                      fill="#262626"
                      fontSize="16"
                      fontWeight="600"
                      letterSpacing="-.02em"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="48" y="65.818">
                        Referral link
                      </tspan>
                    </text>
                    <rect
                      width="283"
                      height="39"
                      x="48.5"
                      y="84.5"
                      fill="#fff"
                      rx="5.5"
                    />
                    <rect
                      width="283"
                      height="39"
                      x="48.5"
                      y="84.5"
                      stroke="#D4D4D4"
                      rx="5.5"
                    />
                    <text
                      xmlSpace="preserve"
                      fill="#262626"
                      fontSize="14"
                      fontWeight="500"
                      letterSpacing="0em"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="60" y="109.091">
                        {partnerLink}
                      </tspan>
                    </text>
                    <path
                      fill="#171717"
                      d="M344 90a6 6 0 0 1 6-6h108a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H350a6 6 0 0 1-6-6z"
                    />
                    <path
                      stroke="#fff"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M364.222 106.889h-.889a1.777 1.777 0 0 1-1.777-1.778v-4.889c0-.982.795-1.777 1.777-1.777H370c.982 0 1.778.795 1.778 1.777v.889m.889 8.445H366a1.78 1.78 0 0 1-1.778-1.778v-4.889c0-.982.796-1.778 1.778-1.778h6.667c.981 0 1.777.796 1.777 1.778v4.889c0 .982-.796 1.778-1.777 1.778"
                    />
                    <text
                      xmlSpace="preserve"
                      fill="#fff"
                      fontSize="14"
                      fontWeight="500"
                      letterSpacing="-.02em"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="384.482" y="109.091">
                        Copy link
                      </tspan>
                    </text>
                    <text
                      xmlSpace="preserve"
                      fill="#262626"
                      fontSize="16"
                      fontWeight="600"
                      letterSpacing="-.02em"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="48" y="189.818">
                        Rewards
                      </tspan>
                    </text>
                    <path
                      fill="#fff"
                      d="M54 208.5h404a5.5 5.5 0 0 1 5.5 5.5v38a5.5 5.5 0 0 1-5.5 5.5H54a5.5 5.5 0 0 1-5.5-5.5v-38a5.5 5.5 0 0 1 5.5-5.5"
                    />
                    <path
                      stroke="#E5E5E5"
                      d="M54 208.5h404a5.5 5.5 0 0 1 5.5 5.5v38a5.5 5.5 0 0 1-5.5 5.5H54a5.5 5.5 0 0 1-5.5-5.5v-38a5.5 5.5 0 0 1 5.5-5.5Z"
                    />
                    <text
                      xmlSpace="preserve"
                      fill="#999"
                      fontSize="16"
                      fontWeight="600"
                      letterSpacing="-.02em"
                      style={{ whiteSpace: "pre" }}
                    >
                      <tspan x="62" y="234">
                        ...
                      </tspan>
                    </text>
                    <g filter={`url(#${id}-b)`}>
                      <rect
                        width="108.522"
                        height="21"
                        x="882.885"
                        y="245"
                        fill="#fff"
                        rx="6"
                      />
                      <text
                        xmlSpace="preserve"
                        fill="#737373"
                        fontSize="11.54"
                        fontWeight="500"
                        letterSpacing="0em"
                        style={{ whiteSpace: "pre" }}
                      >
                        <tspan x="890.901" y="259.696">
                          Powered by
                        </tspan>
                      </text>
                      <path
                        fill="#171717"
                        fillRule="evenodd"
                        d="M964.749 250.091h1.599v10.277h-1.599v-.678a3.68 3.68 0 0 1-2.132.678c-2.061 0-3.732-1.695-3.732-3.786s1.671-3.787 3.732-3.787c.792 0 1.527.251 2.132.679zm-2.133 8.655c1.178 0 2.133-.969 2.133-2.164s-.955-2.164-2.133-2.164-2.132.969-2.132 2.164.955 2.164 2.132 2.164m13.328-8.655h1.599v3.383a3.7 3.7 0 0 1 2.133-.679c2.061 0 3.731 1.696 3.731 3.787s-1.67 3.786-3.731 3.786-3.732-1.695-3.732-3.786zm3.731 8.655c1.178 0 2.133-.969 2.133-2.164s-.955-2.164-2.133-2.164-2.132.969-2.132 2.164.955 2.164 2.132 2.164"
                        clipRule="evenodd"
                      />
                      <path
                        fill="#171717"
                        d="M969.014 252.795h-1.6v3.787a3.803 3.803 0 0 0 1.093 2.677 3.69 3.69 0 0 0 5.278 0 3.8 3.8 0 0 0 1.093-2.677v-3.787h-1.6v3.787a2.18 2.18 0 0 1-.624 1.53c-.4.406-.943.634-1.508.634a2.12 2.12 0 0 1-1.508-.634 2.18 2.18 0 0 1-.624-1.53z"
                      />
                    </g>
                    <mask
                      id={`${id}-d`}
                      width="319"
                      height="319"
                      x="685"
                      y="-6"
                      maskUnits="userSpaceOnUse"
                      style={{ maskType: "alpha" }}
                    >
                      <circle
                        cx="844.5"
                        cy="153.5"
                        r="159.5"
                        fill={`url(#${id}-c)`}
                      />
                    </mask>
                    <g mask={`url(#${id}-d)`}>
                      <g filter={`url(#${id}-e)`}>
                        <rect
                          width="40"
                          height="40"
                          x="705"
                          y="53"
                          fill={`url(#${id}-f)`}
                          rx="8"
                        />
                        <rect
                          width="40"
                          height="40"
                          x="705"
                          y="53"
                          stroke="#000"
                          strokeOpacity="0.06"
                          strokeWidth="0.75"
                          rx="8"
                        />
                        <g
                          stroke="#737373"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          opacity="0.2"
                        >
                          <path d="M725 75.222a2.222 2.222 0 1 0 0-4.444 2.222 2.222 0 0 0 0 4.444" />
                          <path d="M716.944 78.278V67.722c2.663 1.194 5.076 1.357 8.056 0s5.393-1.389 8.056 0v10.556c-2.663-1.39-5.076-1.357-8.056 0s-5.393 1.193-8.056 0" />
                        </g>
                      </g>
                      <g filter={`url(#${id}-g)`}>
                        <rect
                          width="40"
                          height="40"
                          x="945"
                          y="213"
                          fill={`url(#${id}-h)`}
                          rx="8"
                        />
                        <rect
                          width="40"
                          height="40"
                          x="945"
                          y="213"
                          stroke="#000"
                          strokeOpacity="0.06"
                          strokeWidth="0.75"
                          rx="8"
                        />
                        <g
                          stroke="#737373"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          opacity="0.2"
                        >
                          <path d="M965 233.917a2.445 2.445 0 1 0-.001-4.89 2.445 2.445 0 0 0 .001 4.89m-4.735 6.722a4.89 4.89 0 0 1 4.735-3.667 4.89 4.89 0 0 1 4.735 3.667" />
                          <path d="M972.639 232.389v5.805a2.444 2.444 0 0 1-2.445 2.445h-10.388a2.444 2.444 0 0 1-2.445-2.445v-10.388a2.444 2.444 0 0 1 2.445-2.445h5.805m6.417-2.444v6.111m3.055-3.056h-6.111" />
                        </g>
                      </g>
                      <g filter={`url(#${id}-i)`}>
                        <path
                          fill={`url(#${id}-j)`}
                          d="M767 89c0-8.837 7.163-16 16-16h128c8.837 0 16 7.163 16 16v128c0 8.837-7.163 16-16 16H783c-8.837 0-16-7.163-16-16z"
                        />
                      </g>
                      <path
                        stroke="#000"
                        strokeOpacity="0.06"
                        strokeWidth="0.75"
                        d="M767 89c0-8.837 7.163-16 16-16h128c8.837 0 16 7.163 16 16v128c0 8.837-7.163 16-16 16H783c-8.837 0-16-7.163-16-16z"
                      />
                      <g filter={`url(#${id}-k)`}>
                        {/* Big logo */}
                        <image
                          width="80"
                          height="80"
                          x="807"
                          y="113"
                          href={logo || `${OG_AVATAR_URL}${program.name}`}
                          clipPath="inset(0% round 80px)"
                        />
                      </g>
                    </g>
                    <g
                      filter={`url(#${id}-n)`}
                      opacity="0.5"
                      style={{ mixBlendMode: "soft-light" }}
                    >
                      {brandColor && (
                        <ellipse
                          cx="847"
                          cy="153"
                          fill="currentColor"
                          rx="293.5"
                          ry="310"
                        />
                      )}
                    </g>
                    <g filter={`url(#${id}-o)`} opacity="0.15">
                      {brandColor ? (
                        <ellipse
                          cx="847"
                          cy="153"
                          fill="currentColor"
                          opacity="0.7"
                          rx="293.5"
                          ry="234.602"
                        />
                      ) : (
                        <foreignObject width="400" height="400" x="647" y="-47">
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
                    width="982"
                    height="257"
                    x="24.5"
                    y="24.5"
                    stroke="#E5E5E5"
                    rx="7.5"
                  />
                  <rect
                    width="666"
                    height="111"
                    x="24.5"
                    y="298.5"
                    fill="#fff"
                    rx="7.5"
                  />
                  <rect
                    width="666"
                    height="111"
                    x="24.5"
                    y="298.5"
                    stroke="#E5E5E5"
                    rx="7.5"
                  />
                  <mask id={`${id}-p`} fill="#fff">
                    <path d="M24 298h222.333v112H24z" />
                  </mask>
                  <path
                    fill="#E5E5E5"
                    d="M246.333 298h-1v112h2V298z"
                    mask={`url(#${id}-p)`}
                  />
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontSize="13"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="40" y="325.727">
                      Clicks
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#404040"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="40" y="344.591">
                      123
                    </tspan>
                  </text>
                  <mask
                    id={`${id}-r`}
                    width="191"
                    height="52"
                    x="40"
                    y="348"
                    maskUnits="userSpaceOnUse"
                    style={{ maskType: "alpha" }}
                  >
                    <path
                      fill={`url(#${id}-q)`}
                      d="M0 0h190.333v52H0z"
                      transform="translate(40 348)"
                    />
                  </mask>
                  <g mask={`url(#${id}-r)`}>
                    <path
                      fill={
                        brandColor
                          ? "currentColor"
                          : `url(#${id}-color-gradient)`
                      }
                      d="M206.625 359.026 182.75 376.5l-23.875-6.026L135 375.295l-23.875-1.205-23.875-6.628-23.875 12.051-23.875 4.82V400h191v-47z"
                      opacity="0.15"
                    />
                  </g>
                  <path
                    stroke={
                      brandColor ? "currentColor" : `url(#${id}-color-gradient)`
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="m40 384.729 23.7-6.06a1 1 0 0 0 .178-.064l23.37-11.009c.216-.102.462-.123.693-.059l23.324 6.484a1 1 0 0 0 .225.036l23.57 1.011q.107.005.212-.013l23.496-4.033q.19-.032.379.008l23.174 4.972c.274.058.559 0 .787-.161l23.283-16.443q.151-.106.329-.152l23.613-6.058"
                  />
                  <mask id={`${id}-s`} fill="#fff">
                    <path d="M246.333 298h222.334v112H246.333z" />
                  </mask>
                  <path
                    fill="#E5E5E5"
                    d="M468.667 298h-1v112h2V298z"
                    mask={`url(#${id}-s)`}
                  />
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontSize="13"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="262.333" y="325.727">
                      Leads
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#404040"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="262.333" y="344.591">
                      23
                    </tspan>
                  </text>
                  <mask
                    id={`${id}-u`}
                    width="191"
                    height="52"
                    x="262"
                    y="348"
                    maskUnits="userSpaceOnUse"
                    style={{ maskType: "alpha" }}
                  >
                    <path
                      fill={`url(#${id}-t)`}
                      d="M0 0h190.333v52H0z"
                      transform="translate(262.333 348)"
                    />
                  </mask>
                  <g mask={`url(#${id}-u)`}>
                    <path
                      fill={
                        brandColor
                          ? "currentColor"
                          : `url(#${id}-color-gradient)`
                      }
                      d="M428.958 359.026 405.083 376.5l-23.875-6.026-23.875 4.821-23.875-1.205-23.875-6.628-23.875 12.051-23.875 4.82V400h191v-47z"
                      opacity="0.15"
                    />
                  </g>
                  <path
                    stroke={
                      brandColor ? "currentColor" : `url(#${id}-color-gradient)`
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="m262.333 384.729 23.7-6.06a1 1 0 0 0 .178-.064l23.37-11.009c.216-.102.463-.123.694-.059l23.323 6.484a1 1 0 0 0 .225.036l23.57 1.011q.107.005.212-.013l23.496-4.033q.191-.032.379.008l23.175 4.972c.273.058.558 0 .786-.161l23.284-16.443a1 1 0 0 1 .328-.152l23.614-6.058"
                  />
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontSize="13"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="484.667" y="325.727">
                      Sales
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#404040"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="484.667" y="344.591">
                      2
                    </tspan>
                  </text>
                  <mask
                    id={`${id}-w`}
                    width="191"
                    height="52"
                    x="484"
                    y="348"
                    maskUnits="userSpaceOnUse"
                    style={{ maskType: "alpha" }}
                  >
                    <path
                      fill={`url(#${id}-v)`}
                      d="M0 0h190.333v52H0z"
                      transform="translate(484.667 348)"
                    />
                  </mask>
                  <g mask={`url(#${id}-w)`}>
                    <path
                      fill={
                        brandColor
                          ? "currentColor"
                          : `url(#${id}-color-gradient)`
                      }
                      d="M651.292 359.026 627.417 376.5l-23.875-6.026-23.875 4.821-23.875-1.205-23.875-6.628-23.875 12.051-23.875 4.82V400h191v-47z"
                      opacity="0.15"
                    />
                  </g>
                  <path
                    stroke={
                      brandColor ? "currentColor" : `url(#${id}-color-gradient)`
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="m484.667 384.729 23.699-6.06a1 1 0 0 0 .179-.064l23.369-11.009c.217-.102.463-.123.694-.059l23.323 6.484a1 1 0 0 0 .225.036l23.571 1.011q.107.005.212-.013l23.496-4.033c.125-.021.254-.019.379.008l23.174 4.972c.273.058.559 0 .787-.161l23.283-16.443c.099-.07.211-.122.328-.152L675 353.188"
                  />
                  <rect
                    width="299"
                    height="111"
                    x="707.5"
                    y="298.5"
                    fill="#fff"
                    rx="7.5"
                  />
                  <rect
                    width="299"
                    height="111"
                    x="707.5"
                    y="298.5"
                    stroke="#E5E5E5"
                    rx="7.5"
                  />
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontSize="13"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="723" y="325.727">
                      Payouts
                    </tspan>
                  </text>
                  <path
                    fill="#fff"
                    d="M924 307.5h62a5.5 5.5 0 0 1 5.5 5.5v16a5.5 5.5 0 0 1-5.5 5.5h-62a5.5 5.5 0 0 1-5.5-5.5v-16a5.5 5.5 0 0 1 5.5-5.5"
                  />
                  <path
                    stroke="#D4D4D4"
                    d="M924 307.5h62a5.5 5.5 0 0 1 5.5 5.5v16a5.5 5.5 0 0 1-5.5 5.5h-62a5.5 5.5 0 0 1-5.5-5.5v-16a5.5 5.5 0 0 1 5.5-5.5Z"
                  />
                  <text
                    xmlSpace="preserve"
                    fill="#171717"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="928.158" y="326.091">
                      Settings
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#404040"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="723" y="365.591">
                      Upcoming
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="951" y="365.591">
                      $0.00
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#404040"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="723" y="390.591">
                      Total
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#262626"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="951" y="390.591">
                      $0.00
                    </tspan>
                  </text>
                  <mask id={`${id}-x`} fill="#fff">
                    <path d="M24 426h983v55H24z" />
                  </mask>
                  <path fill="#fff" d="M24 426h983v55H24z" />
                  <path
                    fill="#E5E5E5"
                    d="M1007 481v-1H24v2h983z"
                    mask={`url(#${id}-x)`}
                  />
                  <text
                    xmlSpace="preserve"
                    fill="#171717"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="24" y="458.591">
                      Quickstart
                    </tspan>
                  </text>
                  <path fill="#171717" d="M24 479.5h68v2H24z" />
                  <text
                    xmlSpace="preserve"
                    fill="#A1A1A1"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="108" y="458.591">
                      Earnings
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#A1A1A1"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="181" y="458.591">
                      Links
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#A1A1A1"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="231" y="458.591">
                      Leaderboard
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#A1A1A1"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="330" y="458.591">
                      FAQ
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#A1A1A1"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="373" y="458.591">
                      Resources
                    </tspan>
                  </text>
                  <rect
                    width="982"
                    height="368"
                    x="24.5"
                    y="505.5"
                    fill="#fff"
                    rx="7.5"
                  />
                  <rect
                    width="982"
                    height="368"
                    x="24.5"
                    y="505.5"
                    stroke="#E5E5E5"
                    rx="7.5"
                  />
                  <rect
                    width="306.333"
                    height="337"
                    x="40"
                    y="521"
                    fill="#FAFAFA"
                    rx="8"
                  />
                  <path fill="#FAFAFA" d="M96.167 541h194v121h-194z" />
                  <rect
                    width="32"
                    height="32"
                    x="129.167"
                    y="553"
                    fill="#FAFAFA"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="129.167"
                    y="553"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="161.167"
                    y="553"
                    fill="#fff"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="161.167"
                    y="553"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <path
                    fill="#404040"
                    fillRule="evenodd"
                    d="M172.189 575.4h9.955c.786 0 1.423-.637 1.423-1.422v-9.956c0-.785-.637-1.422-1.423-1.422h-9.955c-.786 0-1.422.637-1.422 1.422v9.956c0 .785.636 1.422 1.422 1.422"
                    clipRule="evenodd"
                  />
                  <path
                    fill="#fff"
                    fillRule="evenodd"
                    d="M181.789 573.622h-1.899v-3.235c0-.887-.337-1.382-1.039-1.382-.764 0-1.163.515-1.163 1.382v3.235h-1.831v-6.162h1.831v.83s.55-1.019 1.858-1.019c1.307 0 2.243.799 2.243 2.449zm-8.115-6.969c-.624 0-1.129-.51-1.129-1.138s.505-1.137 1.129-1.137c.623 0 1.128.509 1.128 1.137s-.505 1.138-1.128 1.138m-.946 6.969h1.909v-6.162h-1.909z"
                    clipRule="evenodd"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="193.167"
                    y="553"
                    fill="#FAFAFA"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="193.167"
                    y="553"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="225.167"
                    y="553"
                    fill="#fff"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="225.167"
                    y="553"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <g
                    stroke="#737373"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    clipPath={`url(#${id}-y)`}
                  >
                    <path d="M244.133 565.237a5.55 5.55 0 0 0-4.747-2.681 5.553 5.553 0 0 0-5.553 5.553c0 1.01.274 1.955.746 2.771.329.618-.04 2.077-.746 2.782.958.052 2.22-.38 2.783-.746a5.5 5.5 0 0 0 1.745.65c.1.019.207.015.308.029" />
                    <path d="M244.5 567.441a4 4 0 0 1 4 4c0 .728-.197 1.408-.537 1.996-.237.445.029 1.496.537 2.005-.69.037-1.598-.275-2.004-.537a4.03 4.03 0 0 1-1.997.538 4 4 0 1 1 0-8z" />
                  </g>
                  <rect
                    width="32"
                    height="32"
                    x="129.167"
                    y="585"
                    fill="#fff"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="129.167"
                    y="585"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <g
                    stroke="#737373"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    clipPath={`url(#${id}-z)`}
                  >
                    <path d="m138.722 598.111 6.015 3.318a.89.89 0 0 0 .859 0l6.015-3.318M150.278 603l2.222 2.222-2.222 2.222" />
                    <path d="M151.611 601.235v-3.568c0-.982-.795-1.778-1.778-1.778H140.5c-.982 0-1.778.796-1.778 1.778v6.666c0 .982.796 1.778 1.778 1.778h5.521m6.479-.889h-4.444" />
                  </g>
                  <rect
                    width="32"
                    height="32"
                    x="161.167"
                    y="585"
                    fill="#FAFAFA"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="161.167"
                    y="585"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="193.167"
                    y="585"
                    fill="#fff"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="193.167"
                    y="585"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <path
                    fill="#171717"
                    d="m210.379 600.021 4.761-5.421h-1.128l-4.136 4.706-3.301-4.706h-3.809l4.993 7.116-4.993 5.684h1.128l4.365-4.97 3.488 4.97h3.808m-11.254-11.967h1.733l7.978 11.175h-1.734"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="225.167"
                    y="585"
                    fill="#FAFAFA"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="225.167"
                    y="585"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="129.167"
                    y="617"
                    fill="#FAFAFA"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="129.167"
                    y="617"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="161.167"
                    y="617"
                    fill="#fff"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="161.167"
                    y="617"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <g clipPath={`url(#${id}-A)`}>
                    <path
                      stroke="#737373"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M172.5 635.184v2.404c0 .364.222.691.561.825l1.729.687a.89.89 0 0 0 1.008-.252l1.481-1.759m3.888 1.467c1.35 0 2.444-2.488 2.444-5.556s-1.094-5.556-2.444-5.556-2.445 2.488-2.445 5.556 1.095 5.556 2.445 5.556"
                    />
                    <path
                      stroke="#737373"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="m180.681 638.444-9.194-3.664a.9.9 0 0 1-.502-.488 3.3 3.3 0 0 1-.263-1.292c0-.241.027-.726.257-1.276a.92.92 0 0 1 .509-.504c3.234-1.252 5.96-2.413 9.193-3.665"
                    />
                    <path
                      fill="#737373"
                      d="M182.056 633c0-.736-.598-1.333-1.334-1.333-.047 0-.091.009-.138.014a10.4 10.4 0 0 0 0 2.638c.047.005.091.014.138.014.736 0 1.334-.597 1.334-1.333"
                    />
                  </g>
                  <rect
                    width="32"
                    height="32"
                    x="193.167"
                    y="617"
                    fill="#FAFAFA"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="193.167"
                    y="617"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="225.167"
                    y="617"
                    fill="#fff"
                    rx="6"
                  />
                  <rect
                    width="32"
                    height="32"
                    x="225.167"
                    y="617"
                    stroke="#E6E6E6"
                    rx="6"
                  />
                  <path
                    stroke="#737373"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M239.167 627.444H236.5a.89.89 0 0 0-.889.889V631c0 .491.398.889.889.889h2.667a.89.89 0 0 0 .889-.889v-2.667a.89.89 0 0 0-.889-.889m6.666 0h-2.666a.89.89 0 0 0-.889.889V631c0 .491.398.889.889.889h2.666a.89.89 0 0 0 .889-.889v-2.667a.89.89 0 0 0-.889-.889m-6.666 6.667H236.5a.89.89 0 0 0-.889.889v2.667c0 .491.398.889.889.889h2.667a.89.89 0 0 0 .889-.889V635a.89.89 0 0 0-.889-.889"
                  />
                  <mask id={`${id}-B`} fill="#fff">
                    <path d="M238.5 629h-1.333v1.333h1.333z" />
                  </mask>
                  <path
                    fill="#737373"
                    stroke="#737373"
                    strokeWidth="2"
                    d="M238.5 629h-1.333v1.333h1.333z"
                    mask={`url(#${id}-B)`}
                  />
                  <mask id={`${id}-C`} fill="#fff">
                    <path d="M245.167 629h-1.334v1.333h1.334z" />
                  </mask>
                  <path
                    fill="#737373"
                    stroke="#737373"
                    strokeWidth="2"
                    d="M245.167 629h-1.334v1.333h1.334z"
                    mask={`url(#${id}-C)`}
                  />
                  <mask id={`${id}-D`} fill="#fff">
                    <path d="M238.5 635.667h-1.333V637h1.333z" />
                  </mask>
                  <path
                    fill="#737373"
                    stroke="#737373"
                    strokeWidth="2"
                    d="M238.5 635.667h-1.333V637h1.333z"
                    mask={`url(#${id}-D)`}
                  />
                  <mask id={`${id}-E`} fill="#fff">
                    <path d="M247.389 637.889h-1.333v1.333h1.333z" />
                  </mask>
                  <path
                    fill="#737373"
                    stroke="#737373"
                    strokeWidth="2"
                    d="M247.389 637.889h-1.333v1.333h1.333z"
                    mask={`url(#${id}-E)`}
                  />
                  <mask id={`${id}-F`} fill="#fff">
                    <path d="M246.056 636.556h-1.334v1.333h1.334z" />
                  </mask>
                  <path
                    fill="#737373"
                    stroke="#737373"
                    strokeWidth="2"
                    d="M246.056 636.556h-1.334v1.333h1.334z"
                    mask={`url(#${id}-F)`}
                  />
                  <mask id={`${id}-G`} fill="#fff">
                    <path d="M247.389 635.222h-1.333v1.334h1.333z" />
                  </mask>
                  <path
                    fill="#737373"
                    stroke="#737373"
                    strokeWidth="2"
                    d="M247.389 635.222h-1.333v1.334h1.333z"
                    mask={`url(#${id}-G)`}
                  />
                  <mask id={`${id}-H`} fill="#fff">
                    <path d="M244.722 637.889h-1.778v1.333h1.778z" />
                  </mask>
                  <path
                    fill="#737373"
                    stroke="#737373"
                    strokeWidth="2"
                    d="M244.722 637.889h-1.778v1.333h1.778z"
                    mask={`url(#${id}-H)`}
                  />
                  <mask id={`${id}-I`} fill="#fff">
                    <path d="M242.944 635.222h-1.333v2.667h1.333z" />
                  </mask>
                  <path
                    fill="#737373"
                    stroke="#737373"
                    strokeWidth="2"
                    d="M242.944 635.222h-1.333v2.667h1.333z"
                    mask={`url(#${id}-I)`}
                  />
                  <mask id={`${id}-J`} fill="#fff">
                    <path d="M246.056 633.889h-3.112v1.333h3.112z" />
                  </mask>
                  <path
                    fill="#737373"
                    stroke="#737373"
                    strokeWidth="2"
                    d="M246.056 633.889h-3.112v1.333h3.112z"
                    mask={`url(#${id}-J)`}
                  />
                  <text
                    xmlSpace="preserve"
                    fill="#000"
                    fontSize="16"
                    fontWeight="600"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="137.667" y="699.818">
                      Share your link
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="14"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="82.126" y="733.091">
                      Sharing is caring! Recommend Dub{" "}
                    </tspan>
                    <tspan x="80.556" y="753.091">
                      to all your friends, family, and social{" "}
                    </tspan>
                    <tspan x="162.694" y="773.091">
                      followers.
                    </tspan>
                  </text>
                  <path
                    fill="#171717"
                    d="M66 798.5h254.333a5.5 5.5 0 0 1 5.5 5.5v28a5.5 5.5 0 0 1-5.5 5.5H66a5.5 5.5 0 0 1-5.5-5.5v-28a5.5 5.5 0 0 1 5.5-5.5"
                  />
                  <path
                    stroke="#E5E5E5"
                    d="M66 798.5h254.333a5.5 5.5 0 0 1 5.5 5.5v28a5.5 5.5 0 0 1-5.5 5.5H66a5.5 5.5 0 0 1-5.5-5.5v-28a5.5 5.5 0 0 1 5.5-5.5Z"
                  />
                  <g clipPath={`url(#${id}-K)`}>
                    <path
                      stroke="#fff"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M155.389 820.889h-.889a1.78 1.78 0 0 1-1.778-1.778v-4.889c0-.982.796-1.778 1.778-1.778h6.667c.982 0 1.777.796 1.777 1.778v.889m.889 8.444h-6.666a1.777 1.777 0 0 1-1.778-1.777v-4.889c0-.982.796-1.778 1.778-1.778h6.666c.982 0 1.778.796 1.778 1.778v4.889c0 .982-.796 1.777-1.778 1.777"
                    />
                  </g>
                  <text
                    xmlSpace="preserve"
                    fill="#fff"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="175.347" y="823.091">
                      Copy link
                    </tspan>
                  </text>
                  <rect
                    width="306.333"
                    height="337"
                    x="362.333"
                    y="521"
                    fill="#FAFAFA"
                    rx="8"
                  />
                  <path fill="#FAFAFA" d="M418.5 541h194v121h-194z" />
                  <circle
                    cx="537.5"
                    cy="564"
                    r="15.5"
                    fill="#FAFAFA"
                    stroke="#E6E6E6"
                  />
                  <rect
                    width="38"
                    height="38"
                    x="496.5"
                    y="582"
                    fill="#fff"
                    rx="19"
                  />
                  <rect
                    width="38"
                    height="38"
                    x="496.5"
                    y="582"
                    stroke="#E6E6E6"
                    rx="19"
                  />
                  {/* Success kit logo */}
                  <image
                    width="30"
                    height="30"
                    x="500.5"
                    y="586"
                    href={logo || `${OG_AVATAR_URL}${program.name}`}
                    clipPath="inset(0% round 80px)"
                  />
                  <rect
                    width="31"
                    height="31"
                    x="544"
                    y="585.5"
                    fill="#fff"
                    rx="15.5"
                  />
                  <rect
                    width="31"
                    height="31"
                    x="544"
                    y="585.5"
                    stroke="#E6E6E6"
                    rx="15.5"
                  />
                  <path
                    stroke="#737373"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="m554.648 596.209-1.559 4.072a.5.5 0 0 0 .546.67l4.336-.71a.498.498 0 0 0 .303-.809l-2.776-3.362a.5.5 0 0 0-.85.139m8.852 3.235a2.444 2.444 0 1 0 0-4.887 2.444 2.444 0 0 0 0 4.887m.667 4.682a6.46 6.46 0 0 0-2.383 3.318 6.47 6.47 0 0 0-3.319-2.383 6.45 6.45 0 0 0 2.383-3.318 6.47 6.47 0 0 0 3.319 2.383"
                  />
                  <rect
                    width="31"
                    height="31"
                    x="479"
                    y="548.5"
                    fill="#fff"
                    rx="15.5"
                  />
                  <rect
                    width="31"
                    height="31"
                    x="479"
                    y="548.5"
                    stroke="#E6E6E6"
                    rx="15.5"
                  />
                  <g
                    stroke="#737373"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    clipPath={`url(#${id}-L)`}
                  >
                    <path d="M491.611 562h1.778m-1.778 2.667h4m4.365-3.111h-3.032a.89.89 0 0 1-.888-.889v-3.021" />
                    <path d="M500.056 566v-4.076a.9.9 0 0 0-.261-.629l-3.479-3.479a.9.9 0 0 0-.628-.26h-4.966c-.982 0-1.778.796-1.778 1.777v9.334c0 .981.796 1.777 1.778 1.777h4.488m2.174-.444 1.43 1.333 3.019-4" />
                  </g>
                  <rect
                    width="31"
                    height="31"
                    x="479"
                    y="623.5"
                    fill="#fff"
                    rx="15.5"
                  />
                  <rect
                    width="31"
                    height="31"
                    x="479"
                    y="623.5"
                    stroke="#E6E6E6"
                    rx="15.5"
                  />
                  <path
                    stroke="#737373"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M493.881 645.415a6.446 6.446 0 0 1-5.82-6.691c.14-3.347 2.978-6.111 6.328-6.168a6.445 6.445 0 0 1 6.555 6.444 2.444 2.444 0 0 1-2.444 2.444h-2.634c-.919 0-1.504.981-1.069 1.79l.211.392c.231.429.183.954-.121 1.334-.243.304-.619.492-1.006.455"
                  />
                  <path
                    fill="#737373"
                    d="M494.5 636.333a.889.889 0 1 0 0-1.778.889.889 0 0 0 0 1.778m-2.514 1.042a.889.889 0 1 0 0-1.778.889.889 0 0 0 0 1.778m5.028 0a.889.889 0 1 0 0-1.778.889.889 0 0 0 0 1.778m-6.07 2.514a.889.889 0 1 0 0-1.778.889.889 0 0 0 0 1.778"
                  />
                  <circle
                    cx="537.5"
                    cy="639"
                    r="15.5"
                    fill="#FAFAFA"
                    stroke="#E6E6E6"
                  />
                  <circle
                    cx="472.5"
                    cy="601"
                    r="15.5"
                    fill="#FAFAFA"
                    stroke="#E6E6E6"
                  />
                  <text
                    xmlSpace="preserve"
                    fill="#000"
                    fontSize="16"
                    fontWeight="600"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="472.5" y="699.818">
                      Success kit
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="14"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="397.001" y="733.091">
                      Make sure you get set up for success{" "}
                    </tspan>
                    <tspan x="382.227" y="753.091">
                      with the official brand files and supportive{" "}
                    </tspan>
                    <tspan x="437.906" y="773.091">
                      content and documents.
                    </tspan>
                  </text>
                  <path
                    fill="#171717"
                    d="M382.333 804a6 6 0 0 1 6-6h254.334a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H388.333a6 6 0 0 1-6-6z"
                  />
                  <text
                    xmlSpace="preserve"
                    fill="#fff"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="465.77" y="823.091">
                      View resources
                    </tspan>
                  </text>
                  <rect
                    width="306.333"
                    height="337"
                    x="684.667"
                    y="521"
                    fill="#FAFAFA"
                    rx="8"
                  />
                  <path fill="#FAFAFA" d="M740.833 541h194v121h-194z" />
                  <rect
                    width="127"
                    height="84"
                    x="774.333"
                    y="542.5"
                    stroke="#E6E6E6"
                    rx="10.5"
                  />
                  <rect
                    width="113"
                    height="70"
                    x="781.333"
                    y="549.5"
                    fill="#fff"
                    rx="5.5"
                  />
                  <rect
                    width="113"
                    height="70"
                    x="781.333"
                    y="549.5"
                    stroke="#E6E6E6"
                    rx="5.5"
                  />
                  {/* Success kit logo */}
                  <image
                    width="14"
                    height="14"
                    x="788.833"
                    y="557"
                    href={logo || `${OG_AVATAR_URL}${program.name}`}
                    clipPath="inset(0% round 80px)"
                  />
                  <path
                    fill="#0A2540"
                    fillRule="evenodd"
                    d="M886.833 564.186c0-1.904-.895-3.407-2.607-3.407-1.719 0-2.759 1.503-2.759 3.392 0 2.239 1.228 3.37 2.99 3.37.86 0 1.51-.201 2.001-.484v-1.487c-.491.252-1.055.409-1.77.409-.7 0-1.321-.253-1.401-1.131h3.532c0-.097.014-.483.014-.662m-3.568-.707c0-.84.499-1.19.954-1.19.44 0 .91.35.91 1.19zm-4.586-2.7c-.707 0-1.162.342-1.415.58l-.094-.461h-1.589v8.673l1.806-.394.007-2.105c.26.194.643.469 1.278.469 1.293 0 2.47-1.071 2.47-3.429-.007-2.158-1.199-3.333-2.463-3.333m-.433 5.125c-.426 0-.679-.156-.852-.349l-.007-2.76c.187-.216.447-.365.859-.365.657 0 1.112.759 1.112 1.734 0 .996-.448 1.74-1.112 1.74m-5.149-5.564 1.812-.401v-1.51l-1.812.394zm0 .566h1.812v6.508h-1.812zm-1.943.55-.116-.55h-1.56v6.508h1.806v-4.411c.426-.573 1.148-.468 1.372-.387v-1.71c-.231-.09-1.076-.253-1.502.55m-3.611-2.165-1.763.387-.007 5.958c0 1.101.802 1.912 1.871 1.912.592 0 1.025-.111 1.264-.245v-1.51c-.231.096-1.373.439-1.373-.662v-2.641h1.373v-1.584h-1.373zm-4.883 3.504c0-.29.232-.402.614-.402.549 0 1.243.171 1.791.476v-1.748a4.6 4.6 0 0 0-1.791-.342c-1.466 0-2.441.789-2.441 2.105 0 2.053 2.745 1.726 2.745 2.611 0 .342-.289.454-.694.454-.599 0-1.365-.253-1.971-.595v1.77a4.9 4.9 0 0 0 1.971.424c1.503 0 2.535-.766 2.535-2.097-.007-2.217-2.759-1.823-2.759-2.656"
                    clipRule="evenodd"
                    opacity="0.2"
                  />
                  <text
                    xmlSpace="preserve"
                    fill="#171717"
                    fontSize="6"
                    fontWeight="600"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="788.833" y="598.682">
                      Payouts
                    </tspan>
                  </text>
                  <g
                    stroke="#A1A1A1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="0.952"
                    clipPath={`url(#${id}-M)`}
                  >
                    <path d="M791.373 609.143v-1.905m2.063 0v-1.905m0 5.715v-1.905" />
                  </g>
                  <text
                    xmlSpace="preserve"
                    fill="#737373"
                    fontFamily="Geist Mono"
                    fontSize="7.619"
                    fontWeight="500"
                    letterSpacing="0em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="798.992" y="610.667">
                      09999-110
                    </tspan>
                  </text>
                  <rect
                    width="21"
                    height="21"
                    x="827.333"
                    y="633.5"
                    fill="#fff"
                    stroke="#E6E6E6"
                    rx="5.5"
                  />
                  <path
                    stroke="#737373"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M837.833 644.222a1.556 1.556 0 1 0 0-3.111 1.556 1.556 0 0 0 0 3.111"
                  />
                  <path
                    stroke="#737373"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M841.167 637.556H834.5c-.982 0-1.778.795-1.778 1.777v9.334c0 .981.796 1.777 1.778 1.777h6.667c.981 0 1.777-.796 1.777-1.777v-9.334c0-.982-.796-1.777-1.777-1.777m-5.112 9.333h3.556"
                  />
                  <path stroke="#E6E6E6" d="M837.833 627v6" />
                  <text
                    xmlSpace="preserve"
                    fill="#000"
                    fontSize="16"
                    fontWeight="600"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="773.833" y="699.818">
                      Receive earnings
                    </tspan>
                  </text>
                  <text
                    xmlSpace="preserve"
                    fill="#525252"
                    fontSize="14"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="714.429" y="733.091">
                      After your payouts are connected, you’ll{" "}
                    </tspan>
                    <tspan x="720.575" y="753.091">
                      get paid out automatically for all your{" "}
                    </tspan>
                    <tspan x="819.751" y="773.091">
                      sales.{" "}
                    </tspan>
                  </text>
                  <path
                    fill="#171717"
                    d="M704.667 804a6 6 0 0 1 6-6H965a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H710.667a6 6 0 0 1-6-6z"
                  />
                  <text
                    xmlSpace="preserve"
                    fill="#fff"
                    fontSize="14"
                    fontWeight="500"
                    letterSpacing="-.02em"
                    style={{ whiteSpace: "pre" }}
                  >
                    <tspan x="782.843" y="823.091">
                      Connect payouts
                    </tspan>
                  </text>
                  <defs>
                    <filter
                      id={`${id}-b`}
                      width="112.522"
                      height="25"
                      x="880.885"
                      y="243"
                      colorInterpolationFilters="sRGB"
                      filterUnits="userSpaceOnUse"
                    >
                      <feFlood floodOpacity="0" result="BackgroundImageFix" />
                      <feColorMatrix
                        in="SourceAlpha"
                        result="hardAlpha"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      />
                      <feMorphology
                        in="SourceAlpha"
                        operator="dilate"
                        radius="2"
                        result="effect1_dropShadow_20_283"
                      />
                      <feOffset />
                      <feComposite in2="hardAlpha" operator="out" />
                      <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0" />
                      <feBlend
                        in2="BackgroundImageFix"
                        result="effect1_dropShadow_20_283"
                      />
                      <feBlend
                        in="SourceGraphic"
                        in2="effect1_dropShadow_20_283"
                        result="shape"
                      />
                    </filter>
                    <filter
                      id={`${id}-e`}
                      width="40.75"
                      height="40.75"
                      x="704.625"
                      y="52.625"
                      colorInterpolationFilters="sRGB"
                      filterUnits="userSpaceOnUse"
                    >
                      <feFlood floodOpacity="0" result="BackgroundImageFix" />
                      <feBlend
                        in="SourceGraphic"
                        in2="BackgroundImageFix"
                        result="shape"
                      />
                      <feColorMatrix
                        in="SourceAlpha"
                        result="hardAlpha"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      />
                      <feOffset />
                      <feGaussianBlur stdDeviation="6" />
                      <feComposite
                        in2="hardAlpha"
                        k2="-1"
                        k3="1"
                        operator="arithmetic"
                      />
                      <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
                      <feBlend
                        in2="shape"
                        result="effect1_innerShadow_20_283"
                      />
                    </filter>
                    <filter
                      id={`${id}-g`}
                      width="40.75"
                      height="40.75"
                      x="944.625"
                      y="212.625"
                      colorInterpolationFilters="sRGB"
                      filterUnits="userSpaceOnUse"
                    >
                      <feFlood floodOpacity="0" result="BackgroundImageFix" />
                      <feBlend
                        in="SourceGraphic"
                        in2="BackgroundImageFix"
                        result="shape"
                      />
                      <feColorMatrix
                        in="SourceAlpha"
                        result="hardAlpha"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      />
                      <feOffset />
                      <feGaussianBlur stdDeviation="6" />
                      <feComposite
                        in2="hardAlpha"
                        k2="-1"
                        k3="1"
                        operator="arithmetic"
                      />
                      <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
                      <feBlend
                        in2="shape"
                        result="effect1_innerShadow_20_283"
                      />
                    </filter>
                    <filter
                      id={`${id}-i`}
                      width="160.75"
                      height="160.75"
                      x="766.625"
                      y="72.625"
                      colorInterpolationFilters="sRGB"
                      filterUnits="userSpaceOnUse"
                    >
                      <feFlood floodOpacity="0" result="BackgroundImageFix" />
                      <feBlend
                        in="SourceGraphic"
                        in2="BackgroundImageFix"
                        result="shape"
                      />
                      <feColorMatrix
                        in="SourceAlpha"
                        result="hardAlpha"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      />
                      <feOffset />
                      <feGaussianBlur stdDeviation="6" />
                      <feComposite
                        in2="hardAlpha"
                        k2="-1"
                        k3="1"
                        operator="arithmetic"
                      />
                      <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
                      <feBlend
                        in2="shape"
                        result="effect1_innerShadow_20_283"
                      />
                    </filter>
                    <filter
                      id={`${id}-k`}
                      width="100"
                      height="100"
                      x="797"
                      y="103"
                      colorInterpolationFilters="sRGB"
                      filterUnits="userSpaceOnUse"
                    >
                      <feFlood floodOpacity="0" result="BackgroundImageFix" />
                      <feColorMatrix
                        in="SourceAlpha"
                        result="hardAlpha"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      />
                      <feOffset />
                      <feGaussianBlur stdDeviation="5" />
                      <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                      <feBlend
                        in2="BackgroundImageFix"
                        result="effect1_dropShadow_20_283"
                      />
                      <feBlend
                        in="SourceGraphic"
                        in2="effect1_dropShadow_20_283"
                        result="shape"
                      />
                    </filter>
                    <filter
                      id={`${id}-n`}
                      width="787"
                      height="820"
                      x="324"
                      y="-256.998"
                      colorInterpolationFilters="sRGB"
                      filterUnits="userSpaceOnUse"
                    >
                      <feFlood floodOpacity="0" result="BackgroundImageFix" />
                      <feBlend
                        in="SourceGraphic"
                        in2="BackgroundImageFix"
                        result="shape"
                      />
                      <feGaussianBlur
                        result="effect1_foregroundBlur_20_283"
                        stdDeviation="50"
                      />
                    </filter>
                    <filter
                      id={`${id}-o`}
                      width="827"
                      height="709.205"
                      x="304.001"
                      y="-183.707"
                      colorInterpolationFilters="sRGB"
                      filterUnits="userSpaceOnUse"
                    >
                      <feFlood floodOpacity="0" result="BackgroundImageFix" />
                      <feBlend
                        in="SourceGraphic"
                        in2="BackgroundImageFix"
                        result="shape"
                      />
                      <feGaussianBlur
                        result="effect1_foregroundBlur_20_283"
                        stdDeviation="60"
                      />
                    </filter>
                    <linearGradient
                      id={`${id}-f`}
                      x1="725"
                      x2="725"
                      y1="93"
                      y2="53"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#fff" stopOpacity="0.23" />
                      <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
                    </linearGradient>
                    <linearGradient
                      id={`${id}-h`}
                      x1="965"
                      x2="965"
                      y1="253"
                      y2="213"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#fff" stopOpacity="0.23" />
                      <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
                    </linearGradient>
                    <linearGradient
                      id={`${id}-j`}
                      x1="847"
                      x2="847"
                      y1="233"
                      y2="73"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#fff" stopOpacity="1.0" />
                      <stop offset="1" stopColor="#fff" stopOpacity="1.0" />
                    </linearGradient>
                    <linearGradient
                      id={`${id}-l`}
                      x1="467.582"
                      x2="858.35"
                      y1="153"
                      y2="-43.164"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#FAFAFA" />
                      <stop offset="1" stopColor="#FAFAFA" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient
                      id={`${id}-q`}
                      x1="95.167"
                      x2="95.167"
                      y1="0"
                      y2="52"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0.2" stopColor="#fff" />
                      <stop offset="0.955" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient
                      id={`${id}-t`}
                      x1="95.167"
                      x2="95.167"
                      y1="0"
                      y2="52"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0.2" stopColor="#fff" />
                      <stop offset="0.955" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient
                      id={`${id}-v`}
                      x1="95.167"
                      x2="95.167"
                      y1="0"
                      y2="52"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0.2" stopColor="#fff" />
                      <stop offset="0.955" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                    <clipPath id={`${id}-a`}>
                      <rect
                        width="983"
                        height="258"
                        x="24"
                        y="24"
                        fill="#fff"
                        rx="8"
                      />
                    </clipPath>
                    <clipPath id={`${id}-y`}>
                      <use
                        xlinkHref={`#${id}-N`}
                        transform="translate(233.167 561)"
                      />
                    </clipPath>
                    <clipPath id={`${id}-z`}>
                      <use
                        xlinkHref={`#${id}-N`}
                        transform="translate(137.167 593)"
                      />
                    </clipPath>
                    <clipPath id={`${id}-A`}>
                      <use
                        xlinkHref={`#${id}-N`}
                        transform="translate(169.167 625)"
                      />
                    </clipPath>
                    <clipPath id={`${id}-K`}>
                      <use
                        xlinkHref={`#${id}-N`}
                        transform="translate(151.167 810)"
                      />
                    </clipPath>
                    <clipPath id={`${id}-L`}>
                      <use
                        xlinkHref={`#${id}-N`}
                        transform="translate(486.5 556)"
                      />
                    </clipPath>
                    <clipPath id={`${id}-M`}>
                      <path
                        fill="#fff"
                        d="M788.833 604.381h7.619V612h-7.619z"
                      />
                    </clipPath>
                    <radialGradient
                      id={`${id}-c`}
                      cx="0"
                      cy="0"
                      r="1"
                      gradientTransform="rotate(90 345.5 499)scale(159.5)"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0.73" stopColor="#fff" />
                      <stop offset="1" stopColor="#fff" stopOpacity="0" />
                    </radialGradient>
                    <pattern
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
                      id={`${id}-grid`}
                      width="160"
                      height="160"
                      patternUnits="userSpaceOnUse"
                      x="-14"
                      y="-8"
                    >
                      <rect
                        width="160"
                        height="160"
                        fill={`url(#${id}-smallGrid)`}
                      />
                      <path
                        d="M 160 0 L 0 0 0 160"
                        fill="none"
                        stroke="#0001"
                        strokeWidth="1"
                      />
                    </pattern>

                    {/* Grid gradient cover */}
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
                      <stop offset="0%" stopColor="#7D3AEC" stopOpacity="1" />
                      <stop offset="100%" stopColor="#DA2778" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </PreviewWindow>
    </div>
  );
}
