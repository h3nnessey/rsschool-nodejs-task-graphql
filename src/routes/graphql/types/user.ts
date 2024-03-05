import {
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import { UUIDType } from './uuid.js';
import { profileType } from './profile.js';
import { ContextValue } from './context.js';
import { postType } from './post.js';

export interface User {
  id: string;
  name: string;
  balance: number;
  subscribedToUser?: { subscriberId: string }[];
  userSubscribedTo?: { authorId: string }[];
}

export const createUserInputType = new GraphQLInputObjectType({
  name: 'CreateUserInput',
  fields: () => ({
    name: { type: GraphQLString },
    balance: { type: GraphQLFloat },
  }),
});

export const changeUserInputType = new GraphQLInputObjectType({
  name: 'ChangeUserInput',
  fields: () => ({
    name: { type: GraphQLString },
    balance: { type: GraphQLFloat },
  }),
});

export const userType: GraphQLObjectType = new GraphQLObjectType({
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
      resolve: async ({ id }: User, _args, { profileLoader }: ContextValue) => {
        return await profileLoader.load(id);
      },
    },
    posts: {
      type: new GraphQLList(postType),
      resolve: async ({ id }: User, _args, { postLoader }: ContextValue) => {
        return await postLoader.load(id);
      },
    },
    userSubscribedTo: {
      type: new GraphQLList(userType),
      resolve: async (
        { userSubscribedTo }: User,
        _args,
        { userLoader }: ContextValue,
      ) => {
        return userSubscribedTo
          ? await userLoader.loadMany(userSubscribedTo.map(({ authorId }) => authorId))
          : [];
      },
    },
    subscribedToUser: {
      type: new GraphQLList(userType),
      resolve: async (
        { subscribedToUser }: User,
        _args,
        { userLoader }: ContextValue,
      ) => {
        return subscribedToUser
          ? await userLoader.loadMany(
              subscribedToUser.map(({ subscriberId }) => subscriberId),
            )
          : [];
      },
    },
  }),
});
