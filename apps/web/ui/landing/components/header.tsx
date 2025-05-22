import { Logo } from "@/ui/shared/logo.tsx";
import { Button, Text } from "@radix-ui/themes";
import Link from "next/link";

export const Header = () => {
  return (
    <header className="border-border sticky left-0 right-0 top-0 z-50 h-[52px] border-b bg-white backdrop-blur-lg md:h-16">
      <nav className="mx-auto flex h-full w-full max-w-screen-xl items-center justify-between px-3 md:container md:px-20">
        <div className="flex h-[28px] items-center md:h-auto md:gap-6">
          <Logo />
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost">
            <Link href="/login" className="text-neutral">
              <Text size="3" weight="medium">
                Log In
              </Text>
            </Link>
          </Button>

          {/*<Link*/}
          {/*  href="/register"*/}
          {/*  className="bg-secondary hover:bg-secondary/90 hidden h-10 items-center justify-center rounded-md px-4 text-white md:flex"*/}
          {/*>*/}
          {/*  Registration*/}
          {/*</Link>*/}
        </div>
      </nav>
    </header>
  );
};
