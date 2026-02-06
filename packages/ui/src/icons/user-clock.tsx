import { SVGProps } from "react";

export function UserClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9 7.25C10.519 7.25 11.75 6.019 11.75 4.5C11.75 2.981 10.519 1.75 9 1.75C7.481 1.75 6.25 2.981 6.25 4.5C6.25 6.019 7.481 7.25 9 7.25Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.39805 9.7856C9.26475 9.7758 9.13625 9.75 9.00035 9.75C6.44935 9.75 4.26135 11.28 3.29135 13.47C2.92635 14.295 3.37835 15.2439 4.23835 15.5149C5.27485 15.8423 6.61564 16.1218 8.15934 16.2041"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 10C11.7939 10 10 11.7944 10 14C10 16.2056 11.7939 18 14 18C16.2061 18 18 16.2056 18 14C18 11.7944 16.2061 10 14 10ZM16.3125 14.9502C16.1934 15.2398 15.9141 15.415 15.6191 15.415C15.5234 15.415 15.4277 15.3969 15.3339 15.3588L13.7148 14.6938C13.4336 14.5781 13.25 14.3042 13.25 14V12.25C13.25 11.8359 13.5859 11.5 14 11.5C14.4141 11.5 14.75 11.8359 14.75 12.25V13.4971L15.9043 13.9712C16.2871 14.1284 16.4707 14.5669 16.3125 14.9502Z"
        fill="currentColor"
      />
    </svg>
  );
}
