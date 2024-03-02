import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { FastifyInstance } from 'fastify';
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
  GraphQLInputObjectType,
  parse,
  validate,
} from 'graphql';
import depthLimit from 'graphql-depth-limit';
import { MemberTypeId } from '../member-types/schemas.js';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { UUIDType } from './types/uuid.js';

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
    userId: {
      type: new GraphQLNonNull(UUIDType),
    },
    isMale: {
      type: GraphQLBoolean,
    },
    yearOfBirth: {
      type: GraphQLInt,
    },
    memberType: {
      type: memberType,
      resolve: async (
        { memberTypeId }: { memberTypeId: MemberTypeId },
        _args,
        { prisma }: FastifyInstance,
      ) => {
        return await prisma.memberType.findUnique({
          where: { id: memberTypeId },
        });
      },
    },
  }),
});

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
    profile: {
      type: profileType,
      resolve: async ({ id }: { id: string }, _args, { prisma }: FastifyInstance) => {
        return await prisma.profile.findUnique({
          where: { userId: id },
        });
      },
    },
    posts: {
      type: new GraphQLList(postType),
      resolve: async ({ id }: { id: string }, _args, { prisma }: FastifyInstance) => {
        return await prisma.post.findMany({ where: { authorId: id } });
      },
    },
    userSubscribedTo: {
      type: new GraphQLList(userType),
      resolve: async ({ id }: { id: string }, _args, { prisma }: FastifyInstance) => {
        return await prisma.user.findMany({
          where: { subscribedToUser: { some: { subscriberId: id } } },
        });
      },
    },
    subscribedToUser: {
      type: new GraphQLList(userType),
      resolve: async ({ id }: { id: string }, _args, { prisma }: FastifyInstance) => {
        return await prisma.user.findMany({
          where: { userSubscribedTo: { some: { authorId: id } } },
        });
      },
    },
  }),
});

const createUserInputType = new GraphQLInputObjectType({
  name: 'CreateUserInput',
  fields: () => ({
    name: { type: GraphQLString },
    balance: { type: GraphQLFloat },
  }),
});

const changeUserInputType = new GraphQLInputObjectType({
  name: 'ChangeUserInput',
  fields: () => ({
    name: { type: GraphQLString },
    balance: { type: GraphQLFloat },
  }),
});

const createPostInputType = new GraphQLInputObjectType({
  name: 'CreatePostInput',
  fields: () => ({
    authorId: { type: new GraphQLNonNull(UUIDType) },
    title: { type: GraphQLString },
    content: { type: GraphQLString },
  }),
});

const changePostInputType = new GraphQLInputObjectType({
  name: 'ChangePostInput',
  fields: () => ({
    title: { type: GraphQLString },
    content: { type: GraphQLString },
  }),
});

const createProfileInputType = new GraphQLInputObjectType({
  name: 'CreateProfileInput',
  fields: () => ({
    userId: {
      type: new GraphQLNonNull(UUIDType),
    },
    memberTypeId: {
      type: memberTypeId,
    },
    isMale: {
      type: GraphQLBoolean,
    },
    yearOfBirth: {
      type: GraphQLInt,
    },
  }),
});

const changeProfileInputType = new GraphQLInputObjectType({
  name: 'ChangeProfileInput',
  fields: () => ({
    memberTypeId: {
      type: memberTypeId,
    },
    isMale: {
      type: GraphQLBoolean,
    },
    yearOfBirth: {
      type: GraphQLInt,
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
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      createUser: {
        type: userType,
        args: { dto: { type: createUserInputType } },
        resolve: async (
          _source,
          { dto }: { dto: { name: string; balance: number } },
          { prisma }: FastifyInstance,
        ) => {
          return await prisma.user.create({
            data: dto,
          });
        },
      },
      createPost: {
        type: postType,
        args: { dto: { type: createPostInputType } },
        resolve: async (
          _source,
          { dto }: { dto: { title: string; content: string; authorId: string } },
          { prisma }: FastifyInstance,
        ) => {
          return await prisma.post.create({ data: dto });
        },
      },
      createProfile: {
        type: profileType,
        args: { dto: { type: createProfileInputType } },
        resolve: async (
          _source,
          {
            dto,
          }: {
            dto: {
              isMale: boolean;
              yearOfBirth: number;
              memberTypeId: MemberTypeId;
              userId: string;
            };
          },
          { prisma }: FastifyInstance,
        ) => {
          const res = await prisma.profile.create({ data: dto });
          return res;
        },
      },
      deleteUser: {
        type: GraphQLBoolean,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: FastifyInstance) => {
          try {
            return (await prisma.user.delete({ where: { id } })) && true;
          } catch {
            return false;
          }
        },
      },
      deletePost: {
        type: GraphQLBoolean,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: FastifyInstance) => {
          try {
            return (await prisma.post.delete({ where: { id } })) && true;
          } catch {
            return null;
          }
        },
      },
      deleteProfile: {
        type: GraphQLBoolean,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: FastifyInstance) => {
          try {
            return (await prisma.post.delete({ where: { id } })) && true;
          } catch {
            return null;
          }
        },
      },
      changeUser: {
        type: userType,
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
          dto: { type: changeUserInputType },
        },
        resolve: async (
          _source,
          { id, dto }: { id: string; dto: { name: string; balance: number } },
          { prisma }: FastifyInstance,
        ) => {
          return await prisma.user.update({ where: { id }, data: dto });
        },
      },
      changePost: {
        type: postType,
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
          dto: { type: changePostInputType },
        },
        resolve: async (
          _source,
          { id, dto }: { id: string; dto: { title: string; content: string } },
          { prisma }: FastifyInstance,
        ) => {
          return await prisma.post.update({ where: { id }, data: dto });
        },
      },
      changeProfile: {
        type: profileType,
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
          dto: { type: changeProfileInputType },
        },
        resolve: async (
          _source,
          {
            id,
            dto,
          }: {
            id: string;
            dto: { isMale: boolean; yearOfBirth: number; memberTypeId: MemberTypeId };
          },
          { prisma }: FastifyInstance,
        ) => {
          return await prisma.profile.update({ where: { id }, data: dto });
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
      const gqlErrors = validate(schema, parse(query), [depthLimit(5)]);

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
