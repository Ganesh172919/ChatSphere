import { useEffect, useMemo, useState } from 'react';
import { Brain, Edit3, Pin, Save, Search, Trash2, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  deleteMemoryEntry,
  fetchMemoryEntries,
  type MemoryEntry,
  updateMemoryEntry,
} from '../api/memory';
import toast from 'react-hot-toast';

interface DraftState {
  summary: string;
  details: string;
  tags: string;
  pinned: boolean;
}

function buildDraft(entry: MemoryEntry): DraftState {
  return {
    summary: entry.summary,
    details: entry.details,
    tags: entry.tags.join(', '),
    pinned: entry.pinned,
  };
}

export default function MemoryCenter() {
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);

  const loadMemoryEntries = async (query = '') => {
    setLoading(true);
    try {
      const entries = await fetchMemoryEntries(query);
      setMemoryEntries(entries);
    } catch {
      toast.error('Failed to load memory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMemoryEntries(search);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [search]);

  const summaryStats = useMemo(() => ({
    total: memoryEntries.length,
    pinned: memoryEntries.filter((entry) => entry.pinned).length,
  }), [memoryEntries]);

  const beginEdit = (entry: MemoryEntry) => {
    setEditingId(entry.id);
    setDraft(buildDraft(entry));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const handleSave = async (entry: MemoryEntry) => {
    if (!draft) return;

    try {
      const updated = await updateMemoryEntry(entry.id, {
        summary: draft.summary,
        details: draft.details,
        pinned: draft.pinned,
        tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });

      setMemoryEntries((current) => current.map((item) => (item.id === entry.id ? {
        ...item,
        ...updated,
        id: entry.id,
        tags: Array.isArray(updated.tags) ? updated.tags : item.tags,
      } : item)));
      toast.success('Memory updated');
      cancelEdit();
    } catch {
      toast.error('Failed to update memory');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMemoryEntry(id);
      setMemoryEntries((current) => current.filter((entry) => entry.id !== id));
      toast.success('Memory deleted');
    } catch {
      toast.error('Failed to delete memory');
    }
  };

  const handlePinToggle = async (entry: MemoryEntry) => {
    try {
      const updated = await updateMemoryEntry(entry.id, { pinned: !entry.pinned });
      setMemoryEntries((current) => current.map((item) => (item.id === entry.id ? {
        ...item,
        ...updated,
        id: entry.id,
      } : item)));
    } catch {
      toast.error('Failed to update memory pin');
    }
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-24">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple to-neon-blue">
              <Brain size={22} className="text-white" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white">What I know about you</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Review, edit, pin, or delete the memory items ChatSphere can use to personalize future replies.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-navy-700/50 bg-navy-800/70 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-600">Memories</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summaryStats.total}</p>
            </div>
            <div className="rounded-2xl border border-navy-700/50 bg-navy-800/70 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-600">Pinned</p>
              <p className="mt-1 text-2xl font-semibold text-white">{summaryStats.pinned}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-navy-700/50 bg-navy-800/70 px-4 py-3">
          <Search size={16} className="text-gray-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search memory, tags, or details..."
            className="w-full bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-44 animate-pulse rounded-2xl bg-navy-800" />
            ))}
          </div>
        ) : memoryEntries.length === 0 ? (
          <div className="rounded-2xl border border-navy-700/50 bg-navy-800/70 px-6 py-12 text-center">
            <p className="text-white">No memories found yet.</p>
            <p className="mt-2 text-sm text-gray-500">
              Import past AI conversations from the export center or keep chatting so ChatSphere can learn useful context.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {memoryEntries.map((entry) => {
              const isEditing = editingId === entry.id && draft;

              return (
                <article key={entry.id} className="rounded-2xl border border-navy-700/50 bg-navy-800/70 p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-neon-blue/20 bg-neon-blue/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-neon-blue">
                          {entry.sourceType}
                        </span>
                        {entry.pinned ? (
                          <span className="rounded-full border border-neon-purple/20 bg-neon-purple/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-neon-purple">
                            pinned
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-gray-500">Used {entry.usageCount} times</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handlePinToggle(entry)}
                        className={`rounded-lg p-2 transition-colors ${entry.pinned ? 'text-neon-purple' : 'text-gray-500 hover:text-white'}`}
                        type="button"
                      >
                        <Pin size={14} />
                      </button>
                      <button
                        onClick={() => beginEdit(entry)}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:text-white"
                        type="button"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => void handleDelete(entry.id)}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:text-red-400"
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        value={draft.summary}
                        onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                        className="w-full rounded-xl border border-neon-purple/30 bg-navy-900/40 px-3 py-2 text-sm text-white focus:outline-none"
                      />
                      <textarea
                        value={draft.details}
                        onChange={(event) => setDraft({ ...draft, details: event.target.value })}
                        rows={4}
                        className="w-full rounded-xl border border-neon-purple/30 bg-navy-900/40 px-3 py-2 text-sm text-white focus:outline-none"
                      />
                      <input
                        value={draft.tags}
                        onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
                        placeholder="comma, separated, tags"
                        className="w-full rounded-xl border border-neon-purple/30 bg-navy-900/40 px-3 py-2 text-sm text-white focus:outline-none"
                      />
                      <label className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          checked={draft.pinned}
                          onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })}
                          type="checkbox"
                        />
                        Keep this memory pinned
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => void handleSave(entry)}
                          className="flex items-center gap-2 rounded-xl bg-neon-purple/20 px-4 py-2 text-sm text-neon-purple transition-colors hover:bg-neon-purple/30"
                          type="button"
                        >
                          <Save size={14} />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-navy-700 hover:text-white"
                          type="button"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-lg font-semibold text-white">{entry.summary}</h2>
                      <p className="mt-2 text-sm text-gray-400">{entry.details || 'No extra details stored.'}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-navy-600/50 bg-navy-900/50 px-2.5 py-1 text-[11px] text-gray-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-gray-400">
                        <div className="rounded-xl bg-navy-900/40 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wider text-gray-600">Confidence</p>
                          <p className="mt-1 text-white">{Math.round(entry.confidenceScore * 100)}%</p>
                        </div>
                        <div className="rounded-xl bg-navy-900/40 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wider text-gray-600">Importance</p>
                          <p className="mt-1 text-white">{Math.round(entry.importanceScore * 100)}%</p>
                        </div>
                        <div className="rounded-xl bg-navy-900/40 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wider text-gray-600">Recency</p>
                          <p className="mt-1 text-white">{Math.round(entry.recencyScore * 100)}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
