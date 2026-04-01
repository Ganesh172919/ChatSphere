interface ReactionPickerProps {
  onSelect: (emoji: string) => void
}

const EMOJIS = ['👍', '🔥', '🤯', '💡']

export function ReactionPicker({ onSelect }: ReactionPickerProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-bg-secondary p-1.5 shadow-lg ring-1 ring-bg-elevated">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="rounded px-2 py-1 text-lg transition-colors hover:bg-bg-primary"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
