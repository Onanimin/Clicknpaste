import { PrismaClient } from '@prisma/client';

let prismaClient;

function getPrismaClient() {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}

export const prisma = getPrismaClient();