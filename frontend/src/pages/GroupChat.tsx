import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Copy, Crown, Globe, Hash, KeyRound, Lock, Pin, BarChart3, Shield, Paperclip, Loader2, UserRoundCheck, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import UserList from '../components/UserList';
import PinnedMessages from '../components/PinnedMessages';
import { CreatePollModal, PollCard } from '../components/PollComponents';
import MemberManagement from '../components/MemberManagement';
import { fetchAvailableModels, type AIModel } from '../api/ai';
import { fetchMembers, type GroupMember } from '../api/groups';
import { useSocket } from '../hooks/useSocket';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { fetchRoomAccess, fetchRoomById, fetchRoomPrivateKey, joinRoomById, uploadFile } from '../api/rooms';
import type { GroupMessage, RoomAccess } from '../api/rooms';
import type { Poll } from '../api/polls';
import { closePoll, fetchPolls, votePoll } from '../api/polls';
import { getModelGroups } from '../utils/aiModels';
import toast from 'react-hot-toast';

interface TypingUser {
  userId: string;
  username: string;
}

const GROUP_MODEL_STORAGE_KEY = 'chatsphere.group.model';

export default function GroupChat() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { socket, joinRoom, leaveRoom, sendMessage, sendFileMessage, replyMessage, addReaction, triggerAi, editMessage, deleteMessage, emitTyping, stopTyping, pinMessage, unpinMessage } = useSocket();
  const { currentRoom, setCurrentRoom, addMessageToCurrentRoom, updateMessageReactions, editMessageInCurrentRoom, deleteMessageInCurrentRoom, updateMessageStatusInCurrentRoom, setMessagePinnedState, onlineUsers, setOnlineUsers, aiThinking, setAiThinking, clearCurrentRoom } = useRoomStore();
  const initialPrivateKey = ((location.state as { privateJoinKey?: string } | null)?.privateJoinKey || '').trim();

  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; username: string; content: string } | null>(null);
  const [showUsers, setShowUsers] = useState(true);
  const [showPinned, setShowPinned] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showMemberPanel, setShowMemberPanel] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [roomAccess, setRoomAccess] = useState<RoomAccess | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [joinKey, setJoinKey] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [creatorPrivateKey, setCreatorPrivateKey] = useState(initialPrivateKey || '');
  const [privateKeyLoading, setPrivateKeyLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [emptyModelMessage, setEmptyModelMessage] = useState('');
  const [roomConnectionError, setRoomConnectionError] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canModerateMessages = currentRoom?.currentUserRole === 'creator'
    || currentRoom?.currentUserRole === 'admin'
    || currentRoom?.currentUserRole === 'moderator';
  const canManageMembers = currentRoom?.currentUserRole === 'creator' || currentRoom?.currentUserRole === 'admin';
  const activeModel = availableModels.find((model) => model.id === selectedModelId) || availableModels[0] || null;
  const groupedModels = getModelGroups(availableModels);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadPolls = useCallback(async () => {
    if (!roomId) return;

    try {
      const nextPolls = await fetchPolls(roomId);
      setPolls(nextPolls);
    } catch {
      setPolls([]);
    }
  }, [roomId]);

  const loadMembers = useCallback(async () => {
    if (!roomId) return;

    setMembersLoading(true);
    try {
      const nextMembers = await fetchMembers(roomId);
      setMembers(nextMembers);
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [roomId]);

  const loadCreatorPrivateKey = useCallback(async (roomVisibility: RoomAccess['visibility'], currentUserRole?: RoomAccess['currentUserRole']) => {
    if (!roomId || roomVisibility !== 'private' || currentUserRole !== 'creator') {
      setCreatorPrivateKey('');
      return;
    }

    setPrivateKeyLoading(true);
    try {
      const { privateJoinKey } = await fetchRoomPrivateKey(roomId);
      setCreatorPrivateKey(privateJoinKey);
    } catch {
      setCreatorPrivateKey((current) => current || '');
    } finally {
      setPrivateKeyLoading(false);
    }
  }, [roomId]);

  const loadMemberRoom = useCallback(async () => {
    if (!roomId) return;

    const room = await fetchRoomById(roomId);
    setCurrentRoom(room);
    setRoomAccess({
      ...room,
      hasAccess: true,
      requiresJoinKey: false,
    });
    void loadCreatorPrivateKey(room.visibility, room.currentUserRole);
  }, [roomId, setCurrentRoom, loadCreatorPrivateKey]);

  useEffect(() => {
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const result = await fetchAvailableModels();
        setAvailableModels(result.models);
        setEmptyModelMessage(result.emptyStateMessage || '');
        const stored = localStorage.getItem(GROUP_MODEL_STORAGE_KEY);
        const autoModelId = result.models.find((model) => model.id === 'auto')?.id || '';
        const nextModelId = result.models.some((model) => model.id === stored)
          ? String(stored)
          : result.defaultModelId || autoModelId || result.models[0]?.id || '';
        setSelectedModelId(nextModelId);
      } catch (error) {
        console.error('Failed to load group AI models', error);
        setAvailableModels([]);
        setSelectedModelId('');
        setEmptyModelMessage('No AI models are configured. Add provider API keys in backend/.env.');
      } finally {
        setLoadingModels(false);
      }
    };

    void loadModels();
  }, []);

  useEffect(() => {
    if (selectedModelId) {
      localStorage.setItem(GROUP_MODEL_STORAGE_KEY, selectedModelId);
    }
  }, [selectedModelId]);

  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    const loadAccess = async () => {
      setRoomLoading(true);
      try {
        const access = await fetchRoomAccess(roomId);
        if (cancelled) return;

        setRoomAccess(access);
        setJoinKey('');

        if (access.hasAccess) {
          await loadMemberRoom();
        } else {
          clearCurrentRoom();
          setMembers([]);
          setPolls([]);
          setOnlineUsers([]);
          setCreatorPrivateKey('');
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string } } };
        toast.error(error.response?.data?.error || 'Unable to open this room');
        navigate('/rooms');
      } finally {
        if (!cancelled) {
          setRoomLoading(false);
        }
      }
    };

    void loadAccess();

    return () => {
      cancelled = true;
      clearCurrentRoom();
      setRoomAccess(null);
      setMembers([]);
      setPolls([]);
      setOnlineUsers([]);
      setCreatorPrivateKey('');
    };
  }, [roomId, clearCurrentRoom, loadMemberRoom, navigate, setOnlineUsers]);

  useEffect(() => {
    if (!currentRoom?.id || currentRoom.id !== roomId) {
      return;
    }

    void loadPolls();
    void loadMembers();
  }, [currentRoom?.id, loadMembers, loadPolls, roomId]);

  const handleCopyInviteLink = useCallback(async () => {
    if (!roomId) return;

    const inviteUrl = `${window.location.origin}/group/${roomId}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied');
    } catch {
      toast.error('Failed to copy invite link');
    }
  }, [roomId]);

  const handleCopyPrivateKey = useCallback(async () => {
    if (!creatorPrivateKey) return;

    try {
      await navigator.clipboard.writeText(creatorPrivateKey);
      toast.success('Private room key copied');
    } catch {
      toast.error('Failed to copy the room key');
    }
  }, [creatorPrivateKey]);

  const handleJoinRoom = useCallback(async () => {
    if (!roomId || !roomAccess || isJoiningRoom) return;

    setIsJoiningRoom(true);
    try {
      await joinRoomById(roomId, roomAccess.visibility === 'private' ? joinKey : undefined);
      await loadMemberRoom();
      toast.success(roomAccess.visibility === 'private' ? 'Private room joined' : 'Room joined');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to join room');
    } finally {
      setIsJoiningRoom(false);
    }
  }, [isJoiningRoom, joinKey, loadMemberRoom, roomAccess, roomId]);

  // Join room via socket
  useEffect(() => {
    if (!roomId || !socket || !currentRoom?.id || currentRoom.id !== roomId) return;

    let cancelled = false;

    const connectToRoom = async () => {
      setRoomConnectionError('');

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await joinRoom(roomId);
        if (response.success) {
          if (!cancelled) {
            setRoomConnectionError('');
          }
          return;
        }

        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        if (!cancelled) {
          const nextError = String(response.error || 'Failed to connect to the room');
          setRoomConnectionError(nextError);
          toast.error(nextError);
        }
      }
    };

    void connectToRoom();

    return () => {
      cancelled = true;
      void leaveRoom(roomId);
    };
  }, [roomId, socket, currentRoom?.id, joinRoom, leaveRoom]);

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

    const handleMessageEdited = ({ messageId, content, editedAt }: { messageId: string; content: string; editedAt: string }) => {
      editMessageInCurrentRoom(messageId, content, editedAt);
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      deleteMessageInCurrentRoom(messageId);
    };

    const handleMessageStatusUpdate = ({ messageId, status }: { messageId: string; status: 'sent' | 'delivered' | 'read' }) => {
      updateMessageStatusInCurrentRoom(messageId, status);
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
      setMessagePinnedState(messageId, true);
      toast.success(`${pinnedBy} pinned a message`, { duration: 2000, icon: '📌' });
    };

    const handleMessageUnpinned = ({ messageId }: { messageId: string }) => {
      setMessagePinnedState(messageId, false);
    };

    socket.on('receive_message', handleMessage);
    socket.on('ai_response', handleAiResponse);
    socket.on('ai_thinking', handleAiThinking);
    socket.on('reaction_update', handleReactionUpdate);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_status_update', handleMessageStatusUpdate);
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
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_status_update', handleMessageStatusUpdate);
      socket.off('room_users', handleRoomUsers);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('message_unpinned', handleMessageUnpinned);
    };
  }, [socket, user?.id, addMessageToCurrentRoom, updateMessageReactions, editMessageInCurrentRoom, deleteMessageInCurrentRoom, updateMessageStatusInCurrentRoom, setMessagePinnedState, setOnlineUsers, setAiThinking]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom();
  }, [currentRoom?.messages.length, aiThinking, scrollToBottom]);

  // Auto-resize textarea (avoid layout jump by never collapsing to 0)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Reset to single-row min height, then expand to content
    el.style.height = '40px';
    el.style.height = Math.max(40, Math.min(el.scrollHeight, 120)) + 'px';
  }, [input]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (roomId && e.target.value.trim()) {
      emitTyping(roomId);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const clearComposer = () => {
    setInput('');
    setReplyTo(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || !roomId || isSending) return;

    const content = input.trim() || (selectedFile ? `@ai Please review the attached file "${selectedFile.name}".` : '');
    const pendingReply = replyTo;
    const pendingFile = selectedFile;
    const aiMentionPattern = /(^|\s)@ai\b/i;
    const shouldTriggerAi = aiMentionPattern.test(content);
    const aiPrompt = shouldTriggerAi ? content.replace(aiMentionPattern, ' ').trim() : '';

    if (shouldTriggerAi && !aiPrompt && !pendingFile) {
      toast.error('Add a prompt after @ai');
      return;
    }

    setIsSending(true);
    try {
      await stopTyping(roomId);
      let uploadedAttachment: Awaited<ReturnType<typeof uploadFile>> | null = null;
      if (pendingFile) {
        uploadedAttachment = await uploadFile(pendingFile);
      }

      let result;
      if (uploadedAttachment) {
        if (pendingReply) {
          toast.error('Replying with file attachments is not supported yet');
          return;
        }
        result = await sendFileMessage(roomId, content, uploadedAttachment);
      } else {
        result = pendingReply
          ? await replyMessage(roomId, content, pendingReply.id)
          : await sendMessage(roomId, content);
      }

      if (!result.success) {
        toast.error(String(result.error || (uploadedAttachment ? 'Failed to send attachment' : 'Failed to send message')));
        return;
      }

      if (shouldTriggerAi) {
        if (!loadingModels && availableModels.length === 0) {
          toast.error(emptyModelMessage || 'No AI models are configured. Add provider API keys in backend/.env to use @ai.');
          clearComposer();
          return;
        }

        const aiResult = await triggerAi(
          roomId,
          aiPrompt || `Review the attached file "${pendingFile?.name || 'attachment'}".`,
          selectedModelId || activeModel?.id,
          uploadedAttachment || undefined
        );

        if (!aiResult.success) {
          toast.error(String(aiResult.error || 'AI request failed'));
        }
      }

      clearComposer();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePinToggle = async (messageId: string) => {
    if (!roomId) return;
    const msg = currentRoom?.messages.find((m) => m.id === messageId);
    if (msg && (msg as GroupMessage & { isPinned?: boolean }).isPinned) {
      const result = await unpinMessage(roomId, messageId);
      if (!result.success) {
        toast.error(String(result.error || 'Failed to unpin message'));
      }
    } else {
      const result = await pinMessage(roomId, messageId);
      if (!result.success) {
        toast.error(String(result.error || 'Failed to pin message'));
      }
    }
  };

  const handleEditMessage = async (messageId: string, nextContent: string) => {
    if (!roomId) return;
    const result = await editMessage(roomId, messageId, nextContent);
    if (!result.success) {
      toast.error(String(result.error || 'Failed to edit message'));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!roomId) return;
    const result = await deleteMessage(roomId, messageId);
    if (!result.success) {
      toast.error(String(result.error || 'Failed to delete message'));
    }
  };

  const handlePollVote = async (pollId: string, optionIndex: number) => {
    try {
      const updated = await votePoll(pollId, optionIndex);
      setPolls((current) => current.map((poll) => (poll.id === pollId ? updated : poll)));
    } catch {
      toast.error('Failed to update vote');
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      const updated = await closePoll(pollId);
      setPolls((current) => current.map((poll) => (poll.id === pollId ? updated : poll)));
      toast.success('Poll closed');
    } catch {
      toast.error('Failed to close poll');
    }
  };

  if (roomLoading) {
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

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-navy-900">
        <Navbar />
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center justify-center px-4 pt-24 pb-12">
          <div className="w-full rounded-3xl border border-navy-700/60 bg-navy-800/80 p-8 shadow-2xl shadow-black/20">
            <Link
              to="/rooms"
              className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <ArrowLeft size={14} />
              Back to rooms
            </Link>

            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${
                    roomAccess?.visibility === 'private'
                      ? 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
                      : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                  }`}>
                    {roomAccess?.visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                    {roomAccess?.visibility === 'private' ? 'Private room' : 'Public room'}
                  </div>
                </div>
                <h1 className="truncate font-display text-2xl font-semibold text-white">
                  {roomAccess?.name || 'Room access'}
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                  {roomAccess?.description || 'Join this room to start chatting with the group.'}
                </p>
              </div>
              <div className="rounded-2xl bg-navy-900/70 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Members</p>
                <p className="mt-1 text-lg font-semibold text-white">{roomAccess?.memberCount || 0}</p>
              </div>
            </div>

            {roomAccess?.tags?.length ? (
              <div className="mb-5 flex flex-wrap gap-2">
                {roomAccess.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-navy-600/60 bg-navy-900/60 px-3 py-1 text-[11px] text-gray-300">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="rounded-2xl border border-navy-700/60 bg-navy-900/50 p-5">
              {roomAccess?.visibility === 'private' ? (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                      <KeyRound size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">Room key required</h2>
                      <p className="text-xs text-gray-500">Ask the room creator for the private join key, then enter it here.</p>
                    </div>
                  </div>
                  <input
                    value={joinKey}
                    onChange={(event) => setJoinKey(event.target.value.toUpperCase())}
                    placeholder="Enter private room key"
                    className="mb-3 w-full rounded-xl border border-navy-600/60 bg-navy-950/60 px-4 py-3 text-sm uppercase tracking-[0.15em] text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-400/40"
                  />
                </>
              ) : (
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-white">Join this public room</h2>
                  <p className="mt-1 text-xs text-gray-500">Public rooms can be joined right away and show messages as soon as you enter.</p>
                </div>
              )}

              <button
                onClick={() => void handleJoinRoom()}
                disabled={isJoiningRoom || (roomAccess?.visibility === 'private' && !joinKey.trim())}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
              >
                {isJoiningRoom ? <Loader2 size={16} className="animate-spin" /> : roomAccess?.visibility === 'private' ? <KeyRound size={16} /> : <Hash size={16} />}
                {roomAccess?.visibility === 'private' ? 'Join with key' : 'Join room'}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-navy-900 overflow-hidden">
      <Navbar />

      <div className="flex h-[calc(100vh-4rem)] mt-16 overflow-hidden">
        {/* Left panel — room info */}
        <div className="hidden lg:flex w-64 flex-col border-r border-navy-700/50 bg-navy-800 overflow-y-auto">
          <div className="p-4 border-b border-navy-700/50">
            <Link
              to="/rooms"
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors mb-4"
            >
              <ArrowLeft size={14} /> All Rooms
            </Link>
            <div className={`mb-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${
              currentRoom.visibility === 'private'
                ? 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
                : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
            }`}>
              {currentRoom.visibility === 'private' ? <Lock size={10} /> : <Globe size={10} />}
              {currentRoom.visibility === 'private' ? 'Private room' : 'Public room'}
            </div>
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

          {/* Polls button */}
          <button
            onClick={() => setShowPollModal(true)}
            className="mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-navy-700 transition-all"
          >
            <BarChart3 size={14} />
            <span>Create Poll</span>
          </button>

          {/* Members button */}
          <button
            onClick={() => setShowMemberPanel(true)}
            className="mx-4 mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-navy-700 transition-all"
          >
            <Shield size={14} />
            <span>{canManageMembers ? 'Manage Members' : 'View Members'}</span>
          </button>

          {canManageMembers ? (
            <button
              onClick={() => void handleCopyInviteLink()}
              className="mx-4 mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-navy-700 transition-all"
            >
              <Copy size={14} />
              <span>Copy Room Link</span>
            </button>
          ) : null}

          {currentRoom.visibility === 'private' && currentRoom.currentUserRole === 'creator' ? (
            <div className="mx-4 mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-semibold text-white">Private Room Key</h3>
                  <p className="text-[11px] text-gray-500">Share this key with members who should join.</p>
                </div>
                <KeyRound size={16} className="text-amber-300" />
              </div>
              <div className="rounded-xl border border-navy-700/60 bg-navy-900/70 px-3 py-2">
                <p className="font-mono text-sm tracking-[0.18em] text-amber-200">
                  {privateKeyLoading ? 'LOADING...' : creatorPrivateKey || 'Unavailable'}
                </p>
              </div>
              <button
                onClick={() => void handleCopyPrivateKey()}
                disabled={!creatorPrivateKey}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
              >
                <Copy size={13} />
                Copy Private Key
              </button>
            </div>
          ) : null}

          <div className="mx-4 mt-4 rounded-2xl border border-navy-700/50 bg-navy-900/35 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-white">Room Members</h3>
                <p className="text-[11px] text-gray-500">
                  {membersLoading ? 'Loading roster...' : `${members.length} members in this room`}
                </p>
              </div>
              <UserRoundCheck size={16} className="text-neon-blue" />
            </div>
            <div className="space-y-2">
              {membersLoading ? (
                [1, 2, 3].map((item) => (
                  <div key={item} className="h-10 rounded-xl bg-navy-800/60 animate-pulse" />
                ))
              ) : members.length === 0 ? (
                <p className="text-xs text-gray-500">Members will appear here once the room roster loads.</p>
              ) : (
                members.slice(0, 6).map((member) => (
                  <div key={member.userId} className="flex items-center justify-between gap-3 rounded-xl border border-navy-800/50 bg-navy-800/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{member.displayName}</p>
                      <p className="truncate text-[10px] text-gray-500">@{member.username}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      {member.isCreator ? <Crown size={12} className="text-amber-400" /> : null}
                      <span className={`rounded-full px-2 py-0.5 capitalize ${
                        member.isCreator
                          ? 'bg-amber-500/10 text-amber-300'
                          : member.role === 'admin'
                            ? 'bg-neon-blue/10 text-neon-blue'
                            : member.role === 'moderator'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : 'bg-navy-700 text-gray-400'
                      }`}>
                        {member.isCreator ? 'owner' : member.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            {!membersLoading && members.length > 6 ? (
              <button
                onClick={() => setShowMemberPanel(true)}
                className="mt-3 text-xs text-neon-purple hover:text-purple-300 transition-colors"
              >
                View all {members.length} members →
              </button>
            ) : null}
          </div>

          <div className="flex-1" />
          <div className="p-3 border-t border-navy-700/50">
            <p className="text-[10px] text-gray-600 text-center">
              Type <span className="text-neon-purple font-mono">@ai</span> to summon {activeModel?.label || 'the room AI'}
            </p>
          </div>
        </div>

        {/* Center panel — chat */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" role="main">
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

          {(roomConnectionError || (!loadingModels && availableModels.length === 0)) && (
            <div className="border-b border-navy-800/50 bg-navy-800/80 px-4 py-2 text-xs text-amber-300 flex-shrink-0">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                <span className="min-w-0 truncate">
                  {roomConnectionError || emptyModelMessage || 'No AI models are configured. Add provider API keys in backend/.env.'}
                </span>
                {roomConnectionError ? (
                  <button
                    onClick={() => {
                      setRoomConnectionError('');
                      void joinRoom(roomId || '').then((response) => {
                        if (!response.success) {
                          setRoomConnectionError(String(response.error || 'Failed to connect to the room'));
                        }
                      });
                    }}
                    className="rounded-lg border border-amber-400/30 px-2 py-1 text-[11px] font-medium text-amber-200 transition-colors hover:bg-amber-400/10"
                    type="button"
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-2 py-4 min-h-0" role="log" aria-live="polite">
            <div className="max-w-3xl mx-auto space-y-1">
              {polls.length > 0 && (
                <div className="mb-4 space-y-3">
                  {polls.map((poll) => (
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      currentUserId={user?.id || ''}
                      onVote={handlePollVote}
                      onClose={handleClosePoll}
                    />
                  ))}
                </div>
              )}
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
                  isEdited={msg.isEdited}
                  fileUrl={msg.fileUrl}
                  fileName={msg.fileName}
                  fileType={msg.fileType}
                  fileSize={msg.fileSize}
                  onReply={() => setReplyTo({ id: msg.id, username: msg.username, content: msg.content })}
                  onReaction={(emoji) => {
                    if (!roomId) return;
                    void addReaction(roomId, msg.id, emoji).then((result) => {
                      if (!result.success) {
                        toast.error(String(result.error || 'Failed to update reaction'));
                      }
                    });
                  }}
                  onPin={handlePinToggle}
                  onEdit={(nextContent) => void handleEditMessage(msg.id, nextContent)}
                  onDelete={() => void handleDeleteMessage(msg.id)}
                  canEdit={msg.userId === user?.id && !msg.isDeleted}
                  canDelete={(msg.userId === user?.id || canModerateMessages) && !msg.isDeleted}
                  index={i}
                  modelId={msg.modelId}
                  provider={msg.provider}
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
                className="border-t border-navy-800/50 px-4 py-2 bg-navy-800/50 flex-shrink-0"
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

          {/* Input area — pinned to bottom */}
          <div className="border-t border-navy-800/50 px-4 py-3 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              {selectedFile && (
                <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-navy-700/50 bg-navy-800/60 px-3 py-2 text-xs text-gray-300">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{selectedFile.name}</p>
                    <p className="text-gray-500">
                      {selectedFile.type || 'Unknown type'} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 text-gray-500 hover:text-white transition-colors"
                    aria-label="Remove attachment"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-500">
                <div className="truncate">
                  {loadingModels
                    ? 'Loading room AI models...'
                    : activeModel
                      ? `Room AI: ${activeModel.label} via ${activeModel.provider}`
                      : (emptyModelMessage || 'No AI models are configured.')}
                </div>
                <div className="hidden sm:block">
                  {availableModels.length > 0 ? `${availableModels.length} live models` : 'No live models'}
                </div>
                <select
                  value={selectedModelId}
                  onChange={(event) => setSelectedModelId(event.target.value)}
                  disabled={loadingModels || availableModels.length === 0}
                  className="rounded-lg border border-navy-700/50 bg-navy-800 px-2.5 py-1 text-[11px] text-gray-300 focus:outline-none"
                >
                  {availableModels.length === 0 ? (
                    <option value="">No AI models configured</option>
                  ) : null}
                {groupedModels.map((group) => (
                  <optgroup key={group.provider} label={`${group.label} (${group.models.length})`}>
                    {group.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
                </select>
              </div>
              <div className="flex items-end gap-3 bg-navy-800 rounded-2xl border border-navy-700/50 p-3 focus-within:border-neon-purple/30 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,application/xml,text/javascript,application/javascript,text/x-typescript,application/x-typescript"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-navy-700 transition-all flex-shrink-0"
                  aria-label="Attach file"
                >
                  <Paperclip size={16} />
                </button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message #room, attach a file, or type @ai for AI..."
                  rows={1}
                  className="flex-1 bg-transparent text-white placeholder-gray-600 resize-none text-sm focus:outline-none max-h-32 min-h-[2.5rem]"
                  aria-label="Message input"
                />
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedFile) || isSending}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-neon-purple to-neon-blue text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex-shrink-0"
                  aria-label="Send message"
                >
                  {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
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

      {/* Poll create modal */}
      <AnimatePresence>
        {showPollModal && roomId && (
          <CreatePollModal
            roomId={roomId}
            onCreated={(poll) => {
              setPolls((current) => [poll, ...current]);
            }}
            onClose={() => setShowPollModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Member management modal */}
      <AnimatePresence>
        {showMemberPanel && roomId && user && (
          <MemberManagement
            roomId={roomId}
            currentUserId={user.id}
            isCreator={currentRoom.creatorId === user.id}
            onClose={() => setShowMemberPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
