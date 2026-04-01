import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";

export const fileStorageService = {
  async ensureUploadDirectory() {
    await fs.mkdir(env.uploadDir, { recursive: true });
  },
  async createStorageKey(originalName: string) {
    const extension = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, "");
    return `${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
  },
  resolvePath(storageKey: string) {
    return path.resolve(env.uploadDir, storageKey);
  }
};
