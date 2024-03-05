import DataLoader from 'dataloader';
import { PrismaClientType } from '../types/context.js';
import { MemberType } from '../types/member.js';
import { Post } from '../types/post.js';
import { Profile } from '../types/profile.js';
import { User } from '../types/user.js';

const batchUsers = async (ids: string[], prisma: PrismaClientType): Promise<User[]> => {
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    include: {
      userSubscribedTo: true,
      subscribedToUser: true,
    },
  });

  const usersMap = new Map<string, User>(users.map((user) => [user.id, user]));

  const sortedUsers = ids.map((id) => usersMap.get(id) as User);

  return sortedUsers;
};

const batchMemberTypes = async (
  ids: string[],
  prisma: PrismaClientType,
): Promise<MemberType[]> => {
  const memberTypes = await prisma.memberType.findMany({
    where: { id: { in: ids } },
  });

  const memberTypeMap = new Map<string, MemberType>(
    memberTypes.map((memberType) => [memberType.id, memberType]),
  );

  const sortedMemberTypes = ids.map((id) => memberTypeMap.get(id) as MemberType);

  return sortedMemberTypes;
};

const batchPosts = async (ids: string[], prisma: PrismaClientType): Promise<Post[][]> => {
  const posts = await prisma.post.findMany({ where: { authorId: { in: ids } } });

  const postMap: Record<string, Post[]> = {};

  posts.forEach((post) => {
    const id = post.authorId;
    const authorPosts = postMap[id];

    if (authorPosts) {
      authorPosts.push(post);
    } else {
      postMap[id] = [post];
    }
  });

  const sortedPosts = ids.map((id) => postMap[id]);

  return sortedPosts;
};

const batchProfiles = async (
  ids: string[],
  prisma: PrismaClientType,
): Promise<Profile[]> => {
  const profiles = await prisma.profile.findMany({
    where: { userId: { in: ids } },
  });

  const profilesMap = new Map<string, Profile>(
    profiles.map((profile) => [profile.userId, profile]),
  );

  const sortedProfiles = ids.map((id) => profilesMap.get(id) as Profile);

  return sortedProfiles;
};

export const reGenLoaders = (prisma: PrismaClientType) => {
  return {
    userLoader: new DataLoader<string, User>((ids) =>
      batchUsers(ids as string[], prisma),
    ),
    memberTypeLoader: new DataLoader<string, MemberType>((ids) =>
      batchMemberTypes(ids as string[], prisma),
    ),
    postLoader: new DataLoader<string, Post[]>((ids) =>
      batchPosts(ids as string[], prisma),
    ),
    profileLoader: new DataLoader<string, Profile>((ids) =>
      batchProfiles(ids as string[], prisma),
    ),
  };
};
