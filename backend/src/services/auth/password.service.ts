import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export const passwordService = {
  hash: async (value: string) => bcrypt.hash(value, SALT_ROUNDS),
  compare: async (value: string, hash: string) => bcrypt.compare(value, hash)
};
