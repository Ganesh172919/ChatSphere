import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, ShieldCheck, Crown, UserMinus, ChevronDown } from 'lucide-react';
import { fetchMembers, updateMemberRole, kickMember } from '../api/groups';
import type { GroupMember } from '../api/groups';
import toast from 'react-hot-toast';

const ROLE_ICONS: Record<string, typeof Shield> = {
  admin: ShieldCheck,
  moderator: Shield,
  member: Shield,
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-amber-400',
  moderator: 'text-blue-400',
  member: 'text-gray-500',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  moderator: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  member: 'bg-navy-700 text-gray-400 border-navy-600/30',
};

interface Props {
  roomId: string;
  currentUserId: string;
  isCreator: boolean;
  onClose: () => void;
}

export default function MemberManagement({ roomId, currentUserId, isCreator, onClose }: Props) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, [roomId]);

  const loadMembers = async () => {
    try {
      const data = await fetchMembers(roomId);
      setMembers(data);
    } catch {
      toast.error('Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'moderator' | 'member') => {
    try {
      await updateMemberRole(roomId, userId, role);
      setMembers(prev => prev.map(m =>
        m.userId === userId ? { ...m, role } : m
      ));
      setActiveDropdown(null);
      toast.success(`Role updated to ${role}`);
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleKick = async (userId: string, username: string) => {
    if (!confirm(`Remove ${username} from this room?`)) return;
    try {
      await kickMember(roomId, userId);
      setMembers(prev => prev.filter(m => m.userId !== userId));
      toast.success(`${username} removed`);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  // Current user's role
  const currentMember = members.find(m => m.userId === currentUserId);
  const canManage = isCreator || currentMember?.role === 'admin';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-navy-800 rounded-2xl border border-navy-700/50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-white">Members</h2>
              <p className="text-[10px] text-gray-500">{members.length} members</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Member list */}
        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto space-y-1">
          {isLoading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 rounded-xl bg-navy-900/50 animate-pulse" />
            ))
          ) : (
            members.map((member) => {
              const RoleIcon = ROLE_ICONS[member.role] || Shield;
              const isSelf = member.userId === currentUserId;
              const canEditThisMember = canManage && !member.isCreator && !isSelf;

              return (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-navy-900/50 transition-colors relative"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {member.avatar ? (
                      <img src={member.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center text-white text-sm font-bold">
                        {member.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-navy-800 ${
                      member.onlineStatus === 'online' ? 'bg-green-500' :
                      member.onlineStatus === 'away' ? 'bg-amber-500' : 'bg-gray-600'
                    }`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {member.displayName}
                      </span>
                      {member.isCreator && (
                        <Crown size={12} className="text-amber-400 flex-shrink-0" />
                      )}
                      {isSelf && (
                        <span className="text-[9px] text-gray-600">(you)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RoleIcon size={10} className={ROLE_COLORS[member.role]} />
                      <span className={`text-[10px] capitalize ${ROLE_COLORS[member.role]}`}>
                        {member.isCreator ? 'Owner' : member.role}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {canEditThisMember && (
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setActiveDropdown(
                          activeDropdown === member.userId ? null : member.userId
                        )}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-all"
                      >
                        <ChevronDown size={14} />
                      </button>

                      <AnimatePresence>
                        {activeDropdown === member.userId && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute right-0 top-full mt-1 w-40 py-1 rounded-lg bg-navy-900 border border-navy-700/50 shadow-xl z-10"
                          >
                            {['admin', 'moderator', 'member'].map((role) => (
                              <button
                                key={role}
                                onClick={() => handleRoleChange(member.userId, role as 'admin' | 'moderator' | 'member')}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-navy-800 transition-colors ${
                                  member.role === role ? 'text-neon-purple' : 'text-gray-400'
                                }`}
                              >
                                <span className={`px-1.5 py-0.5 rounded text-[9px] border ${ROLE_BADGE_STYLES[role]}`}>
                                  {role}
                                </span>
                                {member.role === role && <span className="ml-auto text-neon-purple">✓</span>}
                              </button>
                            ))}
                            <div className="border-t border-navy-700/50 my-1" />
                            <button
                              onClick={() => handleKick(member.userId, member.username)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-navy-800 transition-colors"
                            >
                              <UserMinus size={12} />
                              Remove
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Role legend */}
        <div className="px-6 py-3 border-t border-navy-700/30">
          <div className="flex items-center gap-4 text-[10px] text-gray-600">
            <span className="flex items-center gap-1"><Crown size={10} className="text-amber-400" /> Owner</span>
            <span className="flex items-center gap-1"><ShieldCheck size={10} className="text-amber-400" /> Admin</span>
            <span className="flex items-center gap-1"><Shield size={10} className="text-blue-400" /> Mod</span>
            <span className="flex items-center gap-1"><Shield size={10} className="text-gray-500" /> Member</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
