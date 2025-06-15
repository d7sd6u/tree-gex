import { CapturedGroups } from './capture.js';
import { matchAndCapture } from './match.js';
import { Resolve, ResolveGroups } from './types.js';
import { isObject } from './utils.js';

export function walk(
  a: unknown,
  cb: (v: unknown) => void,
  visited: Set<unknown> = new Set(),
) {
  if (visited.has(a)) return;
  visited.add(a);
  cb(a);
  if (isObject(a)) {
    if (Array.isArray(a)) {
      return a.forEach((v) => walk(v, cb, visited));
    }
    return Object.values(a).forEach((v) => walk(v, cb, visited));
  }
}
export function walkMatch(
  v: unknown,
  pattern: unknown,
  cb: (v: unknown, groups: CapturedGroups) => void,
) {
  walk(v, (node) => {
    const [matched, groups] = matchAndCapture(node, pattern, undefined);
    if (matched) {
      cb(node, groups);
    }
  });
}

export function accumWalkMatch<const P>(
  v: unknown,
  pattern: P,
): { match: Resolve<P>; groups: ResolveGroups<P> }[] {
  const matches: { match: Resolve<P>; groups: ResolveGroups<P> }[] = [];

  walkMatch(v, pattern, (node, groups) => {
    matches.push({
      match: node as Resolve<P>,
      groups: groups as ResolveGroups<P>,
    });
  });

  return matches;
}
