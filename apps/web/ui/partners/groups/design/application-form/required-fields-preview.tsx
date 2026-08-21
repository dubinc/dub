import { Tooltip, UserCheck } from "@dub/ui";
import { cn } from "@dub/utils";

const RequiredFieldItemPreview = ({
  icon,
  label,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
}) => {
  const tile = (
    <div
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-100 py-2",
        tooltip &&
          "cursor-help transition-colors duration-150 hover:bg-blue-200/60",
      )}
    >
      <div className="relative h-4 w-4">{icon}</div>
      <div className="text-sm font-medium text-blue-900">{label}</div>
    </div>
  );

  return tooltip ? <Tooltip content={tooltip}>{tile}</Tooltip> : tile;
};

const RequiredFieldsPreview = () => {
  return (
    <div className="rounded-xl bg-blue-50 px-1 pb-1.5 pt-1">
      <div className="grid w-full grid-cols-1 gap-1 sm:grid-cols-2">
        <RequiredFieldItemPreview
          icon={<SignatureIcon />}
          label="Name"
          tooltip="The partner's name when their Dub account is created"
        />
        <RequiredFieldItemPreview
          icon={<EmailIcon />}
          label="Email"
          tooltip="The partner's email when their Dub account is created"
        />
      </div>
      <div className="mt-1 flex items-center justify-center gap-1.5">
        <UserCheck className="size-4 text-blue-500" />
        <span className="text-xs font-medium text-blue-900">
          Required applicant fields
        </span>
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

export default RequiredFieldsPreview;
