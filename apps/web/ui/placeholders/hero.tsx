import { Grid } from "@dub/ui";
import { PropsWithChildren } from "react";

const HERO_GRADIENT = `radial-gradient(77% 116% at 37% 67%, #EEA5BA, rgba(238, 165, 186, 0) 50%),
  radial-gradient(56% 84% at 34% 56%, #3A8BFD, rgba(58, 139, 253, 0) 50%),
  radial-gradient(85% 127% at 100% 100%, #E4C795, rgba(228, 199, 149, 0) 50%),
  radial-gradient(82% 122% at 3% 29%, #855AFC, rgba(133, 90, 252, 0) 50%),
  radial-gradient(90% 136% at 52% 100%, #FD3A4E, rgba(253, 58, 78, 0) 50%),
  radial-gradient(102% 143% at 92% 7%, #72FE7D, rgba(114, 254, 125, 0) 50%)`;

export function Hero({ children }: PropsWithChildren) {
  return (
    <div className="relative mx-auto mt-4 w-full max-w-screen-lg overflow-hidden rounded-2xl bg-neutral-50 p-6 text-center sm:p-20 sm:px-0">
      <Grid
        cellSize={80}
        patternOffset={[1, -58]}
        className="inset-[unset] left-1/2 top-0 w-[1200px] -translate-x-1/2 text-neutral-300 [mask-image:linear-gradient(transparent,black_70%)]"
      />
      <div className="absolute -inset-x-10 bottom-0 h-[60%] opacity-40 blur-[100px] [transform:translate3d(0,0,0)]">
        <div
          className="size-full -scale-y-100 [mask-image:radial-gradient(closest-side,black_100%,transparent_100%)]"
          style={{ backgroundImage: HERO_GRADIENT }}
        />
      </div>
      {children}
    </div>
  );
}
