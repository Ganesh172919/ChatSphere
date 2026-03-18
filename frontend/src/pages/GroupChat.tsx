import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Hash, X, Pin } from 'lucide-react';
import Navbar from '../components/Navbar';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import UserList from '../components/UserList';
import PinnedMessages from '../components/PinnedMessages';
import { useSocket } from '../hooks/useSocket';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { fetchRoomById } from '../api/rooms';
import type { GroupMessage } from '../api/rooms';
import toast from 'react-hot-toast';

interface TypingUser {
  userId: string;
  username: string;
}

export default function GroupChat() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket, joinRoom, leaveRoom, sendMessage, replyMessage, addReaction, triggerAi, emitTyping, stopTyping, pinMessage, unpinMessage } = useSocket();
  const { currentRoom, setCurrentRoom, addMessageToCurrentRoom, updateMessageReactions, onlineUsers, setOnlineUsers, aiThinking, setAiThinking, clearCurrentRoom } = useRoomStore();

  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; username: string; content: string } | null>(null);
  const [showUsers, setShowUsers] = useState(true);
  const [showPinned, setShowPinned] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load room data
  useEffect(() => {
    if (!roomId) return;

    const loadRoom = async () => {
      try {
        const room = await fetchRoomById(roomId);
        setCurrentRoom(room);
      } catch {
        toast.error('Room not found');
        navigate('/rooms');
      }
    };

    loadRoom();
    return () => {
      clearCurrentRoom();
    };
  }, [roomId, setCurrentRoom, clearCurrentRoom, navigate]);

  // Join room via socket
  useEffect(() => {
    if (!roomId || !socket) return;

    joinRoom(roomId);

    return () => {
      leaveRoom(roomId);
    };
  }, [roomId, socket, joinRoom, leaveRoom]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message: GroupMessage) => {
      addMessageToCurrentRoom(message);
    };

    const handleAiResponse = (message: GroupMessage) => {
      addMessageToCurrentRoom(message);
    };

    const handleAiThinking = ({ status }: { status: boolean }) => {
      setAiThinking(status);
    };

    const handleReactionUpdate = ({ messageId, reactions }: { messageId: string; reactions: Record<string, string[]> }) => {
      updateMessageReactions(messageId, reactions);
    };

    const handleRoomUsers = (users: Array<{ id: string; username: string }>) => {
      setOnlineUsers(users);
    };

    const handleUserJoined = ({ username }: { username: string }) => {
      toast.success(`${username} joined the room`, { duration: 2000, icon: '👋' });
    };

    const handleUserLeft = ({ username }: { username: string }) => {
      toast(`${username} left the room`, { duration: 2000, icon: '🚪' });
    };

    // Typing indicators
    const handleTypingStart = ({ userId, username }: TypingUser) => {
      if (userId === user?.id) return; // Don't show own typing
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === userId)) return prev;
        return [...prev, { userId, username }];
      });
    };

    const handleTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    // Pinned messages
    const handleMessagePinned = ({ messageId, pinnedBy }: { messageId: string; pinnedBy: string }) => {
      toast.success(`${pinnedBy} pinned a message`, { duration: 2000, icon: '📌' });
    };

    const handleMessageUnpinned = () => {
      // Refresh is handled automatically
    };

    socket.on('receive_message', handleMessage);
    socket.on('ai_response', handleAiResponse);
    socket.on('ai_thinking', handleAiThinking);
    socket.on('reaction_update', handleReactionUpdate);
    socket.on('room_users', handleRoomUsers);
    socket.on('user_joined', handleUserJoined);
    socket.on('user_left', handleUserLeft);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('message_unpinned', handleMessageUnpinned);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('ai_response', handleAiResponse);
      socket.off('ai_thinking', handleAiThinking);
      socket.off('reaction_update', handleReactionUpdate);
      socket.off('room_users', handleRoomUsers);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('message_unpinned', handleMessageUnpinned);
    };
  }, [socket, user?.id, addMessageToCurrentRoom, updateMessageReactions, setOnlineUsers, setAiThinking]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom();
  }, [currentRoom?.messages.length, aiThinking, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (roomId && e.target.value.trim()) {
      emitTyping(roomId);
    }
  };

  const handleSend = () => {
    if (!input.trim() || !roomId) return;

    const content = input.trim();
    setInput('');
    setReplyTo(null);
    stopTyping(roomId);

    // Check for @ai trigger
    if (content.toLowerCase().startsWith('@ai ')) {
      const prompt = content.slice(4).trim();
      if (prompt) {
        triggerAi(roomId, prompt);
        sendMessage(roomId, content);
        return;
      }
    }

    if (replyTo) {
      replyMessage(roomId, content, replyTo.id);
    } else {
      sendMessage(roomId, content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePinToggle = (messageId: string) => {
    if (!roomId) return;
    const msg = currentRoom?.messages.find((m) => m.id === messageId);
    if (msg && (msg as GroupMessage & { isPinned?: boolean }).isPinned) {
      unpinMessage(roomId, messageId);
    } else {
      pinMessage(roomId, messageId);
    }
  };

  if (!currentRoom) {
    return (
      <div className="h-screen flex flex-col bg-navy-900">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-navy-800 animate-pulse mx-auto mb-4" />
            <p className="text-gray-500">Loading room...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-navy-900">
      <Navbar />

      <div className="flex flex-1 pt-16 overflow-hidden">
        {/* Left panel — room info */}
        <div className="hidden lg:flex w-64 flex-col border-r border-navy-700/50 bg-navy-800">
          <div className="p-4 border-b border-navy-700/50">
            <Link
              to="/rooms"
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors mb-4"
            >
              <ArrowLeft size={14} /> All Rooms
            </Link>
            <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <Hash size={16} className="text-neon-purple" />
              {currentRoom.name}
            </h2>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{currentRoom.description}</p>
          </div>
          {currentRoom.tags.length > 0 && (
            <div className="px-4 py-3 border-b border-navy-700/50 flex flex-wrap gap-1">
              {currentRoom.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-navy-700 text-gray-400 border border-navy-600/50">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Pinned messages toggle */}
          <button
            onClick={() => setShowPinned(!showPinned)}
            className={`mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              showPinned
                ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/30'
                : 'text-gray-400 hover:text-white hover:bg-navy-700'
            }`}
          >
            <Pin size={14} />
            <span>Pinned Messages</span>
          </button>

          <div className="flex-1" />
          <div className="p-3 border-t border-navy-700/50">
            <p className="text-[10px] text-gray-600 text-center">
              Type <span className="text-neon-purple font-mono">@ai</span> to summon the reasoning engine
            </p>
          </div>
        </div>

        {/* Center panel — chat */}
        <main className="flex-1 flex flex-col min-w-0" role="main">
          {/* Room header (mobile) */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-navy-800/50 lg:hidden">
            <Link to="/rooms" className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-navy-800 transition-all" aria-label="Back to rooms">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-white truncate">{currentRoom.name}</h2>
              <p className="text-[10px] text-gray-500">{onlineUsers.length} online</p>
            </div>
            <button
              onClick={() => setShowPinned(!showPinned)}
              className={`p-2 rounded-lg transition-all ${showPinned ? 'text-neon-purple bg-neon-purple/10' : 'text-gray-400 hover:text-white hover:bg-navy-800'}`}
              aria-label="Toggle pinned messages"
            >
              <Pin size={16} />
            </button>
            <button
              onClick={() => setShowUsers(!showUsers)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-navy-800 transition-all"
              aria-label="Toggle user list"
            >
              {onlineUsers.length} 👤
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-2 py-4" role="log" aria-live="polite">
            <div className="max-w-3xl mx-auto space-y-1">
              {currentRoom.messages.length === 0 && (
                <div className="text-center py-20">
                  <Hash size={32} className="text-navy-600 mx-auto mb-3" />
                  <p className="text-gray-500 font-display font-medium">Welcome to #{currentRoom.name}</p>
                  <p className="text-gray-600 text-sm mt-1">Start the conversation — type @ai to summon the reasoning engine</p>
                </div>
              )}
              {currentRoom.messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  id={msg.id}
                  role={msg.isAI ? 'ai' : 'group-user'}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  username={msg.username}
                  userId={msg.userId}
                  currentUserId={user?.id}
                  isAI={msg.isAI}
                  triggeredBy={msg.triggeredBy}
                  reactions={msg.reactions}
                  replyTo={msg.replyTo}
                  showReactions
                  status={(msg as GroupMessage & { status?: 'sent' | 'delivered' | 'read' }).status}
                  isPinned={(msg as GroupMessage & { isPinned?: boolean }).isPinned}
                  onReply={() => setReplyTo({ id: msg.id, username: msg.username, content: msg.content })}
                  onReaction={(emoji) => roomId && addReaction(roomId, msg.id, emoji)}
                  onPin={handlePinToggle}
                  index={i}
                />
              ))}
              <AnimatePresence>
                {aiThinking && <TypingIndicator />}
              </AnimatePresence>

              {/* User typing indicators */}
              <AnimatePresence>
                {typingUsers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 py-1"
                  >
                    <p className="text-xs text-gray-500 italic">
                      {typingUsers.map((u) => u.username).join(', ')}{' '}
                      {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Reply indicator */}
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-navy-800/50 px-4 py-2 bg-navy-800/50"
              >
                <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Replying to</span>
                  <span className="text-neon-purple font-medium">{replyTo.username}</span>
                  <span className="text-gray-600 truncate flex-1">{replyTo.content}</span>
                  <button onClick={() => setReplyTo(null)} className="p-1 text-gray-500 hover:text-white" aria-label="Cancel reply">
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input area */}
          <div className="border-t border-navy-800/50 px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-3 bg-navy-800 rounded-2xl border border-navy-700/50 p-3 focus-within:border-neon-purple/30 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message #room or @ai for AI response..."
                  rows={1}
                  className="flex-1 bg-transparent text-white placeholder-gray-600 resize-none text-sm focus:outline-none max-h-32"
                  aria-label="Message input"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex-shrink-0"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Right panel — pinned messages or online users */}
        {showPinned && roomId ? (
          <PinnedMessages
            roomId={roomId}
            isOpen={showPinned}
            onClose={() => setShowPinned(false)}
            onUnpin={(messageId) => roomId && unpinMessage(roomId, messageId)}
          />
        ) : showUsers ? (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            className="hidden lg:block border-l border-navy-700/50 bg-navy-800 overflow-hidden"
          >
            <UserList users={onlineUsers} creatorId={currentRoom.creatorId} />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
