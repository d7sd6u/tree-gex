import { CapturedGroups, mergeCapturedGroups } from './capture.js';
import { matchAndCapture } from './match.js';

export type CustomPredicate = {
  [predSymbol]: (node: unknown) => [boolean, CapturedGroups];
};
export const predSymbol = Symbol('Custom predicate for walk.ts');
export const pred = (
  pred: (node: unknown) => boolean | [boolean, CapturedGroups],
  groupName?: string,
): CustomPredicate => ({
  [predSymbol]: (n): [boolean, CapturedGroups] => {
    const res = pred(n);
    const matched = typeof res === 'boolean' ? res : res[0];
    const groups = typeof res === 'boolean' ? {} : res[1];

    if (groupName) {
      return [matched, { [groupName]: [{ value: n, groups }] }];
    }
    return [matched, groups];
  },
});
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

export const or = (left: unknown, right: unknown) =>
  pred((n) => {
    const [leftMatched, leftCaptured] = matchAndCapture(n, left);
    if (leftMatched) return [leftMatched, leftCaptured] as const;
    const [rightMatched, rightCaptured] = matchAndCapture(n, right);
    if (rightMatched) return [rightMatched, rightCaptured] as const;
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
