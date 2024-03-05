import { Type } from '@fastify/type-provider-typebox';
import { parseResolveInfo } from 'graphql-parse-resolve-info';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLBoolean,
} from 'graphql';
import {
  changeUserInputType,
  createUserInputType,
  userType,
  User,
} from './types/user.js';
import { ContextValue } from './types/context.js';
import {
  changePostInputType,
  createPostInputType,
  postType,
  Post,
} from './types/post.js';
import {
  createProfileInputType,
  changeProfileInputType,
  profileType,
  Profile,
} from './types/profile.js';
import { memberType, memberTypeId } from './types/member.js';
import { UUIDType } from './types/uuid.js';

export const gqlResponseSchema = Type.Partial(
  Type.Object({
    data: Type.Any(),
    errors: Type.Any(),
  }),
);

export const createGqlResponseSchema = {
  body: Type.Object(
    {
      query: Type.String(),
      variables: Type.Optional(Type.Record(Type.String(), Type.Any())),
    },
    {
      additionalProperties: false,
    },
  ),
};

export const DEPTH_LIMIT = 5;

export const schema = new GraphQLSchema({
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
          { dto }: { dto: Pick<User, 'balance' | 'name'> },
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
          { dto }: { dto: Omit<Post, 'id'> },
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
        resolve: async (_source, { id }: { id: string }, { prisma }: ContextValue) => {
          try {
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
          { prisma }: ContextValue,
        ) => {
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
          { id, dto }: { id: string; dto: Pick<Post, 'title' | 'content'> },
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
            dto: Omit<Profile, 'id' | 'userId'>;
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
          { prisma }: ContextValue,
        ) => {
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
          { prisma }: ContextValue,
        ) => {
          try {
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
