import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileJson, Hash, MessageCircle, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';
import { exportConversations, exportRoom, downloadBlob } from '../api/export';
import toast from 'react-hot-toast';
import api from '../api/axios';

interface Room {
  _id: string;
  name: string;
  description?: string;
}

export default function ExportChat() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [exportingConvos, setExportingConvos] = useState(false);
  const [exportingRoom, setExportingRoom] = useState<string | null>(null);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const { data } = await api.get('/rooms');
        setRooms(data.rooms || data || []);
      } catch {
        // ignore
      } finally {
        setIsLoadingRooms(false);
      }
    };
    loadRooms();
  }, []);

  const handleExportConversations = async () => {
    setExportingConvos(true);
    try {
      const blob = await exportConversations();
      downloadBlob(blob, 'chatsphere-conversations.json');
      toast.success('Conversations exported!');
    } catch {
      toast.error('Failed to export conversations');
    } finally {
      setExportingConvos(false);
    }
  };

  const handleExportRoom = async (roomId: string, roomName: string) => {
    setExportingRoom(roomId);
    try {
      const blob = await exportRoom(roomId);
      downloadBlob(blob, `chatsphere-room-${roomName.replace(/\s+/g, '-').toLowerCase()}.json`);
      toast.success(`Room "${roomName}" exported!`);
    } catch {
      toast.error('Failed to export room');
    } finally {
      setExportingRoom(null);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Download size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Export Data</h1>
              <p className="text-sm text-gray-500">Download your chat history as JSON files</p>
            </div>
          </div>

          {/* Solo conversations */}
          <div className="mb-6 p-5 rounded-2xl bg-navy-800 border border-navy-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle size={18} className="text-neon-purple" />
                <div>
                  <h3 className="font-medium text-white">Solo Conversations</h3>
                  <p className="text-xs text-gray-500">Export all your AI conversations</p>
                </div>
              </div>
              <button
                onClick={handleExportConversations}
                disabled={exportingConvos}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-neon-purple to-neon-blue text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 active:scale-95"
              >
                {exportingConvos ? (
                  <><Loader size={14} className="animate-spin" /> Exporting...</>
                ) : (
                  <><FileJson size={14} /> Export JSON</>
                )}
              </button>
            </div>
          </div>

          {/* Room exports */}
          <div className="p-5 rounded-2xl bg-navy-800 border border-navy-700/50">
            <div className="flex items-center gap-3 mb-4">
              <Hash size={18} className="text-neon-blue" />
              <div>
                <h3 className="font-medium text-white">Room Messages</h3>
                <p className="text-xs text-gray-500">Export messages from specific rooms</p>
              </div>
            </div>

            {isLoadingRooms ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 rounded-xl bg-navy-900/50 animate-pulse" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-6">No rooms found</p>
            ) : (
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div
                    key={room._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-navy-900/30 border border-navy-700/30 hover:border-navy-600/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center text-neon-blue flex-shrink-0">
                        <Hash size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">{room.name}</p>
                        {room.description && (
                          <p className="text-[10px] text-gray-600 truncate">{room.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleExportRoom(room._id, room.name)}
                      disabled={exportingRoom === room._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-navy-700 transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      {exportingRoom === room._id ? (
                        <Loader size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
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
