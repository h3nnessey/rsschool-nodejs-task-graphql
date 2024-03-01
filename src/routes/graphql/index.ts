import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLInt,
  GraphQLBoolean,
  parse,
  validate,
} from 'graphql';
import { MemberTypeId } from '../member-types/schemas.js';
import { UUIDType } from './types/uuid.js';

const userType: GraphQLObjectType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(UUIDType),
    },
    name: {
      type: GraphQLString,
    },
    balance: {
      type: GraphQLFloat,
    },
  }),
});

const memberTypeId = new GraphQLEnumType({
  name: 'MemberTypeId',
  values: {
    [MemberTypeId.BASIC]: { value: MemberTypeId.BASIC },
    [MemberTypeId.BUSINESS]: { value: MemberTypeId.BUSINESS },
  },
});

const memberType: GraphQLObjectType = new GraphQLObjectType({
  name: 'MemberType',
  fields: () => ({
    id: {
      type: memberTypeId,
    },
    discount: {
      type: GraphQLFloat,
    },
    postsLimitPerMonth: {
      type: GraphQLInt,
    },
  }),
});

const postType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(UUIDType),
    },
    title: {
      type: GraphQLString,
    },
    content: {
      type: GraphQLString,
    },
    authorId: {
      type: new GraphQLNonNull(UUIDType),
    },
  }),
});

const profileType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Profile',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(UUIDType),
    },
    isMale: {
      type: GraphQLBoolean,
    },
    yearOfBirth: {
      type: GraphQLInt,
    },
    userId: {
      type: new GraphQLNonNull(UUIDType),
    },
    memberTypeId: {
      type: memberTypeId,
    },
  }),
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      users: {
        type: new GraphQLList(userType),
        resolve: async (_source, _args, { prisma }: FastifyInstance) => {
          return await prisma.user.findMany();
        },
      },
      user: {
        type: userType,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: FastifyInstance) => {
          return await prisma.user.findUnique({ where: { id } });
        },
      },
      posts: {
        type: new GraphQLList(postType),
        resolve: async (_source, _args, { prisma }: FastifyInstance) => {
          return await prisma.post.findMany();
        },
      },
      post: {
        type: postType,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: FastifyInstance) => {
          return await prisma.post.findUnique({ where: { id } });
        },
      },
      memberTypes: {
        type: new GraphQLList(memberType),
        resolve: async (_source, _args, { prisma }: FastifyInstance) => {
          return await prisma.memberType.findMany();
        },
      },
      memberType: {
        type: memberType,
        args: { id: { type: new GraphQLNonNull(memberTypeId) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: FastifyInstance) => {
          return await prisma.memberType.findUnique({ where: { id } });
        },
      },
      profiles: {
        type: new GraphQLList(profileType),
        resolve: async (_source, _args, { prisma }: FastifyInstance) => {
          return await prisma.profile.findMany();
        },
      },
      profile: {
        type: profileType,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: FastifyInstance) => {
          return await prisma.profile.findUnique({ where: { id } });
        },
      },
    },
  }),
  // does nothing
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      users: {
        type: new GraphQLList(userType),
        resolve: async (_source, _args, { prisma }: FastifyInstance) => {
          return await prisma.user.findMany();
        },
      },
    },
  }),
});

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
      const gqlErrors = validate(schema, parse(query));

      if (gqlErrors.length > 0) {
        return { data: null, errors: gqlErrors };
      }

      return await graphql({
        schema,
        source: query,
        variableValues: variables,
        contextValue: fastify,
      });
    },
  });
};

export default plugin;
