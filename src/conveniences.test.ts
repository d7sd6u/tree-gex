import { expect, test } from 'vitest';

import { withv } from './conveniences.js';

test('it works', () => {
  const res = withv([3, 2], (first, second) => ({ first, second }));
  expect(res).toEqual({ first: 3, second: 2 });
});
