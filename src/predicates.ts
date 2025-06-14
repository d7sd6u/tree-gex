import { CapturedGroups, mergeCapturedGroups } from './capture.js';
import { matchAndCapture } from './match.js';

export type CustomPredicate = {
  [predSymbol]: (node: unknown) => [boolean, CapturedGroups];
  [optionalSymbol]: boolean;
};
export const predSymbol = Symbol('Custom predicate for walk.ts');
export const optionalSymbol = Symbol('Optional predicate property for walk.ts');
export const pred = (
  pred: (node: unknown) => boolean | [boolean, CapturedGroups],
  optional?: boolean,
): CustomPredicate => ({
  [predSymbol]: (n): [boolean, CapturedGroups] => {
    const res = pred(n);
    const matched = typeof res === 'boolean' ? res : res[0];
    const groups = typeof res === 'boolean' ? {} : res[1];

    return [matched, groups];
  },
  [optionalSymbol]: !!optional,
});
export const coerce = (
  matcherOverOriginal: unknown,
  coercer: (node: unknown, groups: CapturedGroups) => unknown,
  matcherOverCoerced: unknown,
): CustomPredicate => ({
  [predSymbol]: (n): [boolean, CapturedGroups] => {
    const [matched, groups] = matchAndCapture(
      n,
      matcherOverOriginal,
      undefined,
    );
    if (!matched) return [false, {}];
    const coerced = coercer(n, groups);
    const [matched2, groups2] = matchAndCapture(
      coerced,
      matcherOverCoerced,
      undefined,
    );
    return [matched2, mergeCapturedGroups(groups, groups2)];
  },
  [optionalSymbol]: false,
});
export const optional = (pattern: unknown) =>
  pred((node) => matchAndCapture(node, pattern, undefined), true);
export const group = (pattern: unknown, groupName: string) =>
  pred((node) => matchAndCapture(node, pattern, groupName));
export const nothrow = (v: (node: unknown) => void) =>
  pred((node) => {
    try {
      v(node);
      return true;
    } catch {
      return false;
    }
  });
export { pred as p, nothrow as n, nothrow as a, nothrow as assert };

export const regex = (r: RegExp, outputRegexGroups?: boolean) =>
  pred((n) => {
    if (typeof n !== 'string') return false;
    const res = r.exec(n);
    if (!res) return false;
    if (outputRegexGroups)
      return [
        true,
        Object.fromEntries(
          [...Object.entries(res.groups ?? {}), ...res.entries()].map(
            ([k, v]) => [k, [{ value: v, groups: {} }]],
          ),
        ),
      ];
    return true;
  });
export const any = () => pred(() => true);
export const string = () => pred((n) => typeof n === 'string');

export const arraySome = (matcher: unknown) =>
  pred((v) => {
    if (!Array.isArray(v)) return false;
    for (const el of v) {
      const [matched, groups] = matchAndCapture(el, matcher);
      if (matched) return [true, groups];
    }
    return [false, {}];
  });
export const arrayZeroOrOne = (matcher: unknown) =>
  pred((v) => {
    if (!Array.isArray(v)) return false;
    for (const el of v) {
      const [matched, groups] = matchAndCapture(el, matcher);
      if (matched) return [true, groups];
    }
    return [true, {}];
  });
export const arrayFor = (...matchers: unknown[]) =>
  pred((v) => {
    if (!Array.isArray(v)) return false;
    const accGroups: CapturedGroups[] = [];
    for (const el of v) {
      for (const matcher of matchers) {
        const [matched, groups] = matchAndCapture(el, matcher);
        if (matched) accGroups.push(groups);
      }
    }
    const totalCapture = accGroups.reduce(mergeCapturedGroups, {});
    return [true, totalCapture];
  });
export const or = (...matchers: [unknown, unknown, ...unknown[]]) =>
  pred((n) => {
    for (const matcher of matchers) {
      const [matched, captured] = matchAndCapture(n, matcher);
      if (matched) return [true, captured];
    }
    return [false, {}] as const;
  });
export const and = (left: unknown, right: unknown) =>
  pred((n) => {
    const [leftMatched, leftCaptured] = matchAndCapture(n, left);
    const [rightMatched, rightCaptured] = matchAndCapture(n, right);
    if (leftMatched && rightMatched)
      return [true, mergeCapturedGroups(leftCaptured, rightCaptured)] as const;
    return [false, {}] as const;
  });
