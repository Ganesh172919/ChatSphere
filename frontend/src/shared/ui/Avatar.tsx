import { UserCircle2 } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback: string;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export const Avatar = ({ src, alt, fallback, size = "md", online }: AvatarProps) => {
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={cn(
          "inline-flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-3 text-text-base",
          sizes[size]
        )}
      >
        {src ? (
          <img src={src} alt={alt ?? fallback} className="h-full w-full object-cover" />
        ) : fallback ? (
          <span className="font-semibold uppercase">{fallback.slice(0, 2)}</span>
        ) : (
          <UserCircle2 className="h-5 w-5" />
        )}
      </span>
      {typeof online === "boolean" ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-2",
            online ? "bg-success-500" : "bg-text-soft"
          )}
        />
      ) : null}
    </span>
  );
};
