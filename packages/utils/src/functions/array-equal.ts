export const arrayEqual = (
  a: string[],
  b: string[],
  {
    sameOrder = false,
  }: {
    sameOrder?: boolean;
  } = {},
) => {
  if (a.length !== b.length) {
    return false;
  }

  if (sameOrder) {
    return a.every((item, index) => item === b[index]);
  }

  return a.every((item) => b.includes(item));
};
