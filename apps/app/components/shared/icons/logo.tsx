export default function Logo({ className }: { className: string }) {
  return (
    <svg
      width="191"
      height="191"
      fill="currentColor"
      viewBox="0 0 191 191"
      className={className}
    >
      <g clipPath="url(#clip0_36_30)">
        <path
          fill="currentColor"
          d="M191 95.5c0 52.743-42.757 95.5-95.5 95.5S0 148.243 0 95.5 42.757 0 95.5 0 191 42.757 191 95.5z"
        ></path>
        <mask
          id="mask0_36_30"
          style={{ maskType: "alpha" }}
          width="191"
          height="191"
          x="0"
          y="0"
          maskUnits="userSpaceOnUse"
        >
          <path
            fill="currentColor"
            d="M191 95.5c0 52.743-42.757 95.5-95.5 95.5S0 148.243 0 95.5 42.757 0 95.5 0 191 42.757 191 95.5z"
          ></path>
        </mask>
        <g fill="#fff" mask="url(#mask0_36_30)">
          <circle cx="95" cy="100" r="49"></circle>
          <path d="M122-14h22v162h-22V-14z"></path>
        </g>
      </g>
      <defs>
        <clipPath id="clip0_36_30">
          <path fill="#fff" d="M0 0H191V191H0z"></path>
        </clipPath>
      </defs>{" "}
    </svg>
  );
}
