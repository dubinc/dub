import { Logo } from "@/ui/shared/logo";
import { Button } from "@dub/ui";
import Link from "next/link";

export const Header = () => {
  return (
    <header className="border-border sticky left-0 right-0 top-0 z-50 h-[52px] border-b bg-white backdrop-blur-lg md:h-16">
      <nav className="mx-auto flex h-full w-full max-w-screen-xl items-center justify-between px-3 md:container md:px-20">
        <div className="flex h-[28px] items-center md:h-auto md:gap-6">
          <Logo />
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <span className="text-neutral hover:text-neutral/80 text-base font-medium md:hidden">
              Log In
            </span>
            <Button
              variant="ghost"
              text="Log In"
              className="text-neutral hover:text-neutral/80 hidden h-10 px-4 md:inline-flex"
            />
          </Link>
          <div className="hidden md:block">
            <Link href="/register">
              <Button
                variant="blue"
                text="Registration"
                className="bg-secondary hover:bg-secondary/90 h-10 px-4 text-white"
              />
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
};
