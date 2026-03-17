import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import RoomCard from '../components/RoomCard';
import CreateRoomModal from '../components/CreateRoomModal';
import { fetchRooms, createRoom } from '../api/rooms';
import type { Room } from '../api/rooms';
import toast from 'react-hot-toast';

export default function Rooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRooms();
      setRooms(data);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreateRoom = async (name: string, description: string, tags: string[], maxUsers: number) => {
    try {
      const room = await createRoom(name, description, tags, maxUsers);
      setRooms((prev) => [room, ...prev]);
      setShowCreateModal(false);
      toast.success('Room created!');
      navigate(`/group/${room.id}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to create room');
    }
  };

  const handleJoinRoom = (roomId: string) => {
    navigate(`/group/${roomId}`);
  };

  const filteredRooms = rooms.filter((room) => {
    const q = search.toLowerCase();
    return (
      room.name.toLowerCase().includes(q) ||
      room.description.toLowerCase().includes(q) ||
      room.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-navy-900">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-display font-bold text-3xl text-white">Group Rooms</h1>
            <p className="text-gray-500 text-sm mt-1">Join a room or create your own — @ai is always ready</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadRooms}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-navy-800 border border-navy-700/50 text-gray-400 hover:text-white hover:border-navy-600 transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white font-medium text-sm hover:shadow-lg hover:shadow-purple-500/20 transition-all active:scale-[0.98]"
            >
              <Plus size={16} /> Create Room
            </button>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rooms by name or tag..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-navy-800 border border-navy-700/50 text-white placeholder-gray-600 focus:border-neon-purple/50 transition-colors"
            />
          </div>
        </motion.div>

        {/* Rooms grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-navy-800 animate-pulse border border-navy-700/30" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg font-display">
              {search ? 'No rooms match your search' : 'No rooms yet — be the first to create one!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRooms.map((room, i) => (
              <RoomCard
                key={room.id}
                id={room.id}
                name={room.name}
                description={room.description}
                tags={room.tags}
                messageCount={room.messageCount}
                onJoin={handleJoinRoom}
                index={i}
              />
            ))}
          </div>
        )}
      </main>

      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoom}
      />
    </div>
  );
}
