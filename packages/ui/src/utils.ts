import { ReactNode } from "react";

export const pluralizeJSX = (
  func: (count: number, noun: string) => ReactNode,
  count: number,
  noun: string,
  suffix = "s",
) => {
  return func(count, `${noun}${count !== 1 ? suffix : ""}`);
};
