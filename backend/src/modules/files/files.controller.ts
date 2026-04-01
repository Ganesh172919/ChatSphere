import type { Request, Response } from "express";
import { ok } from "../../helpers/api-response";
import { AppError } from "../../helpers/app-error";
import { requireStringParam } from "../../helpers/request";
import { uploadMetadataSchema } from "./files.schemas";
import { filesService } from "./files.service";

export const filesController = {
  async upload(request: Request, response: Response) {
    if (!request.file) {
      throw new AppError(400, "FILE_REQUIRED", "A file is required");
    }

    const metadata = uploadMetadataSchema.parse(request.body);
    const upload = await filesService.saveUpload(request.user!.sub, request.file, metadata);
    response.status(201).json(ok({ upload }));
  },

  async download(request: Request, response: Response) {
    const fileId = requireStringParam(request.params.fileId, "fileId");
    const { upload, absolutePath } = await filesService.resolveDownload(request.user!.sub, fileId);
    response.setHeader("Content-Type", upload.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(upload.originalName)}"`);
    response.sendFile(absolutePath);
  }
};
