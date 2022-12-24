export default function Logo({ className }: { className: string }) {
  return (
    <svg
      width="191"
      height="191"
      fill="currentColor"
      viewBox="0 0 191 191"
      className={className}
    >
      <g clipPath="url(#clip0_928_108)">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M122-14h22v27.215a94.965 94.965 0 00-22-9.49V-14zm0 17.725A95.548 95.548 0 0095.5 0C42.757 0 0 42.757 0 95.5S42.757 191 95.5 191 191 148.243 191 95.5c0-35.038-18.869-65.669-47-82.285V148h-22v-7.103A48.776 48.776 0 0195 149c-27.062 0-49-21.938-49-49s21.938-49 49-49a48.773 48.773 0 0127 8.103V3.725z"
          clipRule="evenodd"
        ></path>
      </g>
      <defs>
        <clipPath id="clip0_928_108">
          <rect width="191" height="191" fill="#fff" rx="95.5"></rect>
        </clipPath>
      </defs>
    </svg>
  );
}
