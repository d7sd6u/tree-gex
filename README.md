Match tree data structures using regex inspired tree matchers. Useful for inspecting and manipulating AST trees:

```graphql
type Query {
  cartItem(cartId: ID! @isId, itemId: ID!): CartItem
    @requiresPermission(permission: "cart.view")
}
type Mutation {
  deleteItem(id: ID! @isId): Boolean
    @requiresPermission(permission: "card.modify")
}
```

```ts
import { parse } from 'graphql';
import * as w from 'tree-gex';

const document = parse(graphql);

IdDirective = {
  kind: 'InputValueDefinition',
  name: {
    kind: 'Name',
    value: w.group(w.string(), 'arg'),
  },
  directives: [
    {
      kind: 'Directive',
      name: {
        kind: 'Name',
        value: 'isId',
      },
    },
  ],
};

const actionDefinition = {
  kind: 'FieldDefinition',

  name: {
    kind: 'Name',
    value: w.group(w.string(), 'action'),
  },

  arguments: w.arrayZeroOrOne(argWithIsIdDirective),
};

const matches = w.accumWalkMatch(document, {
  kind: 'ObjectTypeDefinition',
  name: { value: w.regex(/Query|Mutation/) },
  fields: w.arrayFor(w.group(actionDefinition, 'actions')),
});

expect(
  matches
    .flatMap((type) => type.groups['actions'])
    .map((action) => ({
      action: action?.groups['action']?.[0]?.value,
      arg: action?.groups['arg']?.[0]?.value,
    })),
).toEqual([
  { action: 'cartItem', arg: 'cartId' },
  { action: 'deleteItem', arg: 'cartId' },
]);
```

# Installation

```bash
pnpm add https://github.com/d7sd6u/tree-gex/releases/download/v0.0.2/package.tgz
```
