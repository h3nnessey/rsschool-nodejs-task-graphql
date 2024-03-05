import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { graphql, parse, validate } from 'graphql';
import depthLimit from 'graphql-depth-limit';
import {
  createGqlResponseSchema,
  gqlResponseSchema,
  schema,
  DEPTH_LIMIT,
} from './schemas.js';
import { reGenLoaders } from './loaders/loaders.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler({ body: { query, variables } }) {
      const gqlErrors = validate(schema, parse(query), [depthLimit(DEPTH_LIMIT)]);

      if (gqlErrors.length > 0) {
        return { data: null, errors: gqlErrors };
      }

      return await graphql({
        schema,
        source: query,
        variableValues: variables,
        contextValue: {
          prisma: fastify.prisma,
          ...reGenLoaders(fastify.prisma),
        },
      });
    },
  });
};

export default plugin;
