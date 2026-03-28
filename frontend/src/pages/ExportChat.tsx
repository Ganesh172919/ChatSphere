import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileJson, FileText, Hash, Loader, Upload, Database } from 'lucide-react';
import Navbar from '../components/Navbar';
import { downloadBlob, exportConversations, exportRoom } from '../api/export';
import { exportMemoryBundle, importMemoryBundle, previewMemoryImport, type ImportPreview } from '../api/memory';
import toast from 'react-hot-toast';
import api from '../api/axios';

interface Room {
  id: string;
  name: string;
  description?: string;
}

type ExportFormat = 'normalized' | 'markdown' | 'adapter';

function getFilename(prefix: string, format: ExportFormat) {
  return `${prefix}.${format === 'markdown' ? 'md' : 'json'}`;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export default function ExportChat() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('normalized');
  const [exportingConversations, setExportingConversations] = useState(false);
  const [exportingMemory, setExportingMemory] = useState(false);
  const [exportingRoom, setExportingRoom] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const { data } = await api.get<Room[] | { rooms?: Room[] }>('/rooms');
        setRooms(Array.isArray(data) ? data : data.rooms || []);
      } catch {
        setRooms([]);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    void loadRooms();
  }, []);

  const handleExportConversations = async () => {
    setExportingConversations(true);
    try {
      const blob = await exportConversations(exportFormat);
      downloadBlob(blob, getFilename('chatsphere-conversations', exportFormat));
      toast.success('Conversations exported');
    } catch {
      toast.error('Failed to export conversations');
    } finally {
      setExportingConversations(false);
    }
  };

  const handleExportMemory = async () => {
    setExportingMemory(true);
    try {
      const blob = await exportMemoryBundle(exportFormat);
      downloadBlob(blob, getFilename('chatsphere-memory', exportFormat));
      toast.success('Memory exported');
    } catch {
      toast.error('Failed to export memory');
    } finally {
      setExportingMemory(false);
    }
  };

  const handleExportRoom = async (room: Room) => {
    setExportingRoom(room.id);
    try {
      const blob = await exportRoom(room.id);
      downloadBlob(blob, `chatsphere-room-${room.name.replace(/\s+/g, '-').toLowerCase()}.json`);
      toast.success(`Room "${room.name}" exported`);
    } catch {
      toast.error('Failed to export room');
    } finally {
      setExportingRoom(null);
    }
  };

  const handlePreviewImport = async () => {
    if (!importFile) {
      toast.error('Choose an import file first');
      return;
    }

    setPreviewLoading(true);
    try {
      const content = await readFileAsText(importFile);
      const preview = await previewMemoryImport(content, importFile.name);
      setImportPreview(preview);
    } catch {
      toast.error('Failed to preview import');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Choose an import file first');
      return;
    }

    setImporting(true);
    try {
      const content = await readFileAsText(importFile);
      const result = await importMemoryBundle(content, importFile.name);
      setImportPreview(null);
      setImportFile(null);
      toast.success(
        result.reused
          ? 'That file was already imported before'
          : `Imported ${result.importedConversationIds.length} conversation(s) and ${result.importedMemoryIds.length} memories`
      );
    } catch {
      toast.error('Failed to import file');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8 pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
                <Download size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-white">Data Portability Center</h1>
                <p className="text-sm text-gray-500">Import from other AI tools and export ChatSphere in reusable formats</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-navy-700/50 bg-navy-800/70 p-2">
              {(['normalized', 'markdown', 'adapter'] as ExportFormat[]).map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    exportFormat === format ? 'bg-neon-purple/20 text-neon-purple' : 'text-gray-400 hover:text-white'
                  }`}
                  type="button"
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-navy-700/50 bg-navy-800 p-5">
              <div className="mb-4 flex items-center gap-3">
                <FileJson size={18} className="text-neon-purple" />
                <div>
                  <h3 className="font-medium text-white">Conversation Export</h3>
                  <p className="text-xs text-gray-500">Includes synced conversations, insights, and memory metadata</p>
                </div>
              </div>
              <button
                onClick={() => void handleExportConversations()}
                disabled={exportingConversations}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-50"
                type="button"
              >
                {exportingConversations ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                Export conversations
              </button>
            </div>

            <div className="rounded-2xl border border-navy-700/50 bg-navy-800 p-5">
              <div className="mb-4 flex items-center gap-3">
                <Database size={18} className="text-neon-blue" />
                <div>
                  <h3 className="font-medium text-white">Memory Export</h3>
                  <p className="text-xs text-gray-500">Portable memory bundle for reuse in external AI workflows</p>
                </div>
              </div>
              <button
                onClick={() => void handleExportMemory()}
                disabled={exportingMemory}
                className="flex items-center gap-2 rounded-xl border border-neon-blue/30 bg-neon-blue/10 px-4 py-2 text-sm font-medium text-neon-blue transition-all disabled:opacity-50"
                type="button"
              >
                {exportingMemory ? <Loader size={14} className="animate-spin" /> : <FileText size={14} />}
                Export memory
              </button>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-navy-700/50 bg-navy-800 p-5">
            <div className="mb-4 flex items-center gap-3">
              <Upload size={18} className="text-emerald-400" />
              <div>
                <h3 className="font-medium text-white">Import External AI History</h3>
                <p className="text-xs text-gray-500">Supports ChatGPT exports, Claude-style files, and generic markdown or text</p>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-dashed border-navy-600/60 bg-navy-900/30 p-4">
              <input
                type="file"
                accept=".json,.md,.markdown,.txt"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] || null);
                  setImportPreview(null);
                }}
                className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-xl file:border-0 file:bg-neon-purple/20 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neon-purple"
              />
              {importFile ? (
                <p className="mt-3 text-sm text-gray-400">Selected file: {importFile.name}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void handlePreviewImport()}
                disabled={!importFile || previewLoading}
                className="rounded-xl border border-navy-600/60 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-neon-purple/30 hover:text-white disabled:opacity-50"
                type="button"
              >
                {previewLoading ? 'Previewing...' : 'Preview import'}
              </button>
              <button
                onClick={() => void handleImport()}
                disabled={!importFile || importing}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-50"
                type="button"
              >
                {importing ? 'Importing...' : 'Import into ChatSphere'}
              </button>
            </div>

            {importPreview ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-navy-700/50 bg-navy-900/40 p-4">
                  <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">Preview</p>
                  <p className="text-sm text-white">Detected source: {importPreview.sourceType}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Conversations: {importPreview.conversations.length} · Candidate memories: {importPreview.candidateMemories.length}
                  </p>
                  {importPreview.errors.length > 0 ? (
                    <div className="mt-3 space-y-1 text-xs text-amber-400">
                      {importPreview.errors.map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-navy-700/50 bg-navy-900/40 p-4">
                  <p className="mb-3 text-xs uppercase tracking-wider text-gray-500">Candidate memory</p>
                  <div className="space-y-2">
                    {importPreview.candidateMemories.slice(0, 4).map((memory) => (
                      <div key={memory.summary} className="rounded-xl bg-navy-800/70 px-3 py-2">
                        <p className="text-sm text-white">{memory.summary}</p>
                        <p className="mt-1 text-xs text-gray-500">{memory.tags.join(', ') || 'No tags'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-navy-700/50 bg-navy-800 p-5">
            <div className="mb-4 flex items-center gap-3">
              <Hash size={18} className="text-neon-blue" />
              <div>
                <h3 className="font-medium text-white">Room Message Export</h3>
                <p className="text-xs text-gray-500">Export messages from specific rooms you belong to</p>
              </div>
            </div>

            {isLoadingRooms ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-xl bg-navy-900/50" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-600">No rooms found</p>
            ) : (
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between rounded-xl border border-navy-700/30 bg-navy-900/30 p-3 transition-colors hover:border-navy-600/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{room.name}</p>
                      {room.description ? <p className="truncate text-[10px] text-gray-600">{room.description}</p> : null}
                    </div>
                    <button
                      onClick={() => void handleExportRoom(room)}
                      disabled={exportingRoom === room.id}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-navy-700 hover:text-white disabled:opacity-50"
                      type="button"
                    >
                      {exportingRoom === room.id ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
                      Export
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
