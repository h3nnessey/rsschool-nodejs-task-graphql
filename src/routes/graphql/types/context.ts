import { Prisma, PrismaClient } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library.js';

export interface ContextValue {
  prisma: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
}
