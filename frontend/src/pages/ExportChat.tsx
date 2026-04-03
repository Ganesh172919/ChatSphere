import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileJson, Hash, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';
import { downloadBlob, exportConversations, exportRoom } from '../api/export';
import toast from 'react-hot-toast';
import api from '../api/axios';

interface Room {
  id: string;
  name: string;
  description?: string;
  visibility?: 'public' | 'private';
}

type ExportFormat = 'normalized' | 'markdown' | 'adapter';

function getFilename(prefix: string, format: ExportFormat) {
  return `${prefix}.${format === 'markdown' ? 'md' : 'json'}`;
}

export default function ExportChat() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('normalized');
  const [exportingConversations, setExportingConversations] = useState(false);
  const [exportingRoom, setExportingRoom] = useState<string | null>(null);

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
                <h1 className="font-display text-2xl font-bold text-white">Chat Export Center</h1>
                <p className="text-sm text-gray-500">Download your solo conversations and room history in reusable formats.</p>
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

          <div className="mb-6 rounded-2xl border border-navy-700/50 bg-navy-800 p-5">
            <div className="mb-4 flex items-center gap-3">
              <FileJson size={18} className="text-neon-purple" />
              <div>
                <h3 className="font-medium text-white">Conversation Export</h3>
                <p className="text-xs text-gray-500">Download your synced solo conversations and assistant responses.</p>
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
              <Hash size={18} className="text-neon-blue" />
              <div>
                <h3 className="font-medium text-white">Room Message Export</h3>
                <p className="text-xs text-gray-500">Export message history from rooms you belong to.</p>
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
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">{room.name}</p>
                        {room.visibility ? (
                          <span className="rounded-full border border-navy-600/50 bg-navy-800/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gray-400">
                            {room.visibility}
                          </span>
                        ) : null}
                      </div>
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
