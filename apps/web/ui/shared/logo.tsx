import QRIcon from "@/ui/shared/icons/qr";
import { cn } from "@dub/utils";
import Link from "next/link";

interface LogoProps {
  className?: string;
}

export const Logo = ({ className }: LogoProps) => {
  return (
    <Link href={"/"} className={cn("flex items-center gap-1.5", className)}>
      <QRIcon className="text-primary h-5 w-5" />
      <div className="font-default text-neutral text-lg">
        <span className="font-medium">Get</span>
        <span className="font-bold">QR</span>
      </div>
    </Link>
  );
};
