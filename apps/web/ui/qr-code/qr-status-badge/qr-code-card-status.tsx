import { cn } from "@dub/utils/src";

interface IQRCardStatus {
  archived: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function QRCardStatus({ archived, className, children }: IQRCardStatus) {
  return (
    <div
      className={cn(
        "flex w-full justify-center overflow-hidden rounded-md border border-neutral-200/10 lg:w-[130px]",
        "bg-neutral-50 p-0.5 px-1 text-sm text-neutral-600 transition-colors hover:bg-neutral-100",
        archived ? "bg-red-100 text-red-600" : "bg-green-100 text-neutral-600",
        className,
      )}
    >
      {children}
    </div>
  );
}
