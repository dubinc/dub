// Use the incoming value if it was provided, otherwise preserve the existing value.
export const getValue = <T>(value: T | undefined, fallback: T | null) =>
  value !== undefined ? value : fallback;
