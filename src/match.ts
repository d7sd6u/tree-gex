import { CapturedGroups, mergeCapturedGroups } from './capture.js';
import { Optional, Pred } from './predicates/classes.js';
import { isObject } from './utils.js';

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
  if (pattern instanceof Pred) {
    const [matched, groups] = pattern.matches(v);
    return [
      matched,
      groupName ? { [groupName]: [{ value: v, groups }] } : groups,
    ];
  }
  if (isObject(pattern) && isObject(v)) {
    const accGroups: CapturedGroups[] = [];
    if (Array.isArray(pattern)) {
      if (!Array.isArray(v)) return [false, {}];
      if (v.length !== pattern.length) return [false, {}];
    }
    for (const key in pattern) {
      const patternMatcher = (pattern as Record<string, unknown>)[key];
      if (!(key in v)) {
        if (patternMatcher instanceof Optional) return [true, {}];
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
