import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? ""
  });

  return new PrismaClient({ adapter });
};

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma = global.__prisma__ ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
