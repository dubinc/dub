import { SVGProps } from "react";

export function Crown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="currentColor">
        <circle cx="9" cy="2.25" fill="currentColor" r="1" />
        <circle cx="2" cy="5" fill="currentColor" r="1" />
        <circle cx="16" cy="5" fill="currentColor" r="1" />
        <path
          d="M15.426,6.882c-.244-.168-.566-.176-.819-.021l-2.609,1.605-2.357-3.858c-.272-.446-1.008-.446-1.28,0l-2.357,3.858-2.609-1.605c-.253-.155-.574-.147-.819,.021-.245,.169-.367,.466-.311,.758l.845,4.437c.157,.825,.88,1.423,1.719,1.423H13.172c.839,0,1.562-.598,1.719-1.423l.845-4.437c.056-.292-.066-.589-.311-.758Z"
          fill="currentColor"
        />
        <path
          d="M14,14.5H4c-.414,0-.75,.336-.75,.75s.336,.75,.75,.75H14c.414,0,.75-.336,.75-.75s-.336-.75-.75-.75Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
