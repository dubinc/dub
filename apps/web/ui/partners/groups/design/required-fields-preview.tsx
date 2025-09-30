const RequiredFieldItemPreview = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg bg-blue-100 py-4">
      <div className="relative h-4 w-4">{icon}</div>
      <div className="text-sm font-medium text-blue-900">{label}</div>
    </div>
  );
};

const RequiredFieldsPreview = () => {
  return (
    <div className="rounded-[10px] border border-blue-200 bg-blue-50 px-4 pb-2 pt-4">
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
        <RequiredFieldItemPreview icon={<SignatureIcon />} label="Name" />
        <RequiredFieldItemPreview icon={<EmailIcon />} label="Email" />
        <RequiredFieldItemPreview icon={<CountryIcon />} label="Country" />
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <div className="relative h-4 w-4">
          <LockIcon />
        </div>
        <div className="text-sm font-medium text-blue-900">
          Mandatory fields
        </div>
      </div>
    </div>
  );
};

const SignatureIcon = () => {
  return (
    <svg
      width="19"
      height="18"
      viewBox="0 0 19 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="size-[18px]"
    >
      <path
        d="M1.91669 12.25H16.4167"
        stroke="#1C398E"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.52169 7.0429C1.69369 5.7849 2.25069 2.1759 5.17069 2.5229C7.63369 2.8159 9.25269 8.4679 8.85069 12.8949C8.76769 13.8079 8.44369 15.2569 7.15969 15.4679C6.19969 15.6259 5.18069 15.1919 4.74169 14.2749C3.15069 10.7779 8.79869 5.0129 10.9077 6.1169C12.0397 6.7099 11.3267 8.6909 12.2147 8.8859C12.8597 9.0279 13.3307 7.7589 13.9237 7.9089C14.4737 8.0479 14.3727 8.9159 14.9627 9.0819C15.2257 9.1559 15.4977 9.1289 15.6667 8.9569"
        stroke="#1C398E"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const EmailIcon = () => {
  return (
    <svg
      width="19"
      height="18"
      viewBox="0 0 19 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="size-[18px]"
    >
      <path
        d="M2.25 5.75L9.017 9.483C9.318 9.649 9.682 9.649 9.983 9.483L16.75 5.75"
        stroke="#1C398E"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.25 14.75L14.75 14.75C15.8546 14.75 16.75 13.8546 16.75 12.75V5.25C16.75 4.14543 15.8546 3.25 14.75 3.25L4.25 3.25C3.14543 3.25 2.25 4.14543 2.25 5.25L2.25 12.75C2.25 13.8546 3.14543 14.75 4.25 14.75Z"
        stroke="#1C398E"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const CountryIcon = () => {
  return (
    <svg
      width="19"
      height="18"
      viewBox="0 0 19 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="size-[18px]"
    >
      <g clipPath="url(#clip0_2001_4832)">
        <path
          d="M13.8342 2.98072L12.3227 2.90943C11.3282 2.86253 10.5689 3.78613 10.8071 4.75273L11.0791 5.85623C11.1385 6.09733 11.042 6.34993 10.837 6.48993C10.6714 6.60303 10.46 6.62513 10.2746 6.54873L9.34748 6.16663C8.62258 5.86783 7.79498 5.96233 7.15608 6.41693C6.59028 6.81943 6.23868 7.45783 6.20088 8.15113L6.12988 9.45323"
          stroke="#1C398E"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.8334 16.75C14.8334 16.75 12.0834 15.241 12.0834 13C12.0834 11.481 13.3144 10.25 14.8334 10.25C16.3524 10.25 17.5834 11.481 17.5834 13C17.5834 15.241 14.8334 16.75 14.8334 16.75Z"
          stroke="#1C398E"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.8334 13.75C15.2474 13.75 15.5834 13.4142 15.5834 13C15.5834 12.5858 15.2474 12.25 14.8334 12.25C14.4194 12.25 14.0834 12.5858 14.0834 13C14.0834 13.4142 14.4194 13.75 14.8334 13.75Z"
          fill="#1C398E"
        />
        <path
          d="M3.42505 5.74561C3.85365 6.86961 4.80365 8.68821 6.32995 9.68311C6.75585 9.91771 7.73366 10.681 7.66566 11.8893C7.57246 13.5436 8.57834 13.6635 9.37714 14.2579C9.78724 14.563 9.89175 15.5008 9.83175 16.2409"
          stroke="#1C398E"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.58759 9.84737C7.51069 9.65277 8.60939 9.32137 9.85959 10.0263"
          stroke="#1C398E"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.83337 16.25C5.82927 16.25 2.58337 13.0041 2.58337 9C2.58337 4.9959 5.82927 1.75 9.83337 1.75C13.3602 1.75 16.2987 4.2682 16.9492 7.6046"
          stroke="#1C398E"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_2001_4832">
          <rect
            width="18"
            height="18"
            fill="white"
            transform="translate(0.833374)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

const LockIcon = () => {
  return (
    <svg
      width="17"
      height="16"
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="size-[16px]"
    >
      <path
        d="M5.61115 7.33344V4.44455C5.61115 2.849 6.90448 1.55566 8.50003 1.55566C10.0956 1.55566 11.3889 2.849 11.3889 4.44455V7.33344"
        stroke="#2B7FFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 10.4446V11.3335"
        stroke="#2B7FFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.8334 7.3335H5.16669C4.18485 7.3335 3.38892 8.12943 3.38892 9.11127V12.6668C3.38892 13.6487 4.18485 14.4446 5.16669 14.4446H11.8334C12.8152 14.4446 13.6111 13.6487 13.6111 12.6668V9.11127C13.6111 8.12943 12.8152 7.3335 11.8334 7.3335Z"
        stroke="#2B7FFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default RequiredFieldsPreview;
