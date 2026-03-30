import type { AttachmentMeta } from "@/shared/types/contracts";
import { formatBytes } from "@/shared/utils/format";

export const AttachmentCard = ({ attachment }: { attachment: AttachmentMeta }) => {
  const fileName = attachment.originalName ?? attachment.fileName ?? "attachment";
  const isImage = attachment.fileType?.startsWith("image/");

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border/80 bg-surface-3/80">
      {isImage && attachment.fileUrl ? (
        <img
          src={attachment.fileUrl}
          alt={fileName}
          className="max-h-64 w-full object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium text-text-base">{fileName}</p>
          <p className="text-xs text-text-muted">
            {attachment.fileType ?? "file"} · {formatBytes(attachment.fileSize)}
          </p>
        </div>
        {attachment.fileUrl ? (
          <a
            className="rounded-full border border-border px-3 py-1 text-xs text-accent transition hover:border-border-strong"
            href={attachment.fileUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open
          </a>
        ) : null}
      </div>
    </div>
  );
};
