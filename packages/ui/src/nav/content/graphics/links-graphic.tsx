import { cn } from "@dub/utils";
import { SVGProps, useId } from "react";

export function LinksGraphic(props: SVGProps<SVGSVGElement>) {
  const id = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      width="300"
      height="180"
      fill="none"
      viewBox="0 0 300 180"
      {...props}
      className={cn(
        "pointer-events-none text-[var(--fg)] [--bg:white] [--border:#e5e5e5] [--fg:#171717] [--muted:#404040] dark:[--bg:black] dark:[--border:#fff3] dark:[--fg:#fffa] dark:[--muted:#fff7]",
        props.className,
      )}
    >
      <defs>
        <path
          id={`${id}-m`}
          className="fill-[var(--bg)]"
          d="M0 0h10.24v10.24H0z"
        ></path>
        <path
          id={`${id}-n`}
          className="fill-[var(--bg)]"
          d="M0 0h8.05v8.05H0z"
        ></path>
        <path
          id={`${id}-o`}
          className="fill-[var(--bg)]"
          d="M0 0h11.71v11.71H0z"
        ></path>
      </defs>
      <rect
        width="292"
        height="52"
        x="4"
        y="4"
        rx="8.78"
        className="fill-[var(--bg)]"
      ></rect>
      <rect
        width="292"
        height="52"
        x="4"
        y="4"
        className="stroke-[var(--border)]"
        strokeWidth="0.73"
        rx="8.78"
      ></rect>
      <rect
        width="24.88"
        height="24.88"
        x="17.17"
        y="17.56"
        fill={`url(#${id}-a)`}
        rx="12.44"
      ></rect>
      <rect
        width="25.61"
        height="25.61"
        x="16.8"
        y="17.2"
        className="stroke-[var(--border)]"
        strokeWidth="0.73"
        rx="12.8"
      ></rect>
      <path
        className="fill-[var(--fg)]"
        d="M29.61 23c.6 0 1.19.08 1.75.22v3.75a3.5 3.5 0 1 0 0 6.06v.47h1.75v-9.56a7 7 0 1 1-3.5-.94m2.29.39"
      ></path>
      <text
        xmlSpace="preserve"
        className="fill-[var(--fg)]"
        fontSize="10.24"
        fontWeight="600"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="50.83" y="25.49">
          d.to
        </tspan>
      </text>
      <g
        className="stroke-[var(--fg)]"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        clipPath={`url(#${id}-b)`}
      >
        <path d="M84.47 26.08h3.98c.63 0 1.14-.51 1.14-1.14v-3.98c0-.63-.51-1.14-1.14-1.14h-3.98c-.63 0-1.14.5-1.14 1.14v3.98c0 .63.5 1.14 1.14 1.14"></path>
        <path d="M82.05 24a1.14 1.14 0 0 1-.71-1.05v-3.99c0-.63.5-1.13 1.14-1.13h3.98c.48 0 .89.29 1.05.7"></path>
      </g>
      <path
        className="stroke-[var(--fg)]"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        d="M106.87 23.66h-1.29a.85.85 0 0 0-.85.85v1.28m-1.71-5.97v1.28a.85.85 0 0 1-.85.85h-1.28m3.84.01h.43m-2.14 3.83v-.42m-3.41-7.26h1.28c.24 0 .43.2.43.43v1.28c0 .23-.2.42-.43.42h-1.28a.43.43 0 0 1-.43-.42v-1.28c0-.24.2-.43.43-.43m5.55 0h1.28c.23 0 .43.2.43.43v1.28c0 .23-.2.42-.43.42h-1.28a.43.43 0 0 1-.43-.42v-1.28c0-.24.2-.43.43-.43m-5.55 5.55h1.28c.24 0 .43.19.43.43v1.28c0 .23-.2.42-.43.42h-1.28a.43.43 0 0 1-.43-.42v-1.28c0-.24.2-.43.43-.43"
      ></path>
      <g
        stroke="#A1A1A1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        clipPath={`url(#${id}-c)`}
      >
        <path d="M59.11 38.38h-4.7a.9.9 0 0 1-.89-.89V35.7"></path>
        <path d="m57.21 36.48 1.9 1.9-1.9 1.9"></path>
      </g>
      <text
        xmlSpace="preserve"
        fill="#737373"
        fontSize="10.24"
        fontWeight="500"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="63.27" y="41.59">
          dub.co
        </tspan>
      </text>
      <path
        className="fill-[var(--bg)]"
        d="M205.12 19.4h69.22c1.24 0 2.14 0 2.86.05.62.05 1.07.14 1.44.3l.16.08c.66.34 1.22.85 1.6 1.48l.16.28c.21.4.32.9.38 1.6.06.72.06 1.62.06 2.86v7.9c0 1.24 0 2.14-.06 2.85a4.6 4.6 0 0 1-.3 1.45l-.08.16a4 4 0 0 1-1.48 1.6l-.28.16c-.4.2-.9.32-1.6.38-.72.06-1.62.06-2.86.06h-69.22c-1.23 0-2.14 0-2.85-.06a4.6 4.6 0 0 1-1.45-.3l-.16-.08a4 4 0 0 1-1.6-1.48l-.16-.28c-.2-.4-.32-.9-.38-1.6-.06-.72-.06-1.62-.06-2.86v-7.9c0-1.24 0-2.14.06-2.85s.17-1.2.38-1.61c.39-.76 1-1.38 1.76-1.76.41-.2.9-.32 1.6-.38.72-.06 1.63-.06 2.86-.06Z"
      ></path>
      <path
        className="stroke-[var(--border)]"
        strokeWidth="0.73"
        d="M205.12 19.4h69.22c1.24 0 2.14 0 2.86.05.62.05 1.07.14 1.44.3l.16.08c.66.34 1.22.85 1.6 1.48l.16.28c.21.4.32.9.38 1.6.06.72.06 1.62.06 2.86v7.9c0 1.24 0 2.14-.06 2.85a4.6 4.6 0 0 1-.3 1.45l-.08.16a4 4 0 0 1-1.48 1.6l-.28.16c-.4.2-.9.32-1.6.38-.72.06-1.62.06-2.86.06h-69.22c-1.23 0-2.14 0-2.85-.06a4.6 4.6 0 0 1-1.45-.3l-.16-.08a4 4 0 0 1-1.6-1.48l-.16-.28c-.2-.4-.32-.9-.38-1.6-.06-.72-.06-1.62-.06-2.86v-7.9c0-1.24 0-2.14.06-2.85s.17-1.2.38-1.61c.39-.76 1-1.38 1.76-1.76.41-.2.9-.32 1.6-.38.72-.06 1.63-.06 2.86-.06Z"
      ></path>
      <g
        className="stroke-[var(--muted)]"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        clipPath={`url(#${id}-d)`}
      >
        <path d="m209.95 29.2 4.75 1.64c.15.05.15.25 0 .3l-2.13.8a.16.16 0 0 0-.09.1l-.8 2.13a.16.16 0 0 1-.3 0l-1.64-4.76a.16.16 0 0 1 .2-.2h0Zm2.55 2.77 2.75 2.74m-5.53-9.43v1.3m2.76-.15-.92.92m-4.6 4.6.92-.92m-2.06-1.84h1.3m-.16-2.76.92.92"></path>
      </g>
      <text
        xmlSpace="preserve"
        className="fill-[var(--muted)]"
        fontSize="8.78"
        fontWeight="500"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="220.78" y="33.19">
          151.8K clicks
        </tspan>
      </text>
      <rect
        width="292"
        height="52"
        x="4"
        y="64"
        rx="8.78"
        className="fill-[var(--bg)]"
      ></rect>
      <rect
        width="292"
        height="52"
        x="4"
        y="64"
        className="stroke-[var(--border)]"
        strokeWidth="0.73"
        rx="8.78"
      ></rect>
      <rect
        width="24.88"
        height="24.88"
        x="17.17"
        y="77.56"
        fill={`url(#${id}-e)`}
        rx="12.44"
      ></rect>
      <rect
        width="25.61"
        height="25.61"
        x="16.8"
        y="77.19"
        className="stroke-[var(--border)]"
        strokeWidth="0.73"
        rx="12.8"
      ></rect>
      <path
        className="fill-[var(--fg)]"
        d="M29.61 83c.6 0 1.19.08 1.75.22v3.75a3.5 3.5 0 1 0 0 6.06v.47h1.75v-9.56a7 7 0 1 1-3.5-.94m2.29.39"
      ></path>
      <text
        xmlSpace="preserve"
        className="fill-[var(--fg)]"
        fontSize="10.24"
        fontWeight="600"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="50.83" y="85.49">
          d.to/register
        </tspan>
      </text>
      <g
        className="stroke-[var(--fg)]"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        clipPath={`url(#${id}-f)`}
      >
        <path d="M126.47 86.08h3.98c.63 0 1.14-.51 1.14-1.14v-3.98c0-.63-.51-1.14-1.14-1.14h-3.98c-.63 0-1.14.5-1.14 1.14v3.98c0 .63.5 1.14 1.14 1.14"></path>
        <path d="M124.05 84a1.14 1.14 0 0 1-.71-1.05v-3.99c0-.63.5-1.13 1.13-1.13h3.99c.48 0 .89.29 1.05.7"></path>
      </g>
      <path
        className="stroke-[var(--fg)]"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        d="M148.87 83.66h-1.28a.85.85 0 0 0-.86.85v1.28m-1.71-5.97v1.28a.85.85 0 0 1-.85.85h-1.28m3.84.01h.43m-2.14 3.83v-.42m-3.41-7.26h1.28c.24 0 .43.2.43.43v1.28c0 .23-.2.42-.43.42h-1.28a.43.43 0 0 1-.43-.42v-1.28c0-.24.2-.43.43-.43m5.55 0h1.28c.24 0 .43.2.43.43v1.28c0 .23-.2.42-.43.42h-1.28a.43.43 0 0 1-.43-.42v-1.28c0-.24.2-.43.43-.43m-5.55 5.55h1.28c.24 0 .43.19.43.43v1.28c0 .23-.2.42-.43.42h-1.28a.43.43 0 0 1-.43-.42v-1.28c0-.24.2-.43.43-.43"
      ></path>
      <g
        stroke="#A1A1A1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        clipPath={`url(#${id}-g)`}
      >
        <path d="M59.11 98.38h-4.7a.9.9 0 0 1-.89-.89V95.7"></path>
        <path d="m57.21 96.48 1.9 1.9-1.9 1.9"></path>
      </g>
      <text
        xmlSpace="preserve"
        fill="#737373"
        fontSize="10.24"
        fontWeight="500"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="63.27" y="101.59">
          app.dub.co/register
        </tspan>
      </text>
      <path
        className="fill-[var(--bg)]"
        d="M211.12 79.4h63.22c1.24 0 2.14 0 2.86.05.62.05 1.07.14 1.44.3l.16.08c.66.34 1.22.85 1.6 1.48l.16.28c.21.4.32.9.38 1.6.06.72.06 1.62.06 2.86v7.9c0 1.24 0 2.14-.06 2.85a4.6 4.6 0 0 1-.3 1.45l-.08.16a4.03 4.03 0 0 1-1.48 1.6l-.28.16c-.4.2-.9.32-1.6.38-.72.06-1.62.06-2.86.06h-63.22c-1.23 0-2.14 0-2.85-.06a4.6 4.6 0 0 1-1.45-.3l-.16-.08a4 4 0 0 1-1.6-1.48l-.16-.28c-.2-.4-.32-.9-.38-1.6-.06-.72-.06-1.62-.06-2.86v-7.9c0-1.24 0-2.14.06-2.85s.17-1.2.38-1.61c.39-.76 1-1.38 1.76-1.76.41-.2.9-.32 1.6-.38.72-.06 1.63-.06 2.86-.06Z"
      ></path>
      <path
        className="stroke-[var(--border)]"
        strokeWidth="0.73"
        d="M211.12 79.4h63.22c1.24 0 2.14 0 2.86.05.62.05 1.07.14 1.44.3l.16.08c.66.34 1.22.85 1.6 1.48l.16.28c.21.4.32.9.38 1.6.06.72.06 1.62.06 2.86v7.9c0 1.24 0 2.14-.06 2.85a4.6 4.6 0 0 1-.3 1.45l-.08.16a4.03 4.03 0 0 1-1.48 1.6l-.28.16c-.4.2-.9.32-1.6.38-.72.06-1.62.06-2.86.06h-63.22c-1.23 0-2.14 0-2.85-.06a4.6 4.6 0 0 1-1.45-.3l-.16-.08a4 4 0 0 1-1.6-1.48l-.16-.28c-.2-.4-.32-.9-.38-1.6-.06-.72-.06-1.62-.06-2.86v-7.9c0-1.24 0-2.14.06-2.85s.17-1.2.38-1.61c.39-.76 1-1.38 1.76-1.76.41-.2.9-.32 1.6-.38.72-.06 1.63-.06 2.86-.06Z"
      ></path>
      <g
        className="stroke-[var(--muted)]"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        clipPath={`url(#${id}-h)`}
      >
        <path d="m215.95 89.2 4.75 1.64c.15.05.15.25 0 .3l-2.13.8a.16.16 0 0 0-.09.1l-.8 2.13a.16.16 0 0 1-.3 0l-1.64-4.76a.16.16 0 0 1 .2-.2h0Zm2.55 2.77 2.75 2.74m-5.53-9.43v1.3m2.76-.15-.92.92m-4.6 4.6.92-.92m-2.06-1.84h1.3m-.16-2.76.92.92"></path>
      </g>
      <text
        xmlSpace="preserve"
        className="fill-[var(--muted)]"
        fontSize="8.78"
        fontWeight="500"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="226.78" y="93.19">
          100K clicks
        </tspan>
      </text>
      <path
        className="fill-[var(--bg)]"
        d="M4 138.05c0-4.92 0-7.38.96-9.26a8.7 8.7 0 0 1 3.83-3.83c1.88-.96 4.34-.96 9.26-.96h263.9c4.92 0 7.38 0 9.26.96a8.7 8.7 0 0 1 3.83 3.83c.96 1.88.96 4.34.96 9.26v23.9c0 4.92 0 7.38-.96 9.26a8.78 8.78 0 0 1-3.83 3.83c-1.88.96-4.34.96-9.26.96H18.05c-4.92 0-7.38 0-9.26-.96a8.78 8.78 0 0 1-3.83-3.83C4 169.33 4 166.87 4 161.95z"
      ></path>
      <path
        className="stroke-[var(--border)]"
        strokeWidth="0.73"
        d="M4 138.05c0-4.92 0-7.38.96-9.26a8.7 8.7 0 0 1 3.83-3.83c1.88-.96 4.34-.96 9.26-.96h263.9c4.92 0 7.38 0 9.26.96a8.7 8.7 0 0 1 3.83 3.83c.96 1.88.96 4.34.96 9.26v23.9c0 4.92 0 7.38-.96 9.26a8.78 8.78 0 0 1-3.83 3.83c-1.88.96-4.34.96-9.26.96H18.05c-4.92 0-7.38 0-9.26-.96a8.78 8.78 0 0 1-3.83-3.83C4 169.33 4 166.87 4 161.95z"
      ></path>
      <rect
        width="24.88"
        height="24.88"
        x="17.17"
        y="137.56"
        fill={`url(#${id}-i)`}
        rx="12.44"
      ></rect>
      <rect
        width="25.61"
        height="25.61"
        x="16.8"
        y="137.19"
        className="stroke-[var(--border)]"
        strokeWidth="0.73"
        rx="12.8"
      ></rect>
      <path
        className="fill-[var(--fg)]"
        d="M29.61 143c.6 0 1.19.08 1.75.22v3.75a3.5 3.5 0 1 0 0 6.06v.47h1.75v-9.56a7 7 0 1 1-3.5-.94m2.29.39"
      ></path>
      <text
        xmlSpace="preserve"
        className="fill-[var(--fg)]"
        fontSize="10.24"
        fontWeight="600"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="50.83" y="145.49">
          d.to/try
        </tspan>
      </text>
      <g
        className="stroke-[var(--fg)]"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        clipPath={`url(#${id}-j)`}
      >
        <path d="M102.47 146.08h3.98c.63 0 1.14-.51 1.14-1.14v-3.98c0-.63-.51-1.14-1.14-1.14h-3.98c-.63 0-1.14.5-1.14 1.14v3.98c0 .63.5 1.14 1.14 1.14"></path>
        <path d="M100.05 144a1.14 1.14 0 0 1-.71-1.05v-3.99c0-.63.5-1.14 1.13-1.14h3.99c.48 0 .89.3 1.06.72"></path>
      </g>
      <path
        className="stroke-[var(--fg)]"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        d="M124.87 143.66h-1.29a.85.85 0 0 0-.85.85v1.28m-1.71-5.97v1.28a.85.85 0 0 1-.85.85h-1.28m3.84.01h.43m-2.14 3.83v-.42m-3.41-7.26h1.28c.24 0 .43.2.43.43v1.28c0 .23-.2.42-.43.42h-1.28a.43.43 0 0 1-.43-.42v-1.28c0-.24.2-.43.43-.43m5.55 0h1.28c.23 0 .43.2.43.43v1.28c0 .23-.2.42-.43.42h-1.28a.43.43 0 0 1-.43-.42v-1.28c0-.24.2-.43.43-.43m-5.55 5.55h1.28c.24 0 .43.19.43.43v1.28c0 .23-.2.42-.43.42h-1.28a.43.43 0 0 1-.43-.42v-1.28c0-.24.2-.43.43-.43"
      ></path>
      <g
        stroke="#A1A1A1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        clipPath={`url(#${id}-k)`}
      >
        <path d="M59.11 158.38h-4.7a.9.9 0 0 1-.89-.89v-1.79"></path>
        <path d="m57.21 156.48 1.9 1.9-1.9 1.9"></path>
      </g>
      <text
        xmlSpace="preserve"
        fill="#737373"
        fontSize="10.24"
        fontWeight="500"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="63.27" y="161.59">
          app.dub.co/register
        </tspan>
      </text>
      <path
        className="fill-[var(--bg)]"
        d="M208.12 139.4h66.22c1.24 0 2.14 0 2.86.05.62.05 1.07.14 1.44.3l.16.08c.66.34 1.22.85 1.6 1.48l.16.28c.21.4.32.9.38 1.6.06.72.06 1.62.06 2.86v7.9c0 1.24 0 2.14-.06 2.86a4.6 4.6 0 0 1-.3 1.44l-.08.16a4 4 0 0 1-1.48 1.6l-.28.16c-.4.2-.9.32-1.6.38-.72.06-1.62.06-2.86.06h-66.22c-1.23 0-2.14 0-2.85-.06a4.6 4.6 0 0 1-1.45-.3l-.16-.08a4 4 0 0 1-1.6-1.48l-.16-.28c-.2-.4-.32-.9-.38-1.6-.06-.72-.06-1.62-.06-2.86v-7.9c0-1.24 0-2.14.06-2.86.06-.7.17-1.2.38-1.6.39-.76 1-1.38 1.76-1.76.41-.2.9-.32 1.6-.38.72-.06 1.63-.06 2.86-.06Z"
      ></path>
      <path
        className="stroke-[var(--border)]"
        strokeWidth="0.73"
        d="M208.12 139.4h66.22c1.24 0 2.14 0 2.86.05.62.05 1.07.14 1.44.3l.16.08c.66.34 1.22.85 1.6 1.48l.16.28c.21.4.32.9.38 1.6.06.72.06 1.62.06 2.86v7.9c0 1.24 0 2.14-.06 2.86a4.6 4.6 0 0 1-.3 1.44l-.08.16a4 4 0 0 1-1.48 1.6l-.28.16c-.4.2-.9.32-1.6.38-.72.06-1.62.06-2.86.06h-66.22c-1.23 0-2.14 0-2.85-.06a4.6 4.6 0 0 1-1.45-.3l-.16-.08a4 4 0 0 1-1.6-1.48l-.16-.28c-.2-.4-.32-.9-.38-1.6-.06-.72-.06-1.62-.06-2.86v-7.9c0-1.24 0-2.14.06-2.86.06-.7.17-1.2.38-1.6.39-.76 1-1.38 1.76-1.76.41-.2.9-.32 1.6-.38.72-.06 1.63-.06 2.86-.06Z"
      ></path>
      <g
        className="stroke-[var(--muted)]"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
        clipPath={`url(#${id}-l)`}
      >
        <path d="m212.95 149.2 4.75 1.64c.15.05.15.25 0 .3l-2.13.8a.17.17 0 0 0-.09.1l-.8 2.13a.16.16 0 0 1-.3 0l-1.64-4.76a.16.16 0 0 1 .2-.2h0Zm2.55 2.77 2.75 2.74m-5.53-9.43v1.3m2.76-.15-.92.92m-4.6 4.6.92-.92m-2.06-1.84h1.3m-.16-2.76.92.92"></path>
      </g>
      <text
        xmlSpace="preserve"
        className="fill-[var(--muted)]"
        fontSize="8.78"
        fontWeight="500"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="223.78" y="153.19">
          65.8K clicks
        </tspan>
      </text>
      <defs>
        <clipPath id={`${id}-b`}>
          <use xlinkHref={`#${id}-m`} transform="translate(80.34 16.83)"></use>
        </clipPath>
        <clipPath id={`${id}-c`}>
          <use xlinkHref={`#${id}-n`} transform="translate(52.3 34.02)"></use>
        </clipPath>
        <clipPath id={`${id}-d`}>
          <use xlinkHref={`#${id}-o`} transform="translate(204.68 24.15)"></use>
        </clipPath>
        <clipPath id={`${id}-f`}>
          <use xlinkHref={`#${id}-m`} transform="translate(122.34 76.83)"></use>
        </clipPath>
        <clipPath id={`${id}-g`}>
          <use xlinkHref={`#${id}-n`} transform="translate(52.3 94.02)"></use>
        </clipPath>
        <clipPath id={`${id}-h`}>
          <use xlinkHref={`#${id}-o`} transform="translate(210.68 84.15)"></use>
        </clipPath>
        <clipPath id={`${id}-j`}>
          <use xlinkHref={`#${id}-m`} transform="translate(98.34 136.83)"></use>
        </clipPath>
        <clipPath id={`${id}-k`}>
          <use xlinkHref={`#${id}-n`} transform="translate(52.3 154.02)"></use>
        </clipPath>
        <clipPath id={`${id}-l`}>
          <use
            xlinkHref={`#${id}-o`}
            transform="translate(207.68 144.15)"
          ></use>
        </clipPath>
        <linearGradient
          id={`${id}-a`}
          x1="29.61"
          x2="29.61"
          y1="17.56"
          y2="42.44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#030712" stopOpacity="0"></stop>
          <stop offset="1" stopColor="#030712" stopOpacity="0.05"></stop>
        </linearGradient>
        <linearGradient
          id={`${id}-e`}
          x1="29.61"
          x2="29.61"
          y1="77.56"
          y2="102.44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#030712" stopOpacity="0"></stop>
          <stop offset="1" stopColor="#030712" stopOpacity="0.05"></stop>
        </linearGradient>
        <linearGradient
          id={`${id}-i`}
          x1="29.61"
          x2="29.61"
          y1="137.56"
          y2="162.44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#030712" stopOpacity="0"></stop>
          <stop offset="1" stopColor="#030712" stopOpacity="0.05"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
