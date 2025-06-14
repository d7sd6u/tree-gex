export const withv = <const T extends unknown[], R>(
  value: T,
  scope: (...values: T) => R,
) => scope(...value);
