import { CapturedGroups, mergeCapturedGroups } from './capture.js';
import { CustomPredicate, predSymbol } from './predicates.js';
import { isObject } from './utils.js';

export function matchAndCapture(
  v: unknown,
  pattern: unknown,
  groupName?: string,
): [boolean, CapturedGroups] {
  const special = pattern as
    | CustomPredicate
    | string
    | number
    | symbol
    | null
    | undefined;
  if (isObject(special) && predSymbol in special) {
    const [matched, groups] = special[predSymbol](v);
    return [
      matched,
      groupName ? { [groupName]: [{ value: v, groups }] } : groups,
    ];
  }
  if (isObject(pattern) && isObject(v)) {
    const accGroups: CapturedGroups[] = [];
    for (const key in pattern) {
      if (!(key in v)) return [false, {}];
      const value = (v as Record<string, unknown>)[key];
      const [matched, groups] = matchAndCapture(
        value,
        (pattern as Record<string, unknown>)[key],
      );
      if (!matched) return [false, {}];
      accGroups.push(groups);
    }
    const totalCapture = accGroups.reduce(mergeCapturedGroups);
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
