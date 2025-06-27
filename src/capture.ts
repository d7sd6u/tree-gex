export function mergeCapturedGroups(
  left: CapturedGroups,
  right: CapturedGroups,
) {
  const acc: CapturedGroups = {};
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    acc[key] = [];
    if (left[key]) acc[key].push(...left[key]);
    if (right[key]) acc[key].push(...right[key]);
  }
  return acc;
}
export type CapturedGroups = Record<
  string,
  { value: unknown; groups: CapturedGroups; replacement?: { value: unknown } }[]
>;
