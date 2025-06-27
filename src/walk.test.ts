import { describe, expect, test } from 'vitest';

import * as w from './index.js';

describe('matching', () => {
  test('it matches strings', () => {
    expect(
      w.accumWalkMatch(
        {
          matches: { field: 'somestring' },
          nonmatching: { field: 123 },
        },
        { field: w.string() },
      ),
    ).toEqual([
      {
        groups: {},
        match: {
          field: 'somestring',
        },
      },
    ]);
  });
  test('it matches any', () => {
    expect(
      w.accumWalkMatch(
        {
          matches: { field: 'somestring' },
          nonmatching: { field: 123 },
        },
        { field: w.any() },
      ),
    ).toEqual([
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
  });
  test('it traverses arrays', () => {
    expect(
      w.accumWalkMatch(
        { nest: [{ matches: 123, payload: 'hello' }, { notmatches: 444 }] },
        { matches: 123 },
      ),
    ).toEqual([
      {
        groups: {},
        match: {
          matches: 123,
          payload: 'hello',
        },
      },
    ]);
  });
  test('it matches simple objects', () => {
    expect(
      w
        .accumWalkMatch(
          {
            nest: {
              kind: 'test',
              otherField: 123,
              hidden: 3,
            },
          },
          { kind: 'test', otherField: 123 },
        )
        .map((v) => v.match),
    ).toEqual([
      {
        kind: 'test',
        otherField: 123,
        hidden: 3,
      },
    ]);
  });

  test('it matches optional properties', () => {
    expect(
      w.accumWalkMatch(
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
      ),
    ).toEqual([
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
  });

  test('it matches custom predicates', () => {
    expect(
      w.accumWalkMatch(
        {
          nest: {
            kind: 'testwhyit',
            otherField: 123,
            hidden: 3,
          },
        },
        {
          otherField: w.group(
            w.p((v) => v === 123),
            'capture',
          ),
        },
      ),
    ).toMatchInlineSnapshot([
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
  });
  test('it matches custom asserts', () => {
    expect(
      w
        .accumWalkMatch(
          {
            nest: {
              kind: 'testwhyit',
              otherField: 123,
              hidden: 3,
            },
            otherField: 444,
          },
          {
            otherField: w.n((v) => {
              if (v !== 123) throw new Error('Wrong!');
            }),
          },
        )
        .map((v) => v.match),
    ).toEqual([
      {
        kind: 'testwhyit',
        otherField: 123,
        hidden: 3,
      },
    ]);
  });
  describe('stlib asserts', () => {
    test('it matches regex strings', () => {
      expect(
        w
          .accumWalkMatch(
            {
              nest: {
                kind: 'testwhyit',
                otherField: 123,
                hidden: 3,
              },
              kind: { thisisnotstring: true },
            },
            { kind: w.regex(/why/), otherField: 123 },
          )
          .map((v) => v.match),
      ).toEqual([
        {
          kind: 'testwhyit',
          otherField: 123,
          hidden: 3,
        },
      ]);
    });
    test('it matches or', () => {
      expect(
        w
          .accumWalkMatch(
            {
              nest: {
                kind: 'testwhyit',
                otherField: 123,
                hidden: 3,
              },
              other: { otherField: 44, hi: 'hello' },
            },
            { otherField: w.or(123, 44) },
          )
          .map((v) => v.match),
      ).toEqual([
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
    });
    test('it matches and', () => {
      expect(
        w
          .accumWalkMatch(
            {
              nest: {
                kind: 'testwhyit',
                otherField: 123,
                hidden: 3,
              },
              other: {
                kind: 'why',
              },
            },
            {
              kind: w.and(w.regex(/why/), w.regex(/it/)),
            },
          )
          .map((v) => v.match),
      ).toEqual([
        {
          kind: 'testwhyit',
          otherField: 123,
          hidden: 3,
        },
      ]);
    });
  });
});

describe('capturing', () => {
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
});
