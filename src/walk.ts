import { CapturedGroups } from './capture.js';
import { getStructuredRes, matchAndCapture } from './match.js';
import { Resolve, ResolveGroups } from './types.js';
import { isObject } from './utils.js';

export function walk(
  a: unknown,
  cb: (v: unknown) => { value: unknown } | undefined,
  ignore?: IgnorePredicate,
) {
  const visited = new Set();
  function recurse(a: unknown): { value: unknown } | undefined {
    if (visited.has(a)) return;
    visited.add(a);
    const replacement = cb(a);
    if (replacement) return replacement;

    if (isObject(a)) {
      let wasReplaced = false;
      if (Array.isArray(a)) {
        const replaced = [];
        for (const [idx, node] of a.entries()) {
          if (!ignore?.(idx, a, node)) {
            const replacement = recurse(node);
            if (replacement) {
              replaced.push(replacement.value);
              wasReplaced = true;
            } else replaced.push(node);
          }
        }
        if (!wasReplaced) return { value: a };
        return { value: replaced };
      } else {
        const replaced: [string, unknown][] = [];
        for (const [key, node] of Object.entries(a)) {
          if (!ignore?.(key, a, node)) {
            const replacement = recurse(node);
            if (replacement) {
              replaced.push([key, replacement.value]);
              wasReplaced = true;
            } else replaced.push([key, node]);
          }
        }
        if (!wasReplaced) return { value: a };
        return { value: Object.fromEntries(replaced) };
      }
    }
    return { value: a };
  }
  const res = recurse(a);
  if (res) return res.value;
  return a;
}
export function walkMatch(
  v: unknown,
  pattern: unknown,
  cb: (
    v: unknown,
    groups: CapturedGroups,
    replacement?: { value: unknown },
  ) => void,
  ignore?: IgnorePredicate,
) {
  walk(
    v,
    (node): undefined => {
      const { matched, groups, replacement } = getStructuredRes(
        matchAndCapture(node, pattern, undefined),
      );
      if (matched) {
        cb(node, groups, replacement);
      }
    },
    ignore,
  );
}

export function walkReplace(
  v: unknown,
  pattern: unknown,
  ignore?: IgnorePredicate,
) {
  return walk(
    v,
    (node) => {
      const { matched, replacement } = getStructuredRes(
        matchAndCapture(node, pattern, undefined),
      );
      if (matched) {
        return replacement;
      }
      return;
    },
    ignore,
  );
}

type IgnorePredicate = (
  key: string | number | symbol,
  parent: object | Array<unknown>,
  node: unknown,
) => boolean;

export function accumWalkMatch<const P>(
  v: unknown,
  pattern: P,
  ignore?: IgnorePredicate,
) {
  const matches: {
    match: Resolve<P>;
    groups: ResolveGroups<P>;
    replacement?: { value: unknown } | undefined;
  }[] = [];

  walkMatch(
    v,
    pattern,
    (node, groups, replacement) => {
      matches.push({
        match: node as Resolve<P>,
        groups: groups as ResolveGroups<P>,
        replacement,
      });
    },
    ignore,
  );

  return matches;
}
