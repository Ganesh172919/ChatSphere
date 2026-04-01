import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function formatTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const EMOJI_MAP: Record<string, string> = {
  THUMBS_UP: '👍',
  FIRE: '🔥',
  MIND_BLOWN: '🤯',
  IDEA: '💡',
}

export const REVERSE_EMOJI_MAP: Record<string, string> = {
  '👍': 'THUMBS_UP',
  '🔥': 'FIRE',
  '🤯': 'MIND_BLOWN',
  '💡': 'IDEA',
}

export const PRESENCE_COLORS: Record<string, string> = {
  ONLINE: '#00d68f',
  AWAY: '#ffaa00',
  OFFLINE: '#6b6b80',
}

export const ROLE_COLORS: Record<string, string> = {
  OWNER: '#6c5ce7',
  ADMIN: '#4ecdc4',
  MEMBER: '#a0a0b8',
}
