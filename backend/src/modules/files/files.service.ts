import fs from "node:fs/promises";
import path from "node:path";
import { UploadVisibility } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../helpers/app-error";
import { fileStorageService } from "../../services/files/file-storage.service";

export const filesService = {
  async saveUpload(
    userId: string,
    file: Express.Multer.File,
    input: { roomId?: string; visibility: "PRIVATE" | "ROOM" }
  ) {
    if (input.visibility === "ROOM") {
      if (!input.roomId) {
        throw new AppError(400, "ROOM_ID_REQUIRED", "roomId is required for room-scoped uploads");
      }

      const membership = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: input.roomId,
            userId
          }
        }
      });

      if (!membership) {
        throw new AppError(403, "ROOM_ACCESS_DENIED", "You are not allowed to upload files to this room");
      }
    }

    await fileStorageService.ensureUploadDirectory();
    const storageKey = await fileStorageService.createStorageKey(file.originalname);
    const absolutePath = fileStorageService.resolvePath(storageKey);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    return prisma.upload.create({
      data: {
        ownerId: userId,
        uploadedById: userId,
        roomId: input.visibility === "ROOM" ? input.roomId : undefined,
        storageKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        visibility: input.visibility === "ROOM" ? UploadVisibility.ROOM : UploadVisibility.PRIVATE
      }
    });
  },

  async resolveDownload(userId: string, fileId: string) {
    const upload = await prisma.upload.findUnique({
      where: { id: fileId }
    });

    if (!upload) {
      throw new AppError(404, "UPLOAD_NOT_FOUND", "Upload not found");
    }

    if (upload.ownerId !== userId) {
      if (!upload.roomId) {
        throw new AppError(403, "UPLOAD_ACCESS_DENIED", "You are not allowed to download this file");
      }

      const membership = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: upload.roomId,
            userId
          }
        }
      });

      if (!membership) {
        throw new AppError(403, "UPLOAD_ACCESS_DENIED", "You are not allowed to download this file");
      }
    }

    return {
      upload,
      absolutePath: fileStorageService.resolvePath(upload.storageKey)
    };
  }
};
