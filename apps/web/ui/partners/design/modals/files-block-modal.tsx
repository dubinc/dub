import { useId } from "react";

export function FilesBlockThumbnail() {
  const id = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="168"
      height="100"
      fill="none"
      viewBox="0 0 168 100"
      className="h-auto w-full"
    >
      <g clipPath={`url(#${id}-a)`}>
        <path
          fill="#fff"
          d="M26.27 30.595H181.5v39.811H26.27a4.77 4.77 0 0 1-4.77-4.77v-30.27a4.77 4.77 0 0 1 4.77-4.771"
        />
        <path
          stroke="#E5E5E5"
          d="M26.27 30.595H181.5v39.811H26.27a4.77 4.77 0 0 1-4.77-4.77v-30.27a4.77 4.77 0 0 1 4.77-4.771Z"
        />
        <path
          stroke="#E5E5E5"
          strokeWidth="0.659"
          d="M32.859 39.63h14.493a3.624 3.624 0 0 1 3.623 3.624v14.493a3.623 3.623 0 0 1-3.623 3.623H32.859a3.624 3.624 0 0 1-3.624-3.623V43.254a3.624 3.624 0 0 1 3.624-3.624Z"
        />
        <path
          fill="#000"
          d="M48.105 50.5a7.905 7.905 0 0 0-15.81 0 7.905 7.905 0 0 0 15.81 0"
        />
        <circle
          cx="1.854"
          cy="1.854"
          r="1.854"
          fill="#fff"
          transform="matrix(-1 0 0 1 44.718 50.145)"
        />
        <path fill="#fff" d="M42.046 46.503H38.73l-3.154 7.35h3.317z" />
        <text
          xmlSpace="preserve"
          fill="#262626"
          fontSize="9.223"
          fontWeight="500"
          letterSpacing="-.02em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="61.845" y="47.942">
            Primary logo
          </tspan>
        </text>
        <text
          xmlSpace="preserve"
          fill="#737373"
          fontSize="7.906"
          letterSpacing="-.02em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="61.845" y="60.145">
            SVG
          </tspan>
        </text>
      </g>
      <defs>
        <clipPath id={`${id}-a`}>
          <path fill="#fff" d="M0 0h168v100H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
