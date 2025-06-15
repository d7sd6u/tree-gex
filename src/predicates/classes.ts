import { CapturedGroups, mergeCapturedGroups } from '../capture.js';
import { matchAndCapture } from '../match.js';
import { Resolve, ResolveGroups } from '../types.js';

type MatcherRes = [matches: boolean, groups: CapturedGroups];
export abstract class Pred {
  public abstract matches(node: unknown): MatcherRes;
}
const regexSymbol = Symbol();
export class Regex extends Pred {
  constructor(private r: RegExp) {
    super();
  }
  public override matches(node: unknown): MatcherRes {
    return [typeof node === 'string' && !!this.r.exec(node), {}];
  }

  [regexSymbol] = 123;
}
const orSymbol = Symbol();
export class Or<const T, const V> extends Pred {
  constructor(
    private left: T,
    private right: V,
  ) {
    super();
  }
  public override matches(node: unknown): MatcherRes {
    for (const matcher of [this.left, this.right]) {
      const [matched, captured] = matchAndCapture(node, matcher, undefined);
      if (matched) return [true, captured];
    }
    return [false, {}] as const;
  }

  [orSymbol] = 123;
}
const andSymbol = Symbol();
export class And<const T, const V> extends Pred {
  constructor(
    private left: T,
    private right: V,
  ) {
    super();
  }

  public override matches(node: unknown): MatcherRes {
    const [leftMatched, leftCaptured] = matchAndCapture(
      node,
      this.left,
      undefined,
    );
    const [rightMatched, rightCaptured] = matchAndCapture(
      node,
      this.right,
      undefined,
    );
    if (leftMatched && rightMatched)
      return [true, mergeCapturedGroups(leftCaptured, rightCaptured)] as const;
    return [false, {}] as const;
  }

  [andSymbol] = 123;
}
const groupSymbol = Symbol();
export class Group<const P, const N extends string> extends Pred {
  constructor(
    private pattern: P,
    public name: N,
  ) {
    super();
  }
  public override matches(node: unknown): MatcherRes {
    return matchAndCapture(node, this.pattern, this.name);
  }

  [groupSymbol] = 123;
}
const arrayZeroOrOneSymbol = Symbol();
export class ArrayZeroOrOne<const P> extends Pred {
  constructor(private pattern: P) {
    super();
  }
  public override matches(node: unknown): MatcherRes {
    if (!Array.isArray(node)) return [false, {}];
    const accGroups: CapturedGroups[] = [];
    for (const el of node) {
      for (const matcher of [this.pattern]) {
        const [matched, groups] = matchAndCapture(el, matcher, undefined);
        if (matched) accGroups.push(groups);
      }
    }
    if (accGroups.length > 1) return [false, {}];
    return [true, accGroups[0] ?? {}];
  }
  [arrayZeroOrOneSymbol] = 123;
}
const arrayEverySymbol = Symbol();
export class ArrayEvery<const P> extends Pred {
  constructor(private pattern: P) {
    super();
  }
  public override matches(node: unknown): MatcherRes {
    if (!Array.isArray(node)) return [false, {}];
    const accGroups: CapturedGroups[] = [];
    for (const el of node) {
      for (const matcher of [this.pattern]) {
        const [matched, groups] = matchAndCapture(el, matcher, undefined);
        if (!matched) return [false, {}];
        accGroups.push(groups);
      }
    }
    const totalCapture = accGroups.reduce(mergeCapturedGroups, {});
    return [true, totalCapture];
  }
  [arrayEverySymbol] = 123;
}
const arrayForSymbol = Symbol();
export class ArrayFor<const P> extends Pred {
  constructor(private pattern: P) {
    super();
  }
  public override matches(node: unknown): MatcherRes {
    if (!Array.isArray(node)) return [false, {}];
    const accGroups: CapturedGroups[] = [];
    for (const el of node) {
      for (const matcher of [this.pattern]) {
        const [matched, groups] = matchAndCapture(el, matcher, undefined);
        if (matched) accGroups.push(groups);
      }
    }
    const totalCapture = accGroups.reduce(mergeCapturedGroups, {});
    return [true, totalCapture];
  }
  [arrayForSymbol] = 123;
}
const arraySomeSymbol = Symbol();
export class ArraySome<const P> extends Pred {
  constructor(private pattern: P) {
    super();
  }
  public override matches(node: unknown): MatcherRes {
    if (!Array.isArray(node)) return [false, {}];
    for (const el of node) {
      const [matched, groups] = matchAndCapture(el, this.pattern, undefined);
      if (matched) return [true, groups];
    }
    return [false, {}];
  }
  [arraySomeSymbol] = 123;
}
const anySymbol = Symbol();
export class Any extends Pred {
  constructor() {
    super();
  }
  public override matches(): MatcherRes {
    return [true, {}];
  }
  [anySymbol] = 123;
}
const customPredSymbol = Symbol();
export class CustomPred<const T> extends Pred {
  constructor(private pred: (v: unknown) => v is T) {
    super();
  }
  public override matches(node: unknown): MatcherRes {
    return [this.pred(node), {}];
  }
  [customPredSymbol] = 123;
}
const optionalSymbol = Symbol();
export class Optional<const P> extends Pred {
  constructor(private pattern: P) {
    super();
  }
  public override matches(node: unknown): MatcherRes {
    return matchAndCapture(node, this.pattern, undefined);
  }
  [optionalSymbol] = 123;
}
const coerceSymbol = Symbol();
export class Coerce<const M, const D, const S> extends Pred {
  constructor(
    private matcherOverOriginal: M,
    private fetcher: (value: Resolve<M>, groups: ResolveGroups<M>) => D,
    private matcherOverCoerced: S,
  ) {
    super();
  }
  public override matches(node: unknown): MatcherRes {
    const [matched, groups] = matchAndCapture(
      node,
      this.matcherOverOriginal,
      undefined,
    );
    if (!matched) return [false, {}];
    const coerced = this.fetcher(
      node as Resolve<M>,
      groups as ResolveGroups<M>,
    );
    const [matched2, groups2] = matchAndCapture(
      coerced,
      this.matcherOverCoerced,
      undefined,
    );
    return [matched2, mergeCapturedGroups(groups, groups2)];
  }
  [coerceSymbol] = 123;
}
