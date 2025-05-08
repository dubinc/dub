import { Logo } from "@dub/ui";
import { cn } from "@dub/utils";
import Image from "next/image";

export function ModalHero() {
  return (
    <div className="relative h-48 w-full overflow-hidden bg-white">
      <BackgroundGradient className="opacity-15" />
      <Image
        src="https://assets.dub.co/misc/welcome-modal-background.svg"
        alt="Welcome to Dub"
        fill
        className="object-cover object-top"
      />
      <BackgroundGradient className="opacity-100 mix-blend-soft-light" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="aspect-square h-1/2 rounded-full bg-white">
          <Logo className="size-full" />
        </div>
      </div>
    </div>
  );
}

function BackgroundGradient({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute left-0 top-0 aspect-square w-full overflow-hidden sm:aspect-[2/1]",
        className,
      )}
    >
      <div
        className="absolute inset-0 saturate-150"
        style={{
          backgroundImage: `conic-gradient(from -66deg, #855AFC -32deg, #FF0000 63deg, #EAB308 158deg, #5CFF80 240deg, #855AFC 328deg, #FF0000 423deg)`,
        }}
      />
      <div className="absolute inset-0 backdrop-blur-[50px]" />
    </div>
  );
}
