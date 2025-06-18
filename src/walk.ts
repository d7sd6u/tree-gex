import { CapturedGroups } from './capture.js';
import { matchAndCapture } from './match.js';
import { Resolve, ResolveGroups } from './types.js';
import { isObject } from './utils.js';

export function walk(
  a: unknown,
  cb: (v: unknown) => void,
  ignore?: IgnorePredicate,
) {
  const visited = new Set();
  function recurse(a: unknown) {
    if (visited.has(a)) return;
    visited.add(a);
    cb(a);
    if (isObject(a)) {
      if (Array.isArray(a)) {
        for (const [idx, node] of a.entries()) {
          if (!ignore?.(idx, a, node)) {
            recurse(node);
          }
        }
      } else {
        for (const [key, node] of Object.entries(a)) {
          if (!ignore?.(key, a, node)) {
            recurse(node);
          }
        }
      }
    }
  }
  recurse(a);
}
export function walkMatch(
  v: unknown,
  pattern: unknown,
  cb: (v: unknown, groups: CapturedGroups) => void,
  ignore?: IgnorePredicate,
) {
  walk(
    v,
    (node) => {
      const [matched, groups] = matchAndCapture(node, pattern, undefined);
      if (matched) {
        cb(node, groups);
      }
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
): { match: Resolve<P>; groups: ResolveGroups<P> }[] {
  const matches: { match: Resolve<P>; groups: ResolveGroups<P> }[] = [];

  walkMatch(
    v,
    pattern,
    (node, groups) => {
      matches.push({
        match: node as Resolve<P>,
        groups: groups as ResolveGroups<P>,
      });
    },
    ignore,
  );

  return matches;
}
