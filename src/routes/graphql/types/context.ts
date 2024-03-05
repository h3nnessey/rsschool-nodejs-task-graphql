import { Prisma, PrismaClient } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library.js';
import DataLoader from 'dataloader';
import { User } from './user.js';
import { MemberType } from './member.js';
import { Post } from './post.js';
import { Profile } from './profile.js';

export type PrismaClientType = PrismaClient<
  Prisma.PrismaClientOptions,
  never,
  DefaultArgs
>;

export interface ContextValue {
  prisma: PrismaClientType;
  userLoader: DataLoader<string, User, string>;
  memberTypeLoader: DataLoader<string, MemberType, string>;
  postLoader: DataLoader<string, Post, string>;
  profileLoader: DataLoader<string, Profile, string>;
}
