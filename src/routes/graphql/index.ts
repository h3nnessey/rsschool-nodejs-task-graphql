import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  graphql,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLBoolean,
  parse,
  validate,
} from 'graphql';
import { reGenLoaders } from './loaders/loaders.js';
import depthLimit from 'graphql-depth-limit';
import { ContextValue } from './types/context.js';
import { changeUserInputType, createUserInputType, userType } from './types/user.js';
import { changePostInputType, createPostInputType, postType } from './types/post.js';
import {
  createProfileInputType,
  changeProfileInputType,
  profileType,
  Profile,
} from './types/profile.js';
import { memberType, memberTypeId } from './types/member.js';
import { MemberTypeId } from '../member-types/schemas.js';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { UUIDType } from './types/uuid.js';

import { User } from '@prisma/client';
import { parseResolveInfo } from 'graphql-parse-resolve-info';

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      users: {
        type: new GraphQLList(userType),
        resolve: async (
          _source,
          _args,
          { prisma, userLoader }: ContextValue,
          resolveInfo,
        ) => {
          const requestedUserFields =
            parseResolveInfo(resolveInfo)?.fieldsByTypeName.User ?? {};

          const users = await prisma.user.findMany({
            include: {
              subscribedToUser: 'subscribedToUser' in requestedUserFields,
              userSubscribedTo: 'userSubscribedTo' in requestedUserFields,
            },
          });

          const ids: string[] = [];

          const userMap = new Map<string, User>(
            users.map((user) => {
              user.subscribedToUser?.forEach((subscriber) =>
                ids.push(subscriber.subscriberId),
              );

              user.userSubscribedTo?.forEach((author) => ids.push(author.authorId));

              return [user.id, user];
            }),
          );

          ids.forEach((id) => userLoader.prime(id, userMap.get(id) as User));

          return users;
        },
      },
      user: {
        type: userType,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (
          _source,
          { id }: { id: string },
          { userLoader }: ContextValue,
        ) => {
          return await userLoader.load(id);
        },
      },
      posts: {
        type: new GraphQLList(postType),
        resolve: async (_source, _args, { prisma }: ContextValue) => {
          return await prisma.post.findMany();
        },
      },
      post: {
        type: postType,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: ContextValue) => {
          return await prisma.post.findUnique({ where: { id } });
        },
      },
      memberTypes: {
        type: new GraphQLList(memberType),
        resolve: async (_source, _args, { prisma }: ContextValue) => {
          return await prisma.memberType.findMany();
        },
      },
      memberType: {
        type: memberType,
        args: { id: { type: new GraphQLNonNull(memberTypeId) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: ContextValue) => {
          return await prisma.memberType.findUnique({ where: { id } });
        },
      },
      profiles: {
        type: new GraphQLList(profileType),
        resolve: async (_source, _args, { prisma }: ContextValue) => {
          return await prisma.profile.findMany();
        },
      },
      profile: {
        type: profileType,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: ContextValue) => {
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
        args: { dto: { type: new GraphQLNonNull(createUserInputType) } },
        resolve: async (
          _source,
          { dto }: { dto: { name: string; balance: number } },
          { prisma }: ContextValue,
        ) => {
          return await prisma.user.create({
            data: dto,
          });
        },
      },
      createPost: {
        type: postType,
        args: { dto: { type: new GraphQLNonNull(createPostInputType) } },
        resolve: async (
          _source,
          { dto }: { dto: { title: string; content: string; authorId: string } },
          { prisma }: ContextValue,
        ) => {
          return await prisma.post.create({ data: dto });
        },
      },
      createProfile: {
        type: profileType,
        args: { dto: { type: new GraphQLNonNull(createProfileInputType) } },
        resolve: async (
          _source,
          {
            dto,
          }: {
            dto: Omit<Profile, 'id'>;
          },
          { prisma }: ContextValue,
        ) => {
          const res = await prisma.profile.create({ data: dto });
          return res;
        },
      },
      deleteUser: {
        type: GraphQLBoolean,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (
          _source,
          { id }: { id: string },
          { prisma, userLoader }: ContextValue,
        ) => {
          try {
            userLoader.clear(id);
            await prisma.user.delete({ where: { id } });

            return true;
          } catch {
            return false;
          }
        },
      },
      deletePost: {
        type: GraphQLBoolean,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: ContextValue) => {
          try {
            await prisma.post.delete({ where: { id } });

            return true;
          } catch {
            return false;
          }
        },
      },
      deleteProfile: {
        type: GraphQLBoolean,
        args: { id: { type: new GraphQLNonNull(UUIDType) } },
        resolve: async (_source, { id }: { id: string }, { prisma }: ContextValue) => {
          try {
            await prisma.profile.delete({ where: { id } });

            return true;
          } catch {
            return false;
          }
        },
      },
      changeUser: {
        type: userType,
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
          dto: { type: new GraphQLNonNull(changeUserInputType) },
        },
        resolve: async (
          _source,
          { id, dto }: { id: string; dto: Pick<User, 'name' | 'balance'> },
          { prisma, userLoader }: ContextValue,
        ) => {
          userLoader.clear(id);

          return await prisma.user.update({ where: { id }, data: dto });
        },
      },
      changePost: {
        type: postType,
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
          dto: { type: new GraphQLNonNull(changePostInputType) },
        },
        resolve: async (
          _source,
          { id, dto }: { id: string; dto: { title: string; content: string } },
          { prisma }: ContextValue,
        ) => {
          return await prisma.post.update({ where: { id }, data: dto });
        },
      },
      changeProfile: {
        type: profileType,
        args: {
          id: { type: new GraphQLNonNull(UUIDType) },
          dto: { type: new GraphQLNonNull(changeProfileInputType) },
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
          { prisma }: ContextValue,
        ) => {
          return await prisma.profile.update({ where: { id }, data: dto });
        },
      },
      subscribeTo: {
        type: userType,
        args: {
          userId: { type: new GraphQLNonNull(UUIDType) },
          authorId: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (
          _source,
          { userId, authorId }: { userId: string; authorId: string },
          { prisma, userLoader }: ContextValue,
        ) => {
          userLoader.clear(userId);

          return await prisma.user.update({
            where: {
              id: userId,
            },
            data: {
              userSubscribedTo: {
                create: {
                  authorId: authorId,
                },
              },
            },
          });
        },
      },
      unsubscribeFrom: {
        type: GraphQLBoolean,
        args: {
          userId: { type: new GraphQLNonNull(UUIDType) },
          authorId: { type: new GraphQLNonNull(UUIDType) },
        },
        resolve: async (
          _source,
          { userId, authorId }: { userId: string; authorId: string },
          { prisma, userLoader }: ContextValue,
        ) => {
          try {
            userLoader.clear(userId);

            await prisma.subscribersOnAuthors.delete({
              where: {
                subscriberId_authorId: {
                  subscriberId: userId,
                  authorId: authorId,
                },
              },
            });

            return true;
          } catch {
            return false;
          }
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
        contextValue: {
          prisma: fastify.prisma,
          ...reGenLoaders(fastify.prisma),
        },
      });
    },
  });
};

export default plugin;
