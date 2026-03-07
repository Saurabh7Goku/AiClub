'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClub } from '@/context/ClubContext';
import { getClubUsers, updateUserRole } from '@/lib/firebase/firestore';
import { User } from '@/types';

export default function UserManagementPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const { currentClub } = useClub();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin || !currentClub) {
      setLoading(false);
      return;
    }

    const loadUsers = async () => {
      try {
        const clubUsers = await getClubUsers(currentClub.id);
        setUsers(clubUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isAdmin, currentClub]);

  const handleRoleChange = async (userId: string, newRole: 'member' | 'leader' | 'admin') => {
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update user role');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="bg-black/40 backdrop-blur-xl border border-rose-500/20 rounded-[2.5rem] p-16 text-center space-y-6 shadow-[0_0_50px_rgba(225,29,72,0.1)] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-8 relative z-10 shadow-[0_0_30px_rgba(225,29,72,0.2)]">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-4xl font-extrabold text-white uppercase tracking-tight relative z-10">Access <span className="text-rose-500 drop-shadow-[0_0_15px_rgba(225,29,72,0.5)]">Denied</span></h1>
          <p className="text-gray-400 text-sm font-medium max-w-sm mx-auto relative z-10 leading-relaxed">Only personnel with level-A clearance (administrators) can access the command center.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-1 relative">
          <div className="absolute -top-4 -left-4 w-32 h-32 bg-accent-500/10 blur-[50px] rounded-full pointer-events-none" />

          <div className="flex items-center gap-2 mb-2 relative z-10">
            <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-500">
              Nexus: {currentClub?.name || 'Club'}
            </p>
          </div>

          <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase leading-none relative z-10">
            Command <span className="text-accent-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">Center</span>
          </h1>
          <p className="text-gray-400 font-medium text-sm relative z-10 mt-2">Manage personnel permissions and access levels.</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-32 flex flex-col items-center justify-center gap-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-white/10 border-t-accent-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🛡️</div>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent-500 animate-pulse">Decrypting Personnel Data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-elevator-in">
          {users.map((user) => (
            <div key={user.uid} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between group hover:border-accent-500/30 transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] relative overflow-hidden h-full min-h-[220px]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-accent-500/10 transition-colors" />

              <div className="space-y-4 relative z-10 flex-1">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 min-w-0 pr-4">
                    <h3 className="text-xl font-extrabold text-white truncate group-hover:text-accent-400 transition-colors">
                      {user.displayName}
                    </h3>
                    <p className="text-xs font-medium text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0
                    ${user.role === 'admin' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                      user.role === 'leader' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                        'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-rose-500' : user.role === 'leader' ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">{user.role || 'Member'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 relative z-10">
                {user.uid !== currentUser?.uid ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleRoleChange(user.uid, 'member')}
                      className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${user.role === 'member'
                          ? 'bg-white/10 text-white border border-white/20 shadow-inner'
                          : 'bg-transparent border border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'
                        }`}
                    >
                      Member
                    </button>
                    <button
                      onClick={() => handleRoleChange(user.uid, 'leader')}
                      className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${user.role === 'leader'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-inner'
                          : 'bg-transparent border border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'
                        }`}
                    >
                      Leader
                    </button>
                    <button
                      onClick={() => handleRoleChange(user.uid, 'admin')}
                      className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${user.role === 'admin'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-inner'
                          : 'bg-transparent border border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'
                        }`}
                      disabled={user.role === 'admin'}
                    >
                      Admin
                    </button>
                  </div>
                ) : (
                  <div className="py-2 px-4 rounded-xl border border-dashed border-white/10 bg-white/5 text-center flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                      Cannot modify own clearance level
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
