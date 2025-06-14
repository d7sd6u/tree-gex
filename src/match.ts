import { CapturedGroups, mergeCapturedGroups } from './capture.js';
import { CustomPredicate, optionalSymbol, predSymbol } from './predicates.js';
import { isObject } from './utils.js';

const isSpecial = (pattern: unknown): pattern is CustomPredicate =>
  isObject(pattern) && predSymbol in pattern;
export function matchAndCapture(
  v: unknown,
  pattern: unknown,
  groupName: string | undefined,
  visited: Set<unknown> = new Set(),
): [boolean, CapturedGroups] {
  if (isObject(v)) {
    if (visited.has(v)) return [false, {}];
    visited.add(v);
  }
  if (isSpecial(pattern)) {
    const [matched, groups] = pattern[predSymbol](v);
    return [
      matched,
      groupName ? { [groupName]: [{ value: v, groups }] } : groups,
    ];
  }
  if (isObject(pattern) && isObject(v)) {
    const accGroups: CapturedGroups[] = [];
    for (const key in pattern) {
      const patternMatcher = (pattern as Record<string, unknown>)[key];
      if (!(key in v)) {
        if (isSpecial(patternMatcher) && patternMatcher[optionalSymbol])
          return [true, {}];
        return [false, {}];
      }
      const value = (v as Record<string, unknown>)[key];
      const [matched, groups] = matchAndCapture(
        value,
        patternMatcher,
        undefined,
        visited,
      );
      if (!matched) return [false, {}];
      accGroups.push(groups);
    }
    const totalCapture = accGroups.reduce(mergeCapturedGroups, {});
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
