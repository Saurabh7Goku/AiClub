'use client';

import { useAuth } from '@/context/AuthContext';
import IntegrationSettings from '@/components/admin/IntegrationSettings';
import Link from 'next/link';

export default function IntegrationsPage() {
    const { isAdmin, isLeader } = useAuth();

    if (!isAdmin && !isLeader) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-elevator-in">
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 text-center space-y-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <h1 className="text-2xl font-extrabold text-white uppercase tracking-tight">Access Denied</h1>
                    <p className="text-gray-400 text-sm font-medium">Only admins and leaders can manage integrations.</p>
                    <Link href="/dashboard" className="text-accent-500 font-bold text-xs uppercase tracking-widest hover:text-accent-400 transition-colors">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-10 pb-20 animate-elevator-in">
            <div className="flex flex-col gap-6 pb-6 border-b border-white/10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent-500">Admin</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase leading-none">
                        <span className="text-accent-500">Integrations</span>
                    </h1>
                    <p className="text-gray-400 font-medium text-sm mt-3">
                        Configure Teams and Slack webhook integrations for automated notifications.
                    </p>
                </div>
            </div>

            <IntegrationSettings />
        </div>
    );
}
