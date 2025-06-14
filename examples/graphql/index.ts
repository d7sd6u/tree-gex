import { parse } from 'graphql';
import { readFileSync } from 'node:fs';

import * as w from '../../src/index.js';

process.chdir(import.meta.dirname);

const graphql = readFileSync('./schema.graphql', { encoding: 'utf-8' });
const document = parse(graphql);

const literalIdInputDefinition = (groupName: string) => ({
  kind: 'InputValueDefinition',
  name: {
    kind: 'Name',
    value: w.group('id', groupName),
  },
  type: {
    kind: 'NonNullType',
    type: {
      kind: 'NamedType',
      name: {
        kind: 'Name',
        value: 'ID',
      },
    },
  },
});
const argWithIsIdDirective = {
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
      arguments: w.or(
        [
          {
            kind: 'Argument',
            name: {
              kind: 'Name',
              value: 'field',
            },
            value: {
              kind: 'StringValue',
              value: w.group(w.string(), 'field'),
            },
          },
        ],
        [],
      ),
    },
  ],
};
const argWithIsPolymorphicIdDirective = {
  kind: 'InputValueDefinition',
  name: {
    kind: 'Name',
    value: w.group(w.string(), 'arg'),
  },
  directives: [
    {
      kind: 'Directive',
      name: w.group(
        {
          kind: 'Name',
          value: 'isPolymorphicId',
        },
        'isPolymorphic',
      ),
      arguments: w.or(
        [
          {
            kind: 'Argument',
            name: {
              kind: 'Name',
              value: 'field',
            },
            value: {
              kind: 'StringValue',
              value: w.group(w.string(), 'field'),
            },
          },
        ],
        [],
      ),
    },
  ],
};
const whereArgWithIdField = (data: unknown) => ({
  kind: 'InputValueDefinition',
  name: {
    kind: 'Name',
    value: w.group('where', 'arg'),
  },
  type: {
    kind: 'NonNullType',
    type: {
      kind: 'NamedType',
      name: {
        kind: 'Name',
        value: w.coerce(
          w.string(),
          (type) =>
            w.accumWalkMatch(data, {
              kind: 'InputObjectTypeDefinition',
              name: { value: type },
            })[0]?.match,
          {
            fields: w.arraySome(literalIdInputDefinition('field')),
          },
        ),
      },
    },
  },
});
const actionDefinition = (document: unknown) => ({
  kind: 'FieldDefinition',

  name: {
    kind: 'Name',
    value: w.group(w.string(), 'action'),
  },

  directives: w.optional(
    w.arrayFor(
      w.or(
        w.group(
          {
            kind: 'Directive',
            name: {
              kind: 'Name',
              value: 'withoutId',
            },
          },
          'withoutId',
        ),

        {
          kind: 'Directive',
          name: {
            kind: 'Name',
            value: 'requiresPermission',
          },
          arguments: [
            {
              kind: 'Argument',
              name: {
                kind: 'Name',
                value: 'permission',
              },
              value: {
                kind: 'StringValue',
                value: w.group(w.string(), 'requiresPermissions'),
              },
            },
          ],
        },
      ),
    ),
  ),

  arguments: w.arrayZeroOrOne(
    w.or(
      argWithIsIdDirective,
      argWithIsPolymorphicIdDirective,
      literalIdInputDefinition('arg'),
      whereArgWithIdField(document),
    ),
  ),
});

function* getActions() {
  const actionTypes = w.accumWalkMatch(document, {
    kind: 'ObjectTypeDefinition',
    name: { value: w.regex(/Query|Mutation/) },
    fields: w.arrayFor(w.group(actionDefinition(document), 'actions')),
  });
  for (const {
    groups: { actions },
  } of actionTypes) {
    for (const { groups } of actions ?? []) {
      yield {
        action: groups['action']?.[0]?.value,
        withoutId: !!groups['withoutId'],
        isPolymorphic: !!groups['isPolymorphic'],
        arg: w.withv(
          [groups['arg']?.[0]?.value, groups['field']?.[0]?.value],
          (arg, field) => (field ? `${arg}.${field}` : arg),
        ),
        requiredPermissions:
          groups['requiresPermissions']?.map((v) => v.value) ?? [],
      };
    }
  }
}

console.log(graphql);
console.log([...getActions()]);
