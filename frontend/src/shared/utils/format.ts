import { formatDistanceToNowStrict, formatISO9075 } from "date-fns";

export const formatRelativeTime = (value?: string | Date | null) => {
  if (!value) {
    return "just now";
  }

  return `${formatDistanceToNowStrict(new Date(value), { addSuffix: false })} ago`;
};

export const formatTimestamp = (value?: string | Date | null) => {
  if (!value) {
    return "Unknown";
  }

  return formatISO9075(new Date(value));
};

export const formatBytes = (bytes?: number | null) => {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let current = bytes;
  let unitIndex = 0;

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  return `${current.toFixed(current > 10 ? 0 : 1)} ${units[unitIndex]}`;
};
