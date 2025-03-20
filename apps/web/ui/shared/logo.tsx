import QRIcon from "@/ui/shared/icons/qr";
import { cn } from "@dub/utils";
import Link from "next/link";

interface LogoProps {
  className?: string;
  isInApp?: boolean;
}

export const Logo = ({ className, isInApp = false }: LogoProps) => {
  const href = isInApp ? "/" : "/landing";

  return (
    <Link href={href} className={cn("flex items-center gap-1.5", className)}>
      <QRIcon className="text-primary h-7 w-7" />
      <div className="font-default text-neutral text-[22px] leading-[21px]">
        <span className="font-medium">Get</span>
        <span className="font-bold">QR</span>
      </div>
    </Link>
  );
};
