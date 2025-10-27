import { cn } from "@dub/utils/src";

interface IQRCardStatus {
  color: 'red' | 'green' | 'yellow';
  className?: string;
  children?: React.ReactNode;
}

const colorMap = {
  red: 'bg-red-100 text-red-600',
  green: 'bg-green-100 text-neutral-600',
  yellow: 'bg-yellow-100 text-yellow-600',
}

export function QRCardStatus({ color, className, children }: IQRCardStatus) {
  return (
    <div
      className={cn(
        "flex w-full justify-center overflow-hidden rounded-md border border-neutral-200/10 lg:w-[130px]",
        "bg-neutral-50 p-0.5 px-1 text-sm text-neutral-600 transition-colors",
        colorMap[color],
        className,
      )}
    >
      {children}
    </div>
  );
}
