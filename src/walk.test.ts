import { describe, expect, expectTypeOf, it, test } from 'vitest';

import * as w from './index.js';

describe('matching', () => {
  test('it matches strings', () => {
    const matches = w.accumWalkMatch(
      {
        matches: { field: 'somestring' },
        nonmatching: { field: 123 },
      },
      { field: w.string() },
    );
    expect(matches).toEqual([
      {
        groups: {},
        match: {
          field: 'somestring',
        },
      },
    ]);
    type Match = {
      groups: {};
      match: { readonly field: string };
      replacement?:
        | {
            value: unknown;
          }
        | undefined;
    }[];
    expectTypeOf(matches).toEqualTypeOf<Match>();
  });
  test('it matches any', () => {
    const matches = w.accumWalkMatch(
      {
        matches: { field: 'somestring' },
        nonmatching: { field: 123 },
      },
      { field: w.any() },
    );
    expect(matches).toEqual([
      {
        groups: {},
        match: {
          field: 'somestring',
        },
      },
      {
        groups: {},
        match: {
          field: 123,
        },
      },
    ]);
    type Match = {
      groups: {};
      match: { readonly field: unknown };
      replacement?:
        | {
            value: unknown;
          }
        | undefined;
    }[];
    expectTypeOf(matches).toEqualTypeOf<Match>();
  });
  test('it traverses arrays', () => {
    const matches = w.accumWalkMatch(
      { nest: [{ matches: 123, payload: 'hello' }, { notmatches: 444 }] },
      { matches: 123 },
    );

    expect(matches).toEqual([
      {
        groups: {},
        match: {
          matches: 123,
          payload: 'hello',
        },
      },
    ]);

    type Match = {
      groups: {};
      match: { readonly matches: 123 };
      replacement?:
        | {
            value: unknown;
          }
        | undefined;
    }[];
    expectTypeOf(matches).toEqualTypeOf<Match>();
  });
  test('it matches simple objects', () => {
    const matches = w.accumWalkMatch(
      {
        nest: {
          kind: 'test',
          otherField: 123,
          hidden: 3,
        },
      },
      { kind: 'test', otherField: 123 },
    );
    expect(matches.map((v) => v.match)).toEqual([
      {
        kind: 'test',
        otherField: 123,
        hidden: 3,
      },
    ]);
    type Match = {
      groups: {};
      match: { readonly kind: 'test'; readonly otherField: 123 };
      replacement?:
        | {
            value: unknown;
          }
        | undefined;
    }[];
    expectTypeOf(matches).toEqualTypeOf<Match>();
  });

  test('it matches optional properties', () => {
    const matches = w.accumWalkMatch(
      {
        without: {
          payload: 123,
        },
        withCorrect: {
          payload: 444,
          key: '1234',
        },
        withIncorrect: {
          payload: 555,
          key: 'this_should_not_match',
        },
      },
      { payload: w.any(), key: w.optional(w.regex(/\d+/)) },
    );
    expect(matches).toEqual([
      {
        groups: {},
        match: {
          payload: 123,
        },
      },
      {
        groups: {},
        match: {
          key: '1234',
          payload: 444,
        },
      },
    ]);
    type Match = {
      groups: {};
      match: { readonly payload: unknown; readonly key?: string };
      replacement?:
        | {
            value: unknown;
          }
        | undefined;
    }[];
    expectTypeOf(matches).branded.toEqualTypeOf<Match>();
  });

  test('it matches custom predicates', () => {
    const matches = w.accumWalkMatch(
      {
        nest: {
          kind: 'testwhyit',
          otherField: 123,
          hidden: 3,
        },
      },
      {
        otherField: w.group(
          w.p((v) => v === 123 || v === 444),
          'capture',
        ),
      },
    );
    expect(matches).toMatchInlineSnapshot([
      {
        groups: {
          capture: [
            {
              groups: {},
              value: 123,
            },
          ],
        },
        match: {
          hidden: 3,
          kind: 'testwhyit',
          otherField: 123,
        },
      },
    ]);
    type Match = {
      groups: {
        capture: [{ groups: {}; value: 123 | 444 }];
      };
      match: { readonly otherField: 123 | 444 };
      replacement?:
        | {
            value: unknown;
          }
        | undefined;
    }[];
    expectTypeOf(matches).branded.toEqualTypeOf<Match>();
  });
  test('it matches custom asserts', () => {
    const matches = w.accumWalkMatch(
      {
        nest: {
          kind: 'testwhyit',
          otherField: 123,
          hidden: 3,
        },
        otherField: 444,
      },
      {
        otherField: w.n((v): asserts v is 123 | 33 => {
          if (v !== 123 && v !== 33) throw new Error('Wrong!');
        }),
      },
    );
    expect(matches.map((v) => v.match)).toEqual([
      {
        kind: 'testwhyit',
        otherField: 123,
        hidden: 3,
      },
    ]);
    type Match = {
      groups: {};
      match: { readonly otherField: 123 | 33 };
      replacement?:
        | {
            value: unknown;
          }
        | undefined;
    }[];
    expectTypeOf(matches).branded.toEqualTypeOf<Match>();
  });
  describe('stlib asserts', () => {
    test('it matches regex strings', () => {
      const matches = w.accumWalkMatch(
        {
          nest: {
            kind: 'testwhyit',
            otherField: 123,
            hidden: 3,
          },
          kind: { thisisnotstring: true },
        },
        { kind: w.regex(/why/), otherField: 123 },
      );
      expect(matches.map((v) => v.match)).toEqual([
        {
          kind: 'testwhyit',
          otherField: 123,
          hidden: 3,
        },
      ]);
      type Match = {
        groups: {};
        match: { readonly otherField: 123; readonly kind: string };
        replacement?:
          | {
              value: unknown;
            }
          | undefined;
      }[];
      expectTypeOf(matches).branded.toEqualTypeOf<Match>();
    });
    describe('or', () => {
      test('it matches or', () => {
        const data = {
          nest: {
            kind: 'testwhyit',
            otherField: 123,
            hidden: 3,
          },
          other: { otherField: 44, hi: 'hello' },
        };
        const pattern = { otherField: w.or(123, 44) };
        const matches = w.accumWalkMatch(data, pattern).map((v) => v.match);
        expect(matches).toEqual([
          {
            kind: 'testwhyit',
            otherField: 123,
            hidden: 3,
          },
          {
            otherField: 44,
            hi: 'hello',
          },
        ]);
        type Match = { readonly otherField: 123 | 44 }[];
        expectTypeOf(matches).branded.toEqualTypeOf<Match>();
      });
      test('it matches or with three args', () => {
        const data = {
          nest: {
            kind: 'testwhyit',
            otherField: 123,
            hidden: 3,
          },
          other: { otherField: 44, hi: 'hello' },
          extra: { otherField: 3 },
          isNotHere: { otherField: 666, wontSeeme: 'hi!' },
        };
        const pattern = { otherField: w.or3(123, 44, 3) };
        const matches = w.accumWalkMatch(data, pattern).map((v) => v.match);
        expect(matches).toEqual([
          {
            kind: 'testwhyit',
            otherField: 123,
            hidden: 3,
          },
          {
            otherField: 44,
            hi: 'hello',
          },
          {
            otherField: 3,
          },
        ]);
        type Match = { readonly otherField: 123 | 44 | 3 }[];
        expectTypeOf(matches).branded.toEqualTypeOf<Match>();
      });
      test('it matches or with four args', () => {
        const data = {
          nest: {
            kind: 'testwhyit',
            otherField: 123,
            hidden: 3,
          },
          other: { otherField: 44, hi: 'hello' },
          extra: { otherField: 3 },
          isNotHere: { otherField: 666, willSeeMe: 'hi!' },
        };
        const pattern = { otherField: w.or4(123, 44, 3, 666) };
        const matches = w.accumWalkMatch(data, pattern).map((v) => v.match);
        expect(matches).toEqual([
          {
            kind: 'testwhyit',
            otherField: 123,
            hidden: 3,
          },
          {
            otherField: 44,
            hi: 'hello',
          },
          {
            otherField: 3,
          },
          {
            otherField: 666,
            willSeeMe: 'hi!',
          },
        ]);
        type Match = { readonly otherField: 123 | 44 | 3 | 666 }[];
        expectTypeOf(matches).branded.toEqualTypeOf<Match>();
      });
    });
    describe('const arrays', () => {
      it('do not match longer arrays', () => {
        const data = [1, 2, 3];
        const pattern = [1, 2] as const;
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
        type Match = {
          groups: {};
          match: readonly [1, 2];
          replacement?:
            | {
                value: unknown;
              }
            | undefined;
        }[];
        expectTypeOf(matches).toEqualTypeOf<Match>();
      });
      it('do not match shorter arrays', () => {
        const data = [1, 2, 3];
        const pattern = [1, 2, 3, 4];
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
      });
      it('do not match array like objects', () => {
        const data = { [0]: 1, [1]: 2, [2]: 3 };
        const pattern = [1, 2, 3];
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
      });
      it('only match exact arrays', () => {
        const data = [1, 2, 3];
        const pattern = [1, 2, 3];
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).not.toEqual([]);
      });
    });
    describe('and', () => {
      it('matches when both match', () => {
        const data = {
          nest: {
            kind: { first: 1, second: 2, extra: '' },
            otherField: 123,
            hidden: 3,
          },
          other: {
            kind: { first: 1, second: 3444, extra2: '' },
          },
        };
        const pattern = {
          kind: w.and({ first: 1 }, { second: 2 }),
        };
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches.map((v) => v.match)).toEqual([
          {
            kind: { first: 1, second: 2, extra: '' },
            otherField: 123,
            hidden: 3,
          },
        ]);
        type Match = {
          groups: {};
          match: { kind: { readonly first: 1; readonly second: 2 } };
          replacement?:
            | {
                value: unknown;
              }
            | undefined;
        }[];
        expectTypeOf(matches).branded.toEqualTypeOf<Match>();
      });
      it('does not match when first does not match', () => {
        const data = {
          nest: {
            kind: 'testwhyit',
            otherField: 123,
            hidden: 3,
          },
          other: {
            kind: 'why',
          },
        };
        const pattern = {
          kind: w.and(w.regex(/why_doesnotmatch/), w.regex(/it/)),
        };
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
        type Match = {
          groups: {};
          match: { kind: string };
          replacement?:
            | {
                value: unknown;
              }
            | undefined;
        }[];
        expectTypeOf(matches).branded.toEqualTypeOf<Match>();
      });
      it('does not match when second does not match', () => {
        const data = {
          nest: {
            kind: 'testwhyit',
            otherField: 123,
            hidden: 3,
          },
          other: {
            kind: 'why',
          },
        };
        const pattern = {
          kind: w.and(w.regex(/why/), w.regex(/itother/)),
        };
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
      });
    });
    describe('arraySome', () => {
      it('matches only arrays', () => {
        const data = { [0]: 'test', [1]: 'string', [2]: 123 };
        const pattern = w.arraySome(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
        type Match = {
          groups: {};
          match: unknown[];
          replacement?:
            | {
                value: unknown;
              }
            | undefined;
        }[];
        expectTypeOf(matches).branded.toEqualTypeOf<Match>();
      });
      it('matches when array has one match', () => {
        const data = ['string', 123, null];
        const pattern = w.arraySome(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([{ match: data, groups: {} }]);
      });
      it('matches when array has more than one match', () => {
        const data = ['string', 123, null, 'other'];
        const pattern = w.arraySome(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([{ match: data, groups: {} }]);
      });
      it('does not match when array has zero matches', () => {
        const data = [undefined, 123, null];
        const pattern = w.arraySome(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
      });
    });
    describe('arrayZeroOrOne', () => {
      it('matches only arrays', () => {
        const data = { [0]: 'test', [1]: 44, [2]: 123 };
        const pattern = w.arrayZeroOrOne(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
        type Match = {
          groups: {};
          match: unknown[];
          replacement?:
            | {
                value: unknown;
              }
            | undefined;
        }[];
        expectTypeOf(matches).branded.toEqualTypeOf<Match>();
      });
      it('matches when array has one match', () => {
        const data = ['string', 123, null];
        const pattern = w.arrayZeroOrOne(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([{ match: data, groups: {} }]);
      });
      it('does not match when array has more than one match', () => {
        const data = ['string', 123, null, 'other'];
        const pattern = w.arrayZeroOrOne(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
      });
      it('matches when array has zero matches', () => {
        const data = [undefined, 123, null];
        const pattern = w.arrayZeroOrOne(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([{ match: data, groups: {} }]);
      });
    });
    describe('arrayFor', () => {
      it('matches only arrays', () => {
        const data = { [0]: 'test', [1]: 44, [2]: 123 };
        const pattern = w.arrayFor(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
        type Match = {
          groups: {};
          match: unknown[];
          replacement?:
            | {
                value: unknown;
              }
            | undefined;
        }[];
        expectTypeOf(matches).branded.toEqualTypeOf<Match>();
      });
      it('matches when array has one match', () => {
        const data = ['string', 123, null];
        const pattern = w.arrayFor(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([{ match: data, groups: {} }]);
      });
      it('matches when array has more than one match', () => {
        const data = ['string', 123, null, 'other'];
        const pattern = w.arrayFor(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([{ match: data, groups: {} }]);
      });
      it('matches when array has zero matches', () => {
        const data = [undefined, 123, null];
        const pattern = w.arrayFor(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([{ match: data, groups: {} }]);
      });
    });
    describe('arrayEvery', () => {
      it('matches only arrays', () => {
        const data = { [0]: 'test', [1]: 44, [2]: 123 };
        const pattern = w.arrayEvery(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
        type Match = {
          groups: {};
          match: string[];
          replacement?:
            | {
                value: unknown;
              }
            | undefined;
        }[];
        expectTypeOf(matches).branded.toEqualTypeOf<Match>();
      });
      it('does not when array has only one match', () => {
        const data = ['string', 123, null];
        const pattern = w.arrayEvery(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
      });
      it('does not match when array has more than one match', () => {
        const data = ['string', 123, null, 'other'];
        const pattern = w.arrayEvery(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
      });
      it('does not match when array has zero matches', () => {
        const data = [undefined, 123, null];
        const pattern = w.arrayEvery(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([]);
      });
      it('matches empty arrays', () => {
        const data: unknown[] = [];
        const pattern = w.arrayEvery(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([{ match: data, groups: {} }]);
      });
      it('matches when every item matches', () => {
        const data = ['string', 'other', 'last'];
        const pattern = w.arrayEvery(w.string());
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([{ match: data, groups: {} }]);
      });
    });
    describe('coerce', () => {
      it('matches when outer and inner matchers pass', () => {
        const data = ['123', '33', 'Na'];
        const pattern = w.coerce(
          w.string(),
          (v) => Number(v),
          w.pred((v): v is number => !Number.isNaN(v)),
        );
        const matches = w.accumWalkMatch(data, pattern);
        expect(matches).toEqual([
          { match: '123', groups: {} },
          { match: '33', groups: {} },
        ]);
        type Match = {
          groups: {};
          match: string;
          replacement?:
            | {
                value: unknown;
              }
            | undefined;
        }[];
        expectTypeOf(matches).branded.toEqualTypeOf<Match>();
      });
    });
  });
});

describe('capturing', () => {
  it('correctly types optional captures inside optional captures', () => {
    const data = {
      it: {
        array: [{ matches: '1' }],
      },
    };
    const pattern = {
      it: w.optional({
        array: w.or([], [{ matches: w.group(w.string(), 'optional') }]),
      }),
    };
    const matches = w.accumWalkMatch(data, pattern);
    type Match = {
      match: {
        it?: {
          array: readonly [] | readonly [{ matches: string }];
        };
      };
      groups: {
        optional?: [
          {
            value: string;
            groups: {};
            replacement?: { value: unknown };
          },
        ];
      };
      replacement?: { value: unknown } | undefined;
    };
    expectTypeOf(matches).branded.toEqualTypeOf<Match[]>();
  });
  test.skip('it captures every array member that matches', () => {
    expect(
      w.accumWalkMatch(
        { arr: ['start123', 'other444', 'end555k'] },
        {
          arr: w.arrayFor(
            w.group(w.regex(/\d/), 'digits'),
            // w.group(w.regex(/\d$/), 'digitsend'),
            // w.group(w.regex(/other/), 'other'),
            // w.group(w.regex(/nonexistent/), 'nonexistent'),
          ),
        },
      ),
    ).toEqual([
      {
        groups: {
          digits: [
            {
              groups: {},
              value: 'start123',
            },
            {
              groups: {},
              value: 'other444',
            },
            {
              groups: {},
              value: 'end555k',
            },
          ],
          digitsend: [
            {
              groups: {},
              value: 'start123',
            },
            {
              groups: {},
              value: 'other444',
            },
          ],
          other: [
            {
              groups: {},
              value: 'other444',
            },
          ],
        },
        match: {
          arr: ['start123', 'other444', 'end555k'],
        },
      },
    ]);
  });
  test('captures single field', () => {
    expect(
      w.accumWalkMatch(
        {
          nest: {
            kind: 'Hello',
            number: '12345',
          },
        },
        {
          kind: 'Hello',
          number: w.group(w.regex(/^123/), 'num'),
        },
      ),
    ).toEqual([
      {
        match: { kind: 'Hello', number: '12345' },
        groups: { num: [{ value: '12345', groups: {} }] },
      },
    ]);
  });
  test('captures nested fields', () => {
    expect(
      w.accumWalkMatch(
        {
          nest: {
            kind: 'Hello',
            number: '12345',
          },
        },
        w.group(
          {
            kind: 'Hello',
            number: w.group(w.regex(/^123/), 'num'),
          },
          'entire',
        ),
      ),
    ).toEqual([
      {
        match: { kind: 'Hello', number: '12345' },
        groups: {
          entire: [
            {
              value: { kind: 'Hello', number: '12345' },
              groups: { num: [{ value: '12345', groups: {} }] },
            },
          ],
        },
      },
    ]);
  });
  test('captures several fields in nested capture', () => {
    const res = w.accumWalkMatch(
      {
        nest: {
          kind: 'Hello',
          number: '12345',
          test: '4444',
        },
      },
      w.group(
        {
          kind: 'Hello',
          test: w.group(w.regex(/4{4}/), 'anothergroup'),
          number: w.group(w.regex(/^123/), 'num'),
        },
        'entire',
      ),
    );
    expect(res).toEqual([
      {
        match: { kind: 'Hello', number: '12345', test: '4444' },
        groups: {
          entire: [
            {
              value: { kind: 'Hello', number: '12345', test: '4444' },
              groups: {
                num: [{ value: '12345', groups: {} }],
                anothergroup: [{ value: '4444', groups: {} }],
              },
            },
          ],
        },
      },
    ]);
    expect(res[0]?.groups['entire']?.[0]?.groups['num']?.[0]?.value).toBe(
      '12345',
    );
  });
  test('captures all sibling fields', () => {
    const res = w.accumWalkMatch(
      {
        nest: {
          kind: 'Hello',
          number: '12345',
          test: '4444',
        },
      },
      w.group(
        {
          kind: 'Hello',
          test: w.group(w.regex(/4{4}/), 'num'),
          number: w.group(w.regex(/^123/), 'num'),
        },
        'entire',
      ),
    );
    expect(res).toEqual([
      {
        match: { kind: 'Hello', number: '12345', test: '4444' },
        groups: {
          entire: [
            {
              value: { kind: 'Hello', number: '12345', test: '4444' },
              groups: {
                num: [
                  { value: '4444', groups: {} },
                  { value: '12345', groups: {} },
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(res[0]?.groups['entire']?.[0]?.groups['num']?.[0]?.value).toBe(
      '4444',
    );
  });
  test('captures all sibling fields (maintains matchers order)', () => {
    const res = w.accumWalkMatch(
      {
        nest: {
          kind: 'Hello',
          number: '12345',
          test: '4444',
        },
      },
      w.group(
        {
          kind: 'Hello',
          number: w.group(w.regex(/^123/), 'num'),
          test: w.group(w.regex(/4{4}/), 'num'),
        },
        'entire',
      ),
    );
    expect(res).toEqual([
      {
        match: { kind: 'Hello', number: '12345', test: '4444' },
        groups: {
          entire: [
            {
              value: { kind: 'Hello', number: '12345', test: '4444' },
              groups: {
                num: [
                  { value: '12345', groups: {} },
                  { value: '4444', groups: {} },
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(res[0]?.groups['entire']?.[0]?.groups['num']?.[0]?.value).toBe(
      '12345',
    );
  });
  test('captures all sibling fields with and', () => {
    const res = w.accumWalkMatch(
      {
        nest: {
          kind: 'Hello',
          number: '12345',
          test: '4444',
        },
      },
      w.group(
        w.and(
          {
            number: w.group(w.regex(/^123/), 'num'),
          },
          {
            test: w.group(w.regex(/4{4}/), 'num'),
          },
        ),
        'entire',
      ),
    );
    expect(res).toEqual([
      {
        match: { kind: 'Hello', number: '12345', test: '4444' },
        groups: {
          entire: [
            {
              value: { kind: 'Hello', number: '12345', test: '4444' },
              groups: {
                num: [
                  { value: '12345', groups: {} },
                  { value: '4444', groups: {} },
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(res[0]?.groups['entire']?.[0]?.groups['num']?.[0]?.value).toBe(
      '12345',
    );
  });
  test.skip('captures regex named groups too', () => {
    const res = w.accumWalkMatch(
      { test: 'why123412it_another_end' },
      w.regex(/why(\d+)it_(?<namedgroup>\w+)end/ /*, true*/),
    );
    expect(res).toEqual([
      {
        groups: {
          '0': [
            {
              groups: {},
              value: 'why123412it_another_end',
            },
          ],
          '1': [
            {
              groups: {},
              value: '123412',
            },
          ],
          '2': [
            {
              groups: {},
              value: 'another_',
            },
          ],
          namedgroup: [
            {
              groups: {},
              value: 'another_',
            },
          ],
        },
        match: 'why123412it_another_end',
      },
    ]);
    // expect(res[0]?.groups['namedgroup']?.[0]?.value);
  });
  test.skip('captures regex unnamed groups too', () => {
    const res = w.accumWalkMatch(
      { test: 'why123412it_another_end' },
      w.regex(/why(\d+)it_(\w+)end/ /*, true*/),
    );
    expect(res).toEqual([
      {
        groups: {
          '0': [
            {
              groups: {},
              value: 'why123412it_another_end',
            },
          ],
          '1': [
            {
              groups: {},
              value: '123412',
            },
          ],
          '2': [
            {
              groups: {},
              value: 'another_',
            },
          ],
        },
        match: 'why123412it_another_end',
      },
    ]);
    // expect(res[0]?.groups['namedgroup']?.[0]?.value);
  });
  test("captures only left part's groups with or if the left part matched", () => {
    const res = w.accumWalkMatch(
      {
        nest: {
          kind: 'Hello',
          number: '12345',
          test: '4444',
        },
      },
      w.group(
        w.or(
          {
            number: w.group(w.regex(/^123/), 'num'),
          },
          {
            test: w.group(w.regex(/4{4}/), 'num'),
          },
        ),
        'entire',
      ),
    );
    expect(res).toEqual([
      {
        match: { kind: 'Hello', number: '12345', test: '4444' },
        groups: {
          entire: [
            {
              value: { kind: 'Hello', number: '12345', test: '4444' },
              groups: {
                num: [{ value: '12345', groups: {} }],
              },
            },
          ],
        },
      },
    ]);
    expect(res[0]?.groups['entire']?.[0]?.groups['num']?.[0]?.value).toBe(
      '12345',
    );
  });
});

describe('replace', () => {
  test('it works!', () => {
    const data = {
      field: 'string',
      other: 'otherstring',
      notstring: 123,
      totallynotstring: '123',
    };
    const res = w.walkReplace(
      data,
      w.transform(w.regex(/string/), (m) => `(${m})`),
    );

    expect(res).toEqual({
      field: '(string)',
      other: '(otherstring)',
      notstring: 123,
      totallynotstring: '123',
    });
    expect(data.field).toBe('string');
  });
  test('it bails on match', () => {
    const data = {
      type: 'Item',
      nested: {
        type: 'Item',
        val: 123,
      },
    };
    const res = w.walkReplace(
      data,
      w.transform({ type: 'Item' }, (m) => ({ ...m, payload: 333 })),
    );

    expect(res).toEqual({
      type: 'Item',
      nested: {
        type: 'Item',
        val: 123,
      },
      payload: 333,
    });
    expect(data).not.toHaveProperty('payload');
  });
  test('it replaces deep in the data', () => {
    const data = {
      type: 'Item',
      nested: {
        type: 'Item',
        val: 123,
      },
    };
    const res = w.walkReplace(
      data,
      w.transform({ val: w.pred((v) => typeof v === 'number') }, (m) => ({
        ...m,
        val: 333,
      })),
    );

    expect(res).toEqual({
      type: 'Item',
      nested: {
        type: 'Item',
        val: 333,
      },
    });
    expect(data.nested.val).toBe(123);
  });
  test('it works with arrayFor', () => {
    const data = {
      array: [1, 'string', 2, 'test'],
    };
    const res = w.walkReplace(data, {
      array: w.arrayFor(
        w.transform(w.any(), (m) => (m === 'string' ? '(string)' : m)),
      ),
    });

    expect(res).toEqual({
      array: [1, '(string)', 2, 'test'],
    });
    expect(data.array[1]).toBe('string');
  });
  it('captures replacements', () => {
    const data = {
      nest: {
        inner: 'test',
      },
    };
    const pattern = {
      inner: w.group(
        w.transform(w.regex(/test/), (v) => v + v),
        'doubled',
      ),
    };
    const matches = w.accumWalkMatch(data, pattern);

    expect(matches[0]?.groups.doubled[0].replacement?.value).toBe('testtest');
  });
  it('captures replacements inside compounds', () => {
    const data = {
      nest: {
        inner: { prop: 'test' },
      },
    };
    const pattern = {
      inner: w.group(
        {
          prop: w.transform(w.regex(/test/), (v) => v + v),
        },
        'doubled',
      ),
    };
    const matches = w.accumWalkMatch(data, pattern);

    expect(matches[0]?.groups.doubled[0].replacement?.value).toEqual({
      prop: 'testtest',
    });
  });
  it('replaces inside const arrays', () => {
    const data = {
      nest: {
        inner: [1, 2, 3],
      },
    };
    const pattern = {
      inner: [
        w.transform(
          w.pred((v) => typeof v === 'number'),
          (v) => v * 2,
        ),
        w.any(),
        w.transform(
          w.pred((v) => typeof v === 'number'),
          (v) => v + 2,
        ),
      ],
    };
    const matches = w.accumWalkMatch(data, pattern);
    expect(matches[0]?.replacement?.value).toEqual({
      inner: [2, 2, 5],
    });
  });
});
describe('ignore', () => {
  it('ignores selected keys', () => {
    const data = {
      a: 1,
      b: 2,
      c: 4,
    };
    const matches = w
      .accumWalkMatch(data, w.any(), (k) => k === 'b')
      .map((v) => v.match);
    expect(matches).toEqual([data, 1, 4]);
  });
  it('ignores selected array indexes', () => {
    const data = {
      array: [1, 2, 3],
    };
    const matches = w
      .accumWalkMatch(data, w.any(), (k) => k === 1)
      .map((v) => v.match);
    expect(matches).toEqual([data, data.array, 1, 3]);
  });
});
