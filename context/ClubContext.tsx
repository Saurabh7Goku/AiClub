'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Club } from '@/types';
import { getUserClubs, getClub as fetchClubData } from '@/lib/firebase/firestore';

interface ClubContextType {
    currentClub: Club | null;
    clubs: Club[];
    loading: boolean;
    selectClub: (clubId: string) => void;
    refreshClubs: () => Promise<void>;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export function ClubProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [currentClub, setCurrentClub] = useState<Club | null>(null);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshClubs = async () => {
        if (!user) {
            setClubs([]);
            setCurrentClub(null);
            setLoading(false);
            return;
        }

        try {
            const userClubs = await getUserClubs(user.uid);
            setClubs(userClubs);

            // Restore selected club from local storage
            const storedClubId = localStorage.getItem('active_club_id');
            if (storedClubId) {
                const found = userClubs.find(c => c.id === storedClubId);
                if (found) {
                    setCurrentClub(found);
                } else if (userClubs.length > 0) {
                    setCurrentClub(userClubs[0]);
                }
            } else if (userClubs.length > 0) {
                setCurrentClub(userClubs[0]);
            }
        } catch (err) {
            console.error('Error refreshing clubs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshClubs();
    }, [user]);

    const selectClub = (clubId: string) => {
        const club = clubs.find(c => c.id === clubId);
        if (club) {
            setCurrentClub(club);
            localStorage.setItem('active_club_id', clubId);
        }
    };

    return (
        <ClubContext.Provider value={{ currentClub, clubs, loading, selectClub, refreshClubs }}>
            {children}
        </ClubContext.Provider>
    );
}

export function useClub() {
    const context = useContext(ClubContext);
    if (context === undefined) {
        throw new Error('useClub must be used within a ClubProvider');
    }
    return context;
}
