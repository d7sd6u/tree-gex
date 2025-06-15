import { Resolve, ResolveGroups } from '../types.js';
import {
  And,
  Any,
  ArrayFor,
  ArraySome,
  ArrayZeroOrOne,
  Coerce,
  CustomPred,
  Group,
  Optional,
  Or,
  Pred,
  Regex,
} from './classes.js';

export type CustomPredicate = Pred;
export const pred = <const T>(pred: (node: unknown) => node is T) =>
  new CustomPred(pred);

export const coerce = <const A, const B, const C>(
  matcherOverOriginal: A,
  coercer: (node: Resolve<A>, groups: ResolveGroups<A>) => B,
  matcherOverCoerced: C,
): CustomPredicate =>
  new Coerce(matcherOverOriginal, coercer, matcherOverCoerced);
export const optional = <const P>(pattern: P) => new Optional(pattern);
export const group = <const P, const G extends string>(
  pattern: P,
  groupName: G,
) => new Group(pattern, groupName);
export const nothrow = <const T>(v: (node: unknown) => asserts node is T) =>
  new CustomPred((node): node is T => {
    try {
      v(node);
      return true;
    } catch {
      return false;
    }
  });
export { pred as p, nothrow as n, nothrow as a, nothrow as assert };

export const regex = (r: RegExp) => new Regex(r);
export const any = () => new Any();
export const string = () => new CustomPred((v) => typeof v === 'string');

export const arraySome = <const T>(matcher: T) => new ArraySome(matcher);
export const arrayZeroOrOne = <const T>(matcher: T) =>
  new ArrayZeroOrOne(matcher);
export const arrayFor = <const T>(matcher: T) => new ArrayFor(matcher);
export const or = <const L, const R>(left: L, right: R) => new Or(left, right);
export const or3 = <const L, const R, const X>(left: L, right: R, third: X) =>
  new Or(new Or(left, right), third);
export const or4 = <const L, const R, const X, const Y>(
  left: L,
  right: R,
  third: X,
  fourth: Y,
) => new Or(new Or(new Or(left, right), third), fourth);
export const and = <const L, const R>(left: L, right: R) =>
  new And(left, right);
