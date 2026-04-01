import { z } from "zod";

export const uploadMetadataSchema = z.object({
  roomId: z.string().cuid().optional(),
  visibility: z.enum(["PRIVATE", "ROOM"]).default("PRIVATE")
});
