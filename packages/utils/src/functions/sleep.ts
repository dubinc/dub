export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
