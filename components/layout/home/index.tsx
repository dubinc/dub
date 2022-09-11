import { ReactNode } from "react";
import Meta from "../meta";
import DynamicIsland from "./dynamic-island";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <Meta />
      {/* <DynamicIsland /> */}
      {children}
    </div>
  );
}
