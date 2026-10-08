import { CustomerCarousel } from "./customer-carousel";
import { CustomerLogos } from "./customer-logos";

export function SidePanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden border-l border-black/5 bg-neutral-50 min-[900px]:flex">
      {/* Customer carousel - vertically centered */}
      <div className="relative flex grow items-center justify-center p-8 lg:p-14">
        <CustomerCarousel />
      </div>

      <CustomerLogos />
    </div>
  );
}
