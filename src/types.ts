import {
  And,
  Any,
  ArrayEvery,
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
} from './predicates/classes.js';

export type ToMatch<T> = Resolve<T>;
type ToNonOptional<T, K extends keyof T = keyof T> = K extends K
  ? T[K] extends Optional<unknown>
    ? never
    : K
  : never;
type ToOptional<T, K extends keyof T = keyof T> = K extends K
  ? T[K] extends Optional<unknown>
    ? K
    : never
  : never;

export type Resolve<T> = T extends string | number | symbol | null | undefined
  ? T
  : T extends Regex
    ? string
    : T extends Any
      ? unknown
      : T extends CustomPred<infer T>
        ? T
        : T extends Coerce<infer CondMatcher, infer _Data, infer _DataMatcher>
          ? Resolve<CondMatcher>
          : T extends Or<infer Left, infer Right>
            ? Resolve<Left> | Resolve<Right>
            : T extends And<infer Left, infer Right>
              ? Resolve<Left> & Resolve<Right>
              : T extends Group<infer Pattern, string>
                ? Resolve<Pattern>
                : T extends ArrayEvery<infer Pattern>
                  ? Resolve<Pattern>[]
                  : T extends ArrayFor<infer _>
                    ? unknown[]
                    : T extends ArraySome<infer _>
                      ? unknown[]
                      : T extends ArrayZeroOrOne<infer _>
                        ? unknown[]
                        : T extends Optional<infer Pattern>
                          ? Resolve<Pattern>
                          : T extends unknown[]
                            ? { [P in keyof T]: Resolve<T[P]> }
                            : T extends readonly unknown[]
                              ? { [P in keyof T]: Resolve<T[P]> }
                              : T extends object
                                ? ToOptional<T> extends never
                                  ? { [P in keyof T]: Resolve<T[P]> }
                                  : {
                                      [P in ToNonOptional<T>]: Resolve<T[P]>;
                                    } & {
                                      [O in ToOptional<T>]?: Resolve<T[O]>;
                                    }
                                : T;
/**
 * UnionToIntersection<{ foo: string } | { bar: string }> =
 *  { foo: string } & { bar: string }.
 */
type UnionToIntersection<U> = (
  U extends unknown ? (arg: U) => 0 : never
) extends (arg: infer I) => 0
  ? I
  : never;

/**
 * LastInUnion<1 | 2> = 2.
 */
type LastInUnion<U> =
  UnionToIntersection<U extends unknown ? (x: U) => 0 : never> extends (
    x: infer L,
  ) => 0
    ? L
    : never;

export type ResolveGroups<T> = T extends Pred
  ? ResolvePred<T>
  : T extends unknown[]
    ? ResolveGroupsInArray<T>
    : T extends readonly unknown[]
      ? ResolveGroupsInReadonlyArray<T>
      : T extends Record<string, unknown>
        ? ResolveGroupsInRecord<T>
        : {};
export type ResolveGroupsInRecord<
  T,
  U extends keyof T = keyof T,
  Last = LastInUnion<U>,
> = [U] extends [never]
  ? {}
  : ResolveGroupsInRecord<T, Exclude<U, Last>> &
      ResolveGroups<T[Last & keyof T]>;
type ResolveGroupsInReadonlyArray<A extends readonly unknown[]> =
  A extends readonly [infer Head, ...infer Tail]
    ? ResolveGroupsInReadonlyArray<Tail> & ResolveGroups<Head>
    : {};
type ResolveGroupsInArray<A extends unknown[]> = ResolveGroups<A[number]>;
type ResolvePred<T> =
  T extends Group<infer Pattern, infer Name>
    ? {
        [P in Name]: [
          {
            value: Resolve<Pattern>;
            groups: ResolveGroups<Pattern>;
            replacement?: {
              value: unknown;
            };
          },
        ];
      }
    : T extends ArraySome<infer Pattern>
      ? ToOneOrMore<ResolveGroups<Pattern>>
      : T extends ArrayZeroOrOne<infer Pattern>
        ? ToZeroOrOne<ResolveGroups<Pattern>>
        : T extends ArrayEvery<infer Pattern>
          ? ToMultipleMatches<ResolveGroups<Pattern>>
          : T extends ArrayFor<infer Pattern>
            ? ToMultipleMatches<ResolveGroups<Pattern>>
            : T extends ArraySome<infer Pattern>
              ? ToOneOrMore<ResolveGroups<Pattern>>
              : T extends Optional<infer Pattern>
                ? ToZeroOrOne<ResolveGroups<Pattern>>
                : T extends Or<infer Left, infer Right>
                  ? ResolveOrGroups<Left, Right>
                  : T extends And<infer Left, infer Right>
                    ? ResolveGroups<Left> & ResolveGroups<Right>
                    : T extends Coerce<
                          infer CondMatcher,
                          infer _Data,
                          infer DataMatcher
                        >
                      ? ResolveGroups<CondMatcher> & ResolveGroups<DataMatcher>
                      : {};
type ResolveOrGroups<Left, Right> = {
  [P in keyof ResolveGroups<Left> & keyof ResolveGroups<Right>]:
    | ResolveGroups<Left>[P & keyof ResolveGroups<Left>]
    | ResolveGroups<Right>[P & keyof ResolveGroups<Right>];
} & {
  [P in Exclude<
    keyof ResolveGroups<Left> | keyof ResolveGroups<Right>,
    keyof ResolveGroups<Left> & keyof ResolveGroups<Right>
  >]?:
    | ResolveGroups<Left>[P & keyof ResolveGroups<Left>]
    | ResolveGroups<Right>[P & keyof ResolveGroups<Right>];
};
type ToMultipleMatches<T> =
  T extends Partial<Record<string, { value: unknown; groups: unknown }[]>>
    ? {
        [P in keyof T]?: [
          NonNullable<T[P]>[number],
          ...NonNullable<T[P]>[number][],
        ];
      }
    : never;
type ToOneOrMore<T> =
  T extends Partial<Record<string, { value: unknown; groups: unknown }[]>>
    ? {
        [P in keyof T]: [
          NonNullable<T[P]>[number],
          ...NonNullable<T[P]>[number][],
        ];
      }
    : never;
type ToZeroOrOne<T> =
  T extends Partial<Record<string, { value: unknown; groups: unknown }[]>>
    ? {
        [P in keyof T]?: [NonNullable<T[P]>[number]];
      }
    : never;
