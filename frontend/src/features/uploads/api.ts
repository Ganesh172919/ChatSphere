import { apiClient } from "@/shared/api/client";
import type { AttachmentMeta } from "@/shared/types/contracts";

export const UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.md,.csv,.json,.xml,.js,.ts";

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsText(file);
  });

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });

export const uploadFile = async (
  file: File,
  inlineMode: "ai" | "room" = "room"
): Promise<AttachmentMeta> => {
  const form = new FormData();
  form.append("file", file);

  const uploaded = await apiClient.upload<AttachmentMeta>("/api/uploads", form);
  const payload: AttachmentMeta = {
    fileUrl: uploaded.fileUrl,
    fileName: uploaded.fileName,
    originalName: uploaded.originalName,
    fileType: uploaded.fileType ?? file.type,
    fileSize: uploaded.fileSize ?? file.size,
  };

  if (inlineMode === "ai" && (file.type.startsWith("text/") || file.type.includes("json"))) {
    payload.textContent = (await readFileAsText(file)).slice(0, 20_000);
  }

  if (inlineMode === "ai" && file.type.startsWith("image/")) {
    payload.base64 = await readFileAsDataUrl(file);
  }

  return payload;
};
