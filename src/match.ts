import { CapturedGroups, mergeCapturedGroups } from './capture.js';
import { Optional, Pred } from './predicates/classes.js';
import { isObject } from './utils.js';

// TODO: replace MatcherRes with ReturnType of this function
export function getStructuredRes(res: MatcherRes): {
  matched: boolean;
  groups: CapturedGroups;
  replacement?: { value: unknown };
} {
  if (res.length === 3)
    return { matched: res[0], groups: res[1], replacement: { value: res[2] } };
  return { matched: res[0], groups: res[1] };
}
export function matchAndCapture(
  v: unknown,
  pattern: unknown,
  groupName?: string | undefined,
): MatcherRes {
  if (pattern instanceof Pred) {
    const { matched, groups, replacement } = getStructuredRes(
      pattern.matches(v),
    );
    return replacement
      ? [
          matched,
          groupName
            ? { [groupName]: [{ value: v, groups, replacement }] }
            : groups,
          replacement.value,
        ]
      : [matched, groupName ? { [groupName]: [{ value: v, groups }] } : groups];
  }
  if (isObject(pattern) && isObject(v)) {
    const accGroups: CapturedGroups[] = [];
    if (Array.isArray(pattern)) {
      if (!Array.isArray(v)) return [false, {}];
      if (v.length !== pattern.length) return [false, {}];
    }
    const replacements: [key: string | number | symbol, value: unknown][] = [];
    for (const key in pattern) {
      const patternMatcher = (pattern as Record<string, unknown>)[key];
      if (!(key in v)) {
        if (patternMatcher instanceof Optional) return [true, {}];
        return [false, {}];
      }
      const value = (v as Record<string, unknown>)[key];
      const { matched, groups, replacement } = getStructuredRes(
        matchAndCapture(value, patternMatcher),
      );
      if (!matched) return [false, {}];
      if (replacement) replacements.push([key, replacement.value]);
      accGroups.push(groups);
    }
    const totalCapture = accGroups.reduce(mergeCapturedGroups, {});
    if (replacements.length > 0) {
      const copy = Array.isArray(v) ? [...v] : { ...v };
      for (const [key, value] of replacements) {
        (copy as Record<string | number | symbol, unknown>)[key] = value;
      }
      return [
        true,
        groupName
          ? {
              [groupName]: [
                {
                  value: v,
                  groups: totalCapture,
                  replacement: { value: copy },
                },
              ],
            }
          : totalCapture,
        copy,
      ];
    }
    return [
      true,
      groupName
        ? { [groupName]: [{ value: v, groups: totalCapture }] }
        : totalCapture,
    ];
  }
  return [
    v === pattern,
    groupName ? { [groupName]: [{ value: v, groups: {} }] } : {},
  ];
}
export type MatcherRes =
  | [matches: boolean, groups: CapturedGroups]
  | [matches: boolean, groups: CapturedGroups, replacement: unknown];
