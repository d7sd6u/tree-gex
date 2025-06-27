import { getStructuredRes, matchAndCapture } from './match.js';
import { Resolve, ResolveGroups } from './types.js';
import { isObject } from './utils.js';

export function walk(
  a: unknown,
  cb: (v: unknown) => { value: unknown } | undefined,
  ignore?: IgnorePredicate,
) {
  const visited = new Set();
  function recurse(a: unknown): { value: unknown } {
    if (visited.has(a)) return { value: a };
    visited.add(a);
    const replacement = cb(a);
    if (replacement) return replacement;

    if (isObject(a)) {
      if (Array.isArray(a)) {
        const replaced = [];
        for (const [idx, node] of a.entries()) {
          if (!ignore?.(idx, a, node)) {
            const replacement = recurse(node);
            replaced.push(replacement.value);
          }
        }
        return { value: replaced };
      } else {
        const replaced: [string, unknown][] = [];
        for (const [key, node] of Object.entries(a)) {
          if (!ignore?.(key, a, node)) {
            const replacement = recurse(node);
            replaced.push([key, replacement.value]);
          }
        }
        return { value: Object.fromEntries(replaced) };
      }
    }
    return { value: a };
  }
  return recurse(a).value;
}
export function walkMatch<const M>(
  v: unknown,
  pattern: M,
  cb: (
    v: Resolve<M>,
    groups: ResolveGroups<M>,
    replacement?: { value: unknown },
  ) => void,
  ignore?: IgnorePredicate,
) {
  walk(
    v,
    (node): undefined => {
      const { matched, groups, replacement } = getStructuredRes(
        matchAndCapture(node, pattern),
      );
      if (matched) {
        cb(node as Resolve<M>, groups as ResolveGroups<M>, replacement);
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
        matchAndCapture(node, pattern),
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
        match: node,
        groups: groups,
        replacement,
      });
    },
    ignore,
  );

  return matches;
}
