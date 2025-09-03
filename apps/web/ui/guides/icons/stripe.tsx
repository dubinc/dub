import { SVGProps, useId } from "react";

export function Stripe(props: SVGProps<SVGSVGElement>) {
  const id = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="45"
      height="44"
      fill="none"
      viewBox="0 0 45 44"
      {...props}
    >
      <g
        fillRule="evenodd"
        clipPath={`url(#${id}-clip-path)`}
        clipRule="evenodd"
      >
        <path fill="#635BFF" d="M.667 0h44v44h-44z"></path>
        <path
          fill="#fff"
          d="M20.95 17.105c0-1.034.848-1.441 2.256-1.441 2.024 0 4.576.616 6.6 1.705V11.12c-2.212-.88-4.39-1.221-6.59-1.221-5.4 0-8.987 2.816-8.987 7.524 0 7.337 10.11 6.17 10.11 9.339 0 1.22-1.067 1.617-2.552 1.617-2.211 0-5.027-.902-7.26-2.123v6.325a18.4 18.4 0 0 0 7.26 1.518c5.533 0 9.339-2.74 9.339-7.502-.045-7.92-10.175-6.512-10.175-9.493"
        ></path>
      </g>
      <defs>
        <clipPath id={`${id}-clip-path`}>
          <rect width="44" height="44" x="0.667" fill="#fff" rx="6"></rect>
        </clipPath>
      </defs>
    </svg>
  );
}
