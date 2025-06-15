import { parse } from 'graphql';
import { readFileSync } from 'node:fs';

import * as w from '../../src/index.js';

process.chdir(import.meta.dirname);

const graphql = readFileSync('./schema.graphql', { encoding: 'utf-8' });
const document = parse(graphql);

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
    },
  ],
} as const;

const actionDefinition = {
  kind: 'FieldDefinition',

  name: {
    kind: 'Name',
    value: w.group(w.string(), 'action'),
  },

  arguments: w.arrayZeroOrOne(argWithIsIdDirective),
} as const;

const matches = w.accumWalkMatch(document, {
  kind: 'ObjectTypeDefinition',
  name: { value: w.regex(/Query|Mutation/) },
  fields: w.arrayFor(w.group(actionDefinition, 'actions')),
});

const actions: { action: string; arg: string | undefined }[] = matches
  .flatMap((type) => type.groups['actions'] ?? [])
  .map((action) => ({
    action: action.groups['action'][0].value,
    arg: action.groups['arg']?.[0].value,
  }));
console.log(actions);
