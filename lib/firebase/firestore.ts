import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  addDoc,
  increment,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './client';
import { Idea, IdeaFirestore, IdeaInput, Vote, VoteFirestore, VoteType, TechFeedItem, TechFeedItemFirestore, Meeting, MeetingFirestore, AIDraft, AIDraftFirestore, User, UserFirestore, IdeaStatus, IdeaCategory, Club, ClubFirestore, Comment, CommentFirestore, MeetingRoom, MeetingRoomId, MeetingSession, MeetingSessionFirestore, MeetingJoinRequest, MeetingPresence, MeetingBoard, MeetingBoardFirestore, MeetingOutput, Channel, ChannelFirestore, ChatMessage, ChatMessageFirestore, ChannelType, MessageType, MessageAttachment, PollData, Project, ProjectFirestore, Task, TaskFirestore, Milestone, MilestoneFirestore, ProjectStatus, TaskStatus, TaskPriority, Notification, NotificationFirestore, NotificationType, CanvasPath, ProjectCanvas, ProjectCanvasFirestore, MeetingCanvas, MeetingCanvasFirestore, WikiVersion, WikiVersionFirestore, IntegrationSettings, IntegrationSettingsFirestore, IntegrationNotificationConfig, CalendarIntegration, CalendarIntegrationFirestore, CalendarProvider } from '@/types';

// Helper to convert Firestore timestamps
const convertTimestamp = (timestamp: Timestamp | { seconds: number; nanoseconds: number } | undefined): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return new Date(timestamp.seconds * 1000);
};

// ==================== USERS ====================

export const getUser = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return null;

  const data = userSnap.data() as UserFirestore;
  return {
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    lastActive: convertTimestamp(data.lastActive),
  };
};

export const updateUser = async (uid: string, data: Partial<User>): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    lastActive: serverTimestamp(),
  });
};

export const updateUserRole = async (uid: string, role: 'member' | 'leader' | 'admin'): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { role });
};

export const getMembers = async (clubId: string): Promise<User[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('joinedClubs', 'array-contains', clubId), orderBy('displayName', 'asc'));
  const snap = await getDocs(q);

  return snap.docs.map(doc => {
    const data = doc.data() as UserFirestore;
    return {
      ...data,
      uid: doc.id,
      createdAt: convertTimestamp(data.createdAt),
      lastActive: convertTimestamp(data.lastActive),
    };
  });
};

// ==================== CLUBS ====================

export const createClub = async (
  adminId: string,
  name: string,
  description: string,
  joinKey: string
): Promise<Club> => {
  const clubsRef = collection(db, 'clubs');

  // Check if join key is unique (simplified)
  const q = query(clubsRef, where('joinKey', '==', joinKey));
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error('Join key already in use');

  const clubData = {
    name,
    description,
    joinKey,
    adminId,
    createdAt: serverTimestamp(),
    memberCount: 1
  };

  const docRef = await addDoc(clubsRef, clubData);

  // Add club to admin's joinedClubs
  const userRef = doc(db, 'users', adminId);
  await updateDoc(userRef, {
    joinedClubs: arrayUnion(docRef.id)
  });

  return {
    id: docRef.id,
    name,
    description,
    joinKey,
    adminId,
    createdAt: new Date(),
    memberCount: 1
  };
};

export const joinClub = async (uid: string, joinKey: string): Promise<Club> => {
  const clubsRef = collection(db, 'clubs');
  const q = query(clubsRef, where('joinKey', '==', joinKey));
  const snap = await getDocs(q);

  if (snap.empty) throw new Error('Invalid join key');

  const clubDoc = snap.docs[0];
  const clubId = clubDoc.id;

  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) throw new Error('User not found');

  const userData = userDoc.data() as UserFirestore;
  const joinedClubs = userData.joinedClubs || [];

  if (joinedClubs.includes(clubId)) throw new Error('Already a member of this club');

  const batch = writeBatch(db);
  batch.update(userRef, {
    joinedClubs: arrayUnion(clubId)
  });
  batch.update(clubDoc.ref, {
    memberCount: increment(1)
  });

  await batch.commit();

  const data = clubDoc.data() as ClubFirestore;
  return {
    ...data,
    id: clubId,
    createdAt: convertTimestamp(data.createdAt),
  };
};

export const getClub = async (clubId: string): Promise<Club | null> => {
  const clubRef = doc(db, 'clubs', clubId);
  const snap = await getDoc(clubRef);
  if (!snap.exists()) return null;
  const data = snap.data() as ClubFirestore;
  return {
    ...data,
    id: snap.id,
    createdAt: convertTimestamp(data.createdAt),
  };
};

export const getUserClubs = async (uid: string): Promise<Club[]> => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return [];

  const userData = snap.data() as UserFirestore;
  const clubIds = userData.joinedClubs || [];

  if (clubIds.length === 0) return [];

  const clubs: Club[] = [];
  for (const id of clubIds) {
    const club = await getClub(id);
    if (club) clubs.push(club);
  }
  return clubs;
};

export const getAllClubs = async (): Promise<Club[]> => {
  const clubsRef = collection(db, 'clubs');
  const q = query(clubsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data() as ClubFirestore;
    return {
      ...data,
      id: doc.id,
      createdAt: convertTimestamp(data.createdAt),
    };
  });
};

// ==================== IDEAS ====================

export const createIdea = async (
  uid: string,
  displayName: string,
  input: IdeaInput
): Promise<Idea> => {
  const ideasRef = collection(db, 'ideas');

  const ideaData = {
    ...input,
    submittedBy: {
      uid,
      displayName,
    },
    status: 'open' as IdeaStatus,
    voteScore: 0,
    votesIn: 0,
    votesOut: 0,
    trendingVelocity: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    tags: input.tags || [],
  };

  const docRef = await addDoc(ideasRef, ideaData);

  // Award reputation for submitting an idea
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { reputationScore: increment(5) });
  } catch (e) {
    console.error('Failed to award idea reputation:', e);
  }

  return {
    id: docRef.id,
    ...input,
    submittedBy: { uid, displayName },
    status: 'open',
    voteScore: 0,
    votesIn: 0,
    votesOut: 0,
    trendingVelocity: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: input.tags || [],
  };
};

export const getIdea = async (ideaId: string): Promise<Idea | null> => {
  const ideaRef = doc(db, 'ideas', ideaId);
  const ideaSnap = await getDoc(ideaRef);

  if (!ideaSnap.exists()) return null;

  const data = ideaSnap.data() as IdeaFirestore;
  return {
    ...data,
    id: ideaSnap.id,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
    reviewedAt: data.reviewedAt ? convertTimestamp(data.reviewedAt) : undefined,
  } as Idea;
};

export const subscribeToIdea = (
  ideaId: string,
  callback: (idea: Idea | null) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const ideaRef = doc(db, 'ideas', ideaId);
  return onSnapshot(ideaRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const data = snapshot.data() as IdeaFirestore;
    callback({
      ...data,
      id: snapshot.id,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      reviewedAt: data.reviewedAt ? convertTimestamp(data.reviewedAt) : undefined,
    } as Idea);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const getIdeaByMeetingId = async (meetingId: string): Promise<Idea | null> => {
  const ideasRef = collection(db, 'ideas');
  const q = query(ideasRef, where('meetingId', '==', meetingId), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const d = snapshot.docs[0];
  const data = d.data() as IdeaFirestore;
  return {
    ...data,
    id: d.id,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
    reviewedAt: data.reviewedAt ? convertTimestamp(data.reviewedAt) : undefined,
  } as Idea;
};

export const getIdeas = async (
  clubId: string,
  statusFilter?: IdeaStatus,
  categoryFilter?: IdeaCategory,
  limitCount: number = 20,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ ideas: Idea[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> => {
  const constraints: QueryConstraint[] = [where('clubId', '==', clubId)];

  if (statusFilter) {
    constraints.push(where('status', '==', statusFilter));
  }

  if (categoryFilter) {
    constraints.push(where('category', '==', categoryFilter));
  }

  constraints.push(orderBy('voteScore', 'desc'));
  constraints.push(limit(limitCount));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const ideasRef = collection(db, 'ideas');
  const q = query(ideasRef, ...constraints);
  const snapshot = await getDocs(q);

  const ideas = snapshot.docs.map(doc => {
    const data = doc.data() as IdeaFirestore;
    return {
      ...data,
      id: doc.id,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      reviewedAt: data.reviewedAt ? convertTimestamp(data.reviewedAt) : undefined,
    };
  });

  const lastDocument = snapshot.docs[snapshot.docs.length - 1] || null;

  return { ideas, lastDoc: lastDocument };
};

export const updateIdeaStatus = async (
  ideaId: string,
  status: IdeaStatus,
  reviewedBy?: string
): Promise<void> => {
  const ideaRef = doc(db, 'ideas', ideaId);
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (reviewedBy) {
    updateData.reviewedBy = reviewedBy;
    updateData.reviewedAt = serverTimestamp();
  }

  await updateDoc(ideaRef, updateData);

  // Award reputation when idea is approved
  if (status === 'approved') {
    try {
      const ideaSnap = await getDoc(ideaRef);
      if (ideaSnap.exists()) {
        const ideaData = ideaSnap.data() as IdeaFirestore;
        const submitterRef = doc(db, 'users', ideaData.submittedBy.uid);
        await updateDoc(submitterRef, { reputationScore: increment(15) });
      }
    } catch (e) {
      console.error('Failed to award approval reputation:', e);
    }
  }
};

export const updateIdeaMeeting = async (ideaId: string, meetingId: string): Promise<void> => {
  const ideaRef = doc(db, 'ideas', ideaId);
  await updateDoc(ideaRef, {
    meetingId,
    updatedAt: serverTimestamp(),
  });
};

export const updateIdeaAIDraft = async (ideaId: string, draftId: string): Promise<void> => {
  const ideaRef = doc(db, 'ideas', ideaId);
  await updateDoc(ideaRef, {
    aiDraftId: draftId,
    updatedAt: serverTimestamp(),
  });
};

export const deleteIdea = async (ideaId: string): Promise<void> => {
  const ideaRef = doc(db, 'ideas', ideaId);
  await deleteDoc(ideaRef);
};

// Subscribe to ideas for real-time updates
export const subscribeToIdeas = (
  clubId: string,
  callback: (ideas: Idea[]) => void,
  statusFilter?: IdeaStatus,
  categoryFilter?: IdeaCategory,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const constraints: QueryConstraint[] = [where('clubId', '==', clubId)];

  if (statusFilter) {
    constraints.push(where('status', '==', statusFilter));
  }

  if (categoryFilter) {
    constraints.push(where('category', '==', categoryFilter));
  }

  constraints.push(orderBy('voteScore', 'desc'));

  const ideasRef = collection(db, 'ideas');
  const q = query(ideasRef, ...constraints);

  return onSnapshot(q, (snapshot) => {
    const ideas = snapshot.docs.map(doc => {
      const data = doc.data() as IdeaFirestore;
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        reviewedAt: data.reviewedAt ? convertTimestamp(data.reviewedAt) : undefined,
      };
    });
    callback(ideas);
  }, (error) => {
    console.error('Ideas subscription failed:', error);
    if (errorCallback) errorCallback(error);
  });
};

// ==================== TECH FEED ====================

export const getTechFeed = async (
  clubId?: string,
  categoryFilter?: string,
  limitCount: number = 100
): Promise<TechFeedItem[]> => {
  const constraints: QueryConstraint[] = [];

  if (clubId) {
    constraints.push(where('clubId', '==', clubId));
  }

  if (categoryFilter) {
    constraints.push(where('category', '==', categoryFilter));
  }

  // Enforce latest 7 days rule
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  constraints.push(where('publishedAt', '>=', sevenDaysAgo));
  constraints.push(orderBy('publishedAt', 'desc'));
  constraints.push(limit(limitCount));

  const feedRef = collection(db, 'tech_feed');
  const q = query(feedRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data() as TechFeedItemFirestore;
    return {
      ...data,
      id: doc.id,
      publishedAt: convertTimestamp(data.publishedAt),
      ingestedAt: convertTimestamp(data.ingestedAt),
    };
  });
};

export const subscribeToTechFeed = (
  callback: (items: TechFeedItem[]) => void,
  clubId?: string,
  categoryFilter?: string,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const constraints: QueryConstraint[] = [];

  if (clubId) {
    constraints.push(where('clubId', '==', clubId));
  }

  if (categoryFilter) {
    constraints.push(where('category', '==', categoryFilter));
  }

  // Enforce latest 7 days rule
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  constraints.push(where('publishedAt', '>=', sevenDaysAgo));
  constraints.push(orderBy('publishedAt', 'desc'));

  const feedRef = collection(db, 'tech_feed');
  const q = query(feedRef, ...constraints);

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => {
      const data = doc.data() as TechFeedItemFirestore;
      return {
        ...data,
        id: doc.id,
        publishedAt: convertTimestamp(data.publishedAt),
        ingestedAt: convertTimestamp(data.ingestedAt),
      };
    });
    callback(items);
  }, (error) => {
    console.error('TechFeed subscription failed:', error);
    if (errorCallback) errorCallback(error);
  });
};

export const addTechFeedItem = async (item: Omit<TechFeedItem, 'id' | 'ingestedAt'>): Promise<string> => {
  const feedRef = collection(db, 'tech_feed');
  const docRef = await addDoc(feedRef, {
    ...item,
    publishedAt: Timestamp.fromDate(item.publishedAt),
    ingestedAt: serverTimestamp(),
  });
  return docRef.id;
};

// ==================== MEETING ROOMS (FIXED 4 ROOMS) ====================

const MEETING_ROOM_IDS: MeetingRoomId[] = ['room-1', 'room-2', 'room-3', 'room-4'];

export const ensureMeetingRooms = async (clubId: string): Promise<void> => {
  const roomsRef = collection(db, 'meeting_rooms');
  const q = query(roomsRef, where('clubId', '==', clubId));
  const snapshot = await getDocs(q);

  const existing = new Set(snapshot.docs.map(d => (d.data() as any).roomId as string));
  const missing = MEETING_ROOM_IDS.filter((id) => !existing.has(id));
  if (missing.length === 0) return;

  const batch = writeBatch(db);
  for (const roomId of missing) {
    const roomDocId = `${clubId}_${roomId}`;
    const roomRef = doc(db, 'meeting_rooms', roomDocId);
    batch.set(roomRef, {
      clubId,
      roomId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
};

export const subscribeToMeetingRooms = (
  clubId: string,
  callback: (rooms: MeetingRoom[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const roomsRef = collection(db, 'meeting_rooms');
  const q = query(roomsRef, where('clubId', '==', clubId));

  return onSnapshot(q, (snapshot) => {
    const rooms = snapshot.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        clubId: data.clubId,
        roomId: data.roomId as MeetingRoomId,
        activeMeetingId: data.activeMeetingId,
        updatedAt: convertTimestamp(data.updatedAt),
      } as MeetingRoom;
    });
    callback(rooms);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

// ==================== MEETING SESSION + JOIN REQUESTS ====================

export const createMeetingSessionForRoom = async (
  clubId: string,
  roomId: MeetingRoomId,
  createdBy: { uid: string; displayName: string }
): Promise<MeetingSession> => {
  const sessionsRef = collection(db, 'meeting_sessions');
  const docRef = await addDoc(sessionsRef, {
    clubId,
    roomId,
    status: 'active',
    createdBy: createdBy.uid,
    createdByDisplayName: createdBy.displayName,
    startedAt: serverTimestamp(),
    attendees: [createdBy.uid],
  });

  const roomDocId = `${clubId}_${roomId}`;
  const roomRef = doc(db, 'meeting_rooms', roomDocId);
  await setDoc(roomRef, {
    clubId,
    roomId,
    activeMeetingId: docRef.id,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return {
    id: docRef.id,
    clubId,
    roomId,
    status: 'active',
    createdBy: createdBy.uid,
    startedAt: new Date(),
    attendees: [createdBy.uid],
  };
};

export const endMeetingSession = async (meetingId: string): Promise<void> => {
  const meetingRef = doc(db, 'meeting_sessions', meetingId);
  await updateDoc(meetingRef, {
    status: 'ended',
    endedAt: serverTimestamp(),
  });
};

export const setMeetingRoomActiveMeetingId = async (
  clubId: string,
  roomId: MeetingRoomId,
  activeMeetingId: string | null
): Promise<void> => {
  const roomDocId = `${clubId}_${roomId}`;
  const roomRef = doc(db, 'meeting_rooms', roomDocId);
  await setDoc(roomRef, {
    clubId,
    roomId,
    activeMeetingId: activeMeetingId || null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const getMeetingBoardText = async (meetingId: string): Promise<string> => {
  try {
    const boardRef = doc(db, 'meeting_boards', meetingId);
    const snap = await getDoc(boardRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.delta && Array.isArray(data.delta.ops)) {
        let text = '';
        for (const op of data.delta.ops) {
          if (typeof op.insert === 'string') {
            text += op.insert;
          }
        }
        const trimmed = text.trim();
        if (trimmed.length > 0) return trimmed;
      }
    }

    // snapshot either didn't exist or had no textual content; fall back to
    // replaying the ops log so that we don't return an empty string if a
    // client has made changes that haven't been flushed into the main
    // document yet.
    const opsRef = collection(db, 'meeting_board_ops', meetingId, 'ops');
    const opsSnap = await getDocs(opsRef);
    if (opsSnap.empty) return '';
    let aggregate = '';
    opsSnap.docs.forEach((d) => {
      const data = d.data() as any;
      const delta = data.delta;
      if (delta && Array.isArray(delta.ops)) {
        for (const op of delta.ops) {
          if (typeof op.insert === 'string') {
            aggregate += op.insert;
          }
        }
      }
    });
    return aggregate.trim();
  } catch (error) {
    console.error('Failed to get meeting board text from DB:', error);
    return '';
  }
};

// one‑time fetch helper for canvas state so that the meeting end logic can
// include whatever drawings were made.  The shape is exactly what
// subscribeToMeetingCanvas returns.
export const getMeetingCanvasData = async (
  meetingId: string
): Promise<MeetingCanvas | null> => {
  try {
    const canvasRef = doc(db, 'meeting_canvases', meetingId);
    const snap = await getDoc(canvasRef);
    if (!snap.exists()) return null;
    const data = snap.data() as any as MeetingCanvasFirestore;
    return {
      id: snap.id,
      meetingId,
      paths: data.paths || [],
      updatedAt: convertTimestamp(data.updatedAt),
    } as MeetingCanvas;
  } catch (error) {
    console.error('Failed to get meeting canvas data from DB:', error);
    return null;
  }
};

export const createMeetingOutput = async (
  meetingId: string,
  clubId: string,
  output: Omit<MeetingOutput, 'id' | 'meetingId' | 'clubId' | 'createdAt'>
): Promise<string> => {
  const outputsRef = collection(db, 'meeting_outputs');
  const data = Object.fromEntries(
    Object.entries(output).filter(([_, value]) => value !== undefined)
  );
  const docRef = await addDoc(outputsRef, {
    meetingId,
    clubId,
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

const parseMeetingOutput = (d: any, id: string): MeetingOutput => ({
  id,
  meetingId: d.meetingId,
  clubId: d.clubId,
  createdAt: convertTimestamp(d.createdAt),
  modelUsed: d.modelUsed,
  transcript: d.transcript,
  summaryNotes: d.summaryNotes,
  futureAgenda: d.futureAgenda || [],
  futureScopes: d.futureScopes || [],
  promises: d.promises || [],
  attendees: d.attendees || [],
});

export const subscribeToMeetingOutput = (
  meetingId: string,
  callback: (output: MeetingOutput | null) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const outputsRef = collection(db, 'meeting_outputs');
  const q = query(outputsRef, where('meetingId', '==', meetingId), orderBy('createdAt', 'desc'), limit(1));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const d = snapshot.docs[0];
    callback(parseMeetingOutput(d.data(), d.id));
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

// Subscribe to ALL meeting outputs for a given meetingId (project sessions history)
export const subscribeToMeetingHistory = (
  meetingId: string,
  callback: (outputs: MeetingOutput[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const outputsRef = collection(db, 'meeting_outputs');
  const q = query(outputsRef, where('meetingId', '==', meetingId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const outputs = snapshot.docs.map((d) => parseMeetingOutput(d.data(), d.id));
    callback(outputs);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

// Delete all meeting-related data for a project (call on project deletion)
export const deleteProjectMeetingData = async (projectId: string): Promise<void> => {
  const meetingId = `project-${projectId}`;

  // Delete all meeting outputs
  const outputsRef = collection(db, 'meeting_outputs');
  const outputsSnap = await getDocs(query(outputsRef, where('meetingId', '==', meetingId)));
  if (!outputsSnap.empty) {
    const batch = writeBatch(db);
    outputsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Delete the meeting board document
  const boardRef = doc(db, 'meeting_boards', meetingId);
  const boardSnap = await getDoc(boardRef);
  if (boardSnap.exists()) {
    await deleteDoc(boardRef);
  }

  // Delete presence sub-collection entries
  const presenceRef = collection(db, 'meeting_sessions', meetingId, 'presence');
  const presenceSnap = await getDocs(presenceRef);
  if (!presenceSnap.empty) {
    const batch2 = writeBatch(db);
    presenceSnap.docs.forEach((d) => batch2.delete(d.ref));
    await batch2.commit();
  }
};

export const subscribeToActiveMeetingForRoom = (
  clubId: string,
  roomId: MeetingRoomId,
  callback: (meeting: MeetingSession | null) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const sessionsRef = collection(db, 'meeting_sessions');
  const q = query(
    sessionsRef,
    where('clubId', '==', clubId),
    where('roomId', '==', roomId),
    where('status', '==', 'active'),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const d = snapshot.docs[0];
    const data = d.data() as any as MeetingSessionFirestore;
    callback({
      ...(data as any),
      id: d.id,
      startedAt: convertTimestamp((data as any).startedAt),
      endedAt: (data as any).endedAt ? convertTimestamp((data as any).endedAt) : undefined,
    } as MeetingSession);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const requestToJoinMeeting = async (
  meetingId: string,
  clubId: string,
  user: { uid: string; displayName: string }
): Promise<void> => {
  const reqRef = doc(db, 'meeting_sessions', meetingId, 'join_requests', user.uid);
  await setDoc(reqRef, {
    meetingId,
    clubId,
    uid: user.uid,
    displayName: user.displayName,
    status: 'pending',
    createdAt: serverTimestamp(),
  }, { merge: true });
};

export const subscribeToMyJoinRequest = (
  meetingId: string,
  uid: string,
  callback: (req: MeetingJoinRequest | null) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const reqRef = doc(db, 'meeting_sessions', meetingId, 'join_requests', uid);
  return onSnapshot(reqRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as any;
    callback({
      id: snap.id,
      meetingId: data.meetingId,
      clubId: data.clubId,
      uid: data.uid,
      displayName: data.displayName,
      status: data.status,
      createdAt: convertTimestamp(data.createdAt),
      decidedBy: data.decidedBy,
      decidedAt: data.decidedAt ? convertTimestamp(data.decidedAt) : undefined,
    } as MeetingJoinRequest);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const subscribeToJoinRequests = (
  meetingId: string,
  callback: (reqs: MeetingJoinRequest[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const reqsRef = collection(db, 'meeting_sessions', meetingId, 'join_requests');
  return onSnapshot(reqsRef, (snapshot) => {
    const reqs = snapshot.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        meetingId: data.meetingId,
        clubId: data.clubId,
        uid: data.uid,
        displayName: data.displayName,
        status: data.status,
        createdAt: convertTimestamp(data.createdAt),
        decidedBy: data.decidedBy,
        decidedAt: data.decidedAt ? convertTimestamp(data.decidedAt) : undefined,
      } as MeetingJoinRequest;
    });
    callback(reqs);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const decideJoinRequest = async (
  meetingId: string,
  targetUid: string,
  decision: 'approved' | 'rejected',
  decidedByUid: string
): Promise<void> => {
  const reqRef = doc(db, 'meeting_sessions', meetingId, 'join_requests', targetUid);
  await updateDoc(reqRef, {
    status: decision,
    decidedBy: decidedByUid,
    decidedAt: serverTimestamp(),
  });

  if (decision === 'approved') {
    const meetingRef = doc(db, 'meeting_sessions', meetingId);
    await updateDoc(meetingRef, {
      attendees: arrayUnion(targetUid),
    });
  }
};

// ==================== PRESENCE + BOARD ====================

export const upsertMeetingPresence = async (
  meetingId: string,
  presence: { uid: string; displayName: string; cursor?: { index: number; length: number } }
): Promise<void> => {
  const presenceRef = doc(db, 'meeting_sessions', meetingId, 'presence', presence.uid);
  await setDoc(presenceRef, {
    meetingId,
    uid: presence.uid,
    displayName: presence.displayName,
    cursor: presence.cursor || null,
    lastActiveAt: serverTimestamp(),
  }, { merge: true });
};

export const subscribeToMeetingPresence = (
  meetingId: string,
  callback: (presence: MeetingPresence[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const presenceRef = collection(db, 'meeting_sessions', meetingId, 'presence');
  return onSnapshot(presenceRef, (snapshot) => {
    const list = snapshot.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        meetingId: data.meetingId,
        uid: data.uid,
        displayName: data.displayName,
        lastActiveAt: convertTimestamp(data.lastActiveAt),
        cursor: data.cursor || undefined,
      } as MeetingPresence;
    });
    callback(list);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const ensureMeetingBoard = async (meetingId: string): Promise<void> => {
  const boardRef = doc(db, 'meeting_boards', meetingId);
  const snap = await getDoc(boardRef);
  if (snap.exists()) return;
  await setDoc(boardRef, {
    meetingId,
    delta: { ops: [{ insert: '' }] },
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToMeetingBoard = (
  meetingId: string,
  callback: (board: MeetingBoard | null) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const boardRef = doc(db, 'meeting_boards', meetingId);
  return onSnapshot(boardRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as any as MeetingBoardFirestore;
    callback({
      id: snap.id,
      meetingId: (data as any).meetingId,
      delta: (data as any).delta,
      updatedAt: convertTimestamp((data as any).updatedAt),
    } as MeetingBoard);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const updateMeetingBoardDelta = async (
  meetingId: string,
  delta: unknown
): Promise<void> => {
  const boardRef = doc(db, 'meeting_boards', meetingId);
  await setDoc(boardRef, {
    meetingId,
    delta,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// helper to append a small "operation" delta rather than rewrite entire board
// used for real‑time collaborative editing.  Operations are stored in a
// subcollection so that multiple clients can push individual Quill change
// objects and everyone can apply them without losing concurrent edits.
export const appendMeetingBoardOp = async (
  meetingId: string,
  delta: unknown
): Promise<void> => {
  const opsRef = collection(db, 'meeting_board_ops', meetingId, 'ops');
  await addDoc(opsRef, {
    delta,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToMeetingBoardOps = (
  meetingId: string,
  callback: (delta: any) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const opsRef = collection(db, 'meeting_board_ops', meetingId, 'ops');
  const q = query(opsRef, orderBy('createdAt'));
  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as any;
          callback(data.delta);
        }
      });
    },
    (error) => {
      if (errorCallback) errorCallback(error);
    }
  );
};

export const clearMeetingBoard = async (meetingId: string): Promise<void> => {
  const boardRef = doc(db, 'meeting_boards', meetingId);
  await setDoc(boardRef, {
    meetingId,
    delta: { ops: [{ insert: '\n' }] },
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// ==================== AI DRAFTS ====================

export const createAIDraft = async (
  ideaId: string,
  draft: Omit<AIDraft, 'id' | 'ideaId' | 'generatedAt'>
): Promise<AIDraft> => {
  const draftsRef = collection(db, 'ai_drafts');

  const draftData = {
    ...draft,
    ideaId,
    generatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(draftsRef, draftData);

  await updateIdeaAIDraft(ideaId, docRef.id);

  return {
    id: docRef.id,
    ideaId,
    ...draft,
    generatedAt: new Date(),
  };
};

export const getAIDraft = async (draftId: string): Promise<AIDraft | null> => {
  const draftRef = doc(db, 'ai_drafts', draftId);
  const draftSnap = await getDoc(draftRef);

  if (!draftSnap.exists()) return null;

  const data = draftSnap.data() as AIDraftFirestore;
  return {
    ...data,
    id: draftSnap.id,
    generatedAt: convertTimestamp(data.generatedAt),
  };
};

export const getAIDraftForIdea = async (ideaId: string): Promise<AIDraft | null> => {
  const draftsRef = collection(db, 'ai_drafts');
  const q = query(draftsRef, where('ideaId', '==', ideaId), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data() as AIDraftFirestore;
  return {
    ...data,
    id: docSnap.id,
    generatedAt: convertTimestamp(data.generatedAt),
  };
};

export const getClubUsers = async (clubId: string): Promise<User[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('joinedClubs', 'array-contains', clubId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data() as UserFirestore;
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      lastActive: convertTimestamp(data.lastActive),
    };
  });
};

export const getHighPerformingIdeas = async (threshold: number = 20): Promise<Idea[]> => {
  const ideasRef = collection(db, 'ideas');
  const q = query(
    ideasRef,
    where('status', '==', 'open'),
    where('voteScore', '>=', threshold),
    orderBy('voteScore', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data() as IdeaFirestore;
    return {
      ...data,
      id: doc.id,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      reviewedAt: data.reviewedAt ? convertTimestamp(data.reviewedAt) : undefined,
    };
  });
};

export const getControversialIdeas = async (minVotes: number = 10): Promise<Idea[]> => {
  const ideasRef = collection(db, 'ideas');
  const q = query(
    ideasRef,
    where('status', '==', 'open'),
    where('votesIn', '>=', minVotes),
    orderBy('votesIn', 'desc')
  );
  const snapshot = await getDocs(q);

  const ideas = snapshot.docs.map(doc => {
    const data = doc.data() as IdeaFirestore;
    return {
      ...data,
      id: doc.id,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      reviewedAt: data.reviewedAt ? convertTimestamp(data.reviewedAt) : undefined,
    };
  });

  return ideas.filter(idea => idea.votesOut >= minVotes / 2);
};

export const getStalledIdeas = async (daysStalled: number = 7): Promise<Idea[]> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysStalled);

  const ideasRef = collection(db, 'ideas');
  const q = query(
    ideasRef,
    where('status', '==', 'open'),
    orderBy('updatedAt', 'asc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(doc => {
      const data = doc.data() as IdeaFirestore;
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        reviewedAt: data.reviewedAt ? convertTimestamp(data.reviewedAt) : undefined,
      };
    })
    .filter(idea => idea.updatedAt < cutoffDate);
};

export const getIdeasByStatus = async (status: IdeaStatus, limitCount: number = 20): Promise<Idea[]> => {
  const ideasRef = collection(db, 'ideas');
  const constraints: QueryConstraint[] = [
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
  ];

  if (limitCount > 0) {
    constraints.push(limit(limitCount));
  }

  const q = query(ideasRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data() as IdeaFirestore;
    return {
      ...data,
      id: doc.id,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      reviewedAt: data.reviewedAt ? convertTimestamp(data.reviewedAt) : undefined,
    };
  });
};

export const checkThresholdAndUpdateStatus = async (threshold: number): Promise<Idea[]> => {
  const ideasToUpdate = await getHighPerformingIdeas(threshold);
  const updatedIdeas: Idea[] = [];

  for (const idea of ideasToUpdate) {
    if (idea.status === 'open') {
      await updateIdeaStatus(idea.id, 'under_review');
      updatedIdeas.push({ ...idea, status: 'under_review' });
    }
  }

  return updatedIdeas;
};

// ==================== VOTES ====================

export const createOrUpdateVote = async (
  ideaId: string,
  uid: string,
  voteType: VoteType
): Promise<Vote> => {
  const voteId = `${ideaId}_${uid}`;
  const voteRef = doc(db, 'votes', voteId);
  const voteSnap = await getDoc(voteRef);

  const ideaRef = doc(db, 'ideas', ideaId);

  if (voteSnap.exists()) {
    const existingVote = voteSnap.data() as VoteFirestore;
    const previousVote = existingVote.vote;

    // If same vote, just return existing
    if (previousVote === voteType) {
      return {
        id: voteId,
        ideaId,
        uid,
        vote: voteType,
        createdAt: convertTimestamp(existingVote.createdAt),
        updatedAt: convertTimestamp(existingVote.updatedAt),
      };
    }

    // Update vote and adjust counters
    const batch = writeBatch(db);

    batch.update(voteRef, {
      vote: voteType,
      updatedAt: serverTimestamp(),
    });

    // Get current idea data to calculate velocity
    const ideaSnap = await getDoc(ideaRef);
    const ideaData = ideaSnap.data() as IdeaFirestore;
    const currentScore = ideaData.voteScore || 0;
    const createdAt = convertTimestamp(ideaData.createdAt);
    const hoursSinceCreation = Math.max(0, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60));

    // Update idea counters
    if (previousVote === 'in' && voteType === 'out') {
      batch.update(ideaRef, {
        votesIn: increment(-1),
        votesOut: increment(1),
        voteScore: increment(-2),
        updatedAt: serverTimestamp(),
      });
    } else if (previousVote === 'out' && voteType === 'in') {
      batch.update(ideaRef, {
        votesIn: increment(1),
        votesOut: increment(-1),
        voteScore: increment(2),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    return {
      id: voteId,
      ideaId,
      uid,
      vote: voteType,
      createdAt: convertTimestamp(existingVote.createdAt),
      updatedAt: new Date(),
    };
  }

  // Create new vote
  const batch = writeBatch(db);

  batch.set(voteRef, {
    ideaId,
    uid,
    vote: voteType,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Get current idea data to calculate velocity
  const ideaSnap = await getDoc(ideaRef);
  const ideaData = ideaSnap.data() as IdeaFirestore;
  const currentScore = ideaData.voteScore || 0;
  const createdAt = convertTimestamp(ideaData.createdAt);
  const hoursSinceCreation = Math.max(0, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60));

  // Update idea counters
  if (voteType === 'in') {
    batch.update(ideaRef, {
      votesIn: increment(1),
      voteScore: increment(1),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(ideaRef, {
      votesOut: increment(1),
      voteScore: increment(-1),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();

  // Award reputation point for casting a vote
  try {
    const voterRef = doc(db, 'users', uid);
    await updateDoc(voterRef, { reputationScore: increment(1) });
  } catch (e) {
    console.error('Failed to award vote reputation:', e);
  }

  return {
    id: voteId,
    ideaId,
    uid,
    vote: voteType,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const getVote = async (ideaId: string, uid: string): Promise<Vote | null> => {
  const voteId = `${ideaId}_${uid}`;
  const voteRef = doc(db, 'votes', voteId);
  const voteSnap = await getDoc(voteRef);

  if (!voteSnap.exists()) return null;

  const data = voteSnap.data() as VoteFirestore;
  return {
    ...data,
    id: voteId,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  };
};

export const getVotesForIdea = async (ideaId: string): Promise<Vote[]> => {
  const votesRef = collection(db, 'votes');
  const q = query(votesRef, where('ideaId', '==', ideaId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data() as VoteFirestore;
    return {
      ...data,
      id: doc.id,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    };
  });
};

// ==================== COMMENTS ====================

export const addComment = async (
  ideaId: string,
  uid: string,
  displayName: string,
  text: string
): Promise<Comment> => {
  const commentsRef = collection(db, 'comments');
  const commentData = {
    ideaId,
    uid,
    displayName,
    text,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(commentsRef, commentData);
  return {
    id: docRef.id,
    ideaId,
    uid,
    displayName,
    text,
    createdAt: new Date(),
  };
};

export const subscribeToComments = (
  ideaId: string,
  callback: (comments: Comment[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const commentsRef = collection(db, 'comments');
  const q = query(
    commentsRef,
    where('ideaId', '==', ideaId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(doc => {
      const data = doc.data() as CommentFirestore;
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
      } as Comment;
    });
    callback(comments);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

// ==========================================
// Module 1: Communication & Discussions
// ==========================================

export const createChannel = async (
  clubId: string,
  name: string,
  description: string,
  type: ChannelType,
  createdBy: string
): Promise<Channel> => {
  const channelsRef = collection(db, 'channels');

  const channelData = {
    clubId,
    name,
    description,
    type,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  };

  const docRef = await addDoc(channelsRef, channelData);

  return {
    ...channelData,
    id: docRef.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const subscribeToChannels = (
  clubId: string,
  callback: (channels: Channel[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const channelsRef = collection(db, 'channels');
  const q = query(
    channelsRef,
    where('clubId', '==', clubId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const channels = snapshot.docs.map(doc => {
      const data = doc.data() as ChannelFirestore;
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Channel;
    });
    callback(channels);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const sendMessage = async (
  channelId: string,
  clubId: string,
  uid: string,
  displayName: string,
  content: string,
  type: MessageType,
  options?: {
    richText?: string;
    pollData?: PollData;
    mentions?: string[];
    attachments?: MessageAttachment[];
    threadId?: string;
  }
): Promise<ChatMessage> => {
  const messagesRef = collection(db, 'messages');

  const msgData = {
    channelId,
    clubId,
    uid,
    displayName,
    content,
    type,
    richText: options?.richText || null,
    pollData: options?.pollData || null,
    mentions: options?.mentions || [],
    attachments: options?.attachments || [],
    reactions: [],
    replyCount: 0,
    threadId: options?.threadId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isEdited: false,
  };

  const docRef = await addDoc(messagesRef, msgData);

  if (options?.threadId) {
    // Increment reply count on parent message
    const parentRef = doc(db, 'messages', options.threadId);
    await updateDoc(parentRef, {
      replyCount: increment(1)
    });
  }

  return {
    ...(msgData as unknown as Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt'>),
    id: docRef.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const subscribeToMessages = (
  channelId: string,
  clubId: string,
  callback: (messages: ChatMessage[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const messagesRef = collection(db, 'messages');
  // Get main channel messages (not threaded replies)
  const q = query(
    messagesRef,
    where('clubId', '==', clubId),
    where('channelId', '==', channelId),
    where('threadId', '==', null),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data() as ChatMessageFirestore;
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as ChatMessage;
    });
    callback(messages);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const subscribeToThread = (
  messageId: string,
  clubId: string,
  callback: (messages: ChatMessage[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('clubId', '==', clubId),
    where('threadId', '==', messageId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data() as ChatMessageFirestore;
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as ChatMessage;
    });
    callback(messages);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const addReaction = async (messageId: string, emoji: string, uid: string): Promise<void> => {
  const msgRef = doc(db, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;

  const data = snap.data() as ChatMessageFirestore;
  let reactions = data.reactions || [];

  const existingReactionIndex = reactions.findIndex(r => r.emoji === emoji);
  if (existingReactionIndex >= 0) {
    if (!reactions[existingReactionIndex].users.includes(uid)) {
      reactions[existingReactionIndex].users.push(uid);
    }
  } else {
    reactions.push({ emoji, users: [uid] });
  }

  await updateDoc(msgRef, { reactions });
};

export const removeReaction = async (messageId: string, emoji: string, uid: string): Promise<void> => {
  const msgRef = doc(db, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;

  const data = snap.data() as ChatMessageFirestore;
  let reactions = data.reactions || [];

  const existingReactionIndex = reactions.findIndex(r => r.emoji === emoji);
  if (existingReactionIndex >= 0) {
    reactions[existingReactionIndex].users = reactions[existingReactionIndex].users.filter(id => id !== uid);
    if (reactions[existingReactionIndex].users.length === 0) {
      reactions = reactions.filter(r => r.emoji !== emoji);
    }
    await updateDoc(msgRef, { reactions });
  }
};

export const castPollVote = async (messageId: string, optionId: string, uid: string): Promise<void> => {
  console.log('castPollVote called with:', { messageId, optionId, uid });
  const msgRef = doc(db, 'messages', messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) {
    console.warn('Message not found:', messageId);
    return;
  }

  const data = snap.data() as ChatMessageFirestore;
  console.log('Message data retrieved:', data.type);
  if (data.type !== 'poll' || !data.pollData) {
    console.warn('Message is not a poll or missing pollData');
    return;
  }

  const pollData = { ...data.pollData };
  if (pollData.closed) {
    console.warn('Poll is closed');
    return;
  }

  // if not allow multiple, remove user from other options
  if (!pollData.allowMultiple) {
    pollData.options.forEach(opt => {
      if (opt.id !== optionId) {
        opt.votes = opt.votes.filter(id => id !== uid);
      }
    });
  }

  const option = pollData.options.find(o => o.id === optionId);
  if (option) {
    // Toggle vote
    if (option.votes.includes(uid)) {
      console.log('Removing vote for:', optionId);
      option.votes = option.votes.filter(id => id !== uid);
    } else {
      console.log('Adding vote for:', optionId);
      option.votes.push(uid);
    }
  } else {
    console.warn('Option not found:', optionId);
    return;
  }

  try {
    console.log('Updating document with new pollData...');
    await updateDoc(msgRef, { pollData });
    console.log('Update successful');
  } catch (error) {
    console.error('Error updating poll vote:', error);
    throw error;
  }
};

// ==========================================
// Module 2: Project Collaboration Functions
// ==========================================

export const createProject = async (
  projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const projectsRef = collection(db, 'projects');
  const now = serverTimestamp();

  const docRef = await addDoc(projectsRef, {
    ...projectData,
    startDate: Timestamp.fromDate(projectData.startDate),
    targetDate: projectData.targetDate ? Timestamp.fromDate(projectData.targetDate) : null,
    completedDate: projectData.completedDate ? Timestamp.fromDate(projectData.completedDate) : null,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
};

export const subscribeToProjects = (
  clubId: string,
  callback: (projects: Project[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const projectsRef = collection(db, 'projects');
  const q = query(
    projectsRef,
    where('clubId', '==', clubId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => {
      const data = doc.data() as ProjectFirestore;
      return {
        ...data,
        id: doc.id,
        startDate: convertTimestamp(data.startDate),
        targetDate: data.targetDate ? convertTimestamp(data.targetDate) : undefined,
        completedDate: data.completedDate ? convertTimestamp(data.completedDate) : undefined,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Project;
    });
    callback(projects);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const updateProject = async (
  projectId: string,
  updates: Partial<Project>
): Promise<void> => {
  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const createTask = async (
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const tasksRef = collection(db, 'tasks');
  const shadowNow = serverTimestamp();

  const docRef = await addDoc(tasksRef, {
    ...taskData,
    dueDate: taskData.dueDate ? Timestamp.fromDate(taskData.dueDate) : null,
    createdAt: shadowNow,
    updatedAt: shadowNow,
  });

  return docRef.id;
};

export const subscribeToTasks = (
  projectId: string,
  callback: (tasks: Task[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const tasksRef = collection(db, 'tasks');
  const q = query(
    tasksRef,
    where('projectId', '==', projectId),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => {
      const data = doc.data() as TaskFirestore;
      return {
        ...data,
        id: doc.id,
        dueDate: data.dueDate ? convertTimestamp(data.dueDate) : undefined,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as Task;
    });
    callback(tasks);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const updateTask = async (
  taskId: string,
  updates: Partial<Task>
): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const createMilestone = async (
  milestoneData: Omit<Milestone, 'id'>
): Promise<string> => {
  const milestonesRef = collection(db, 'milestones');
  const docRef = await addDoc(milestonesRef, {
    ...milestoneData,
    targetDate: Timestamp.fromDate(milestoneData.targetDate),
    completedDate: milestoneData.completedDate ? Timestamp.fromDate(milestoneData.completedDate) : null,
  });
  return docRef.id;
};

export const subscribeToMilestones = (
  projectId: string,
  callback: (milestones: Milestone[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const milestonesRef = collection(db, 'milestones');
  const q = query(
    milestonesRef,
    where('projectId', '==', projectId),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const milestones = snapshot.docs.map(doc => {
      const data = doc.data() as MilestoneFirestore;
      return {
        ...data,
        id: doc.id,
        targetDate: convertTimestamp(data.targetDate),
        completedDate: data.completedDate ? convertTimestamp(data.completedDate) : undefined,
      } as Milestone;
    });
    callback(milestones);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const updateMilestone = async (
  milestoneId: string,
  updates: Partial<Milestone>
): Promise<void> => {
  const milestoneRef = doc(db, 'milestones', milestoneId);
  await updateDoc(milestoneRef, updates);
};

// ─── Wiki Articles ──────────────────────────────────────────────────────────────

export interface WikiArticle {
  id: string;
  clubId: string;
  title: string;
  content: string;
  category: string;
  authorId: string;
  authorName: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const createWikiArticle = async (
  data: Omit<WikiArticle, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const ref = collection(db, 'wiki_articles');
  const now = serverTimestamp();
  const docRef = await addDoc(ref, { ...data, createdAt: now, updatedAt: now });
  return docRef.id;
};

export const subscribeToWikiArticles = (
  clubId: string,
  callback: (articles: WikiArticle[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const q = query(collection(db, 'wiki_articles'), where('clubId', '==', clubId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const articles = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as WikiArticle;
    });
    callback(articles);
  }, (error) => {
    console.error('WikiArticles subscription error:', error);
    if (errorCallback) errorCallback(error);
  });
};

export const getWikiArticle = async (articleId: string): Promise<WikiArticle | null> => {
  const docRef = doc(db, 'wiki_articles', articleId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    id: snap.id,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  } as WikiArticle;
};

export const updateWikiArticle = async (
  articleId: string,
  updates: Partial<WikiArticle>
): Promise<void> => {
  const ref = doc(db, 'wiki_articles', articleId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
};

// ─── Club Events ────────────────────────────────────────────────────────────────

export interface ClubEvent {
  id: string;
  clubId: string;
  title: string;
  description: string;
  type: 'Workshop' | 'Meeting' | 'Hackathon' | 'Seminar' | 'Other';
  startDate: Date;
  endDate?: Date;
  location: string;
  organizerId: string;
  attendees: string[];
  maxAttendees?: number;
  createdAt: Date;
}

export const createClubEvent = async (
  data: Omit<ClubEvent, 'id' | 'createdAt'>
): Promise<string> => {
  const ref = collection(db, 'club_events');
  const docRef = await addDoc(ref, { ...data, createdAt: serverTimestamp(), startDate: Timestamp.fromDate(data.startDate), endDate: data.endDate ? Timestamp.fromDate(data.endDate) : null });
  return docRef.id;
};

export const subscribeToClubEvents = (
  clubId: string,
  callback: (events: ClubEvent[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const q = query(collection(db, 'club_events'), where('clubId', '==', clubId), orderBy('startDate', 'asc'));
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        startDate: convertTimestamp(data.startDate),
        endDate: data.endDate ? convertTimestamp(data.endDate) : undefined,
        createdAt: convertTimestamp(data.createdAt),
      } as ClubEvent;
    });
    callback(events);
  }, (error) => {
    console.error('ClubEvents subscription error:', error);
    if (errorCallback) errorCallback(error);
  });
};

export const rsvpClubEvent = async (eventId: string, userId: string): Promise<void> => {
  const eventRef = doc(db, 'club_events', eventId);
  await updateDoc(eventRef, { attendees: arrayUnion(userId) });
};
// ==================== NOTIFICATIONS ====================

export const createNotification = async (
  recipientId: string,
  senderId: string,
  senderName: string,
  type: NotificationType,
  title: string,
  message: string,
  extras: { clubId?: string; teamId?: string; actionUrl?: string } = {}
): Promise<string> => {
  const notificationsRef = collection(db, 'notifications');
  const docRef = await addDoc(notificationsRef, {
    recipientId,
    senderId,
    senderName,
    type,
    title,
    message,
    read: false,
    createdAt: serverTimestamp(),
    ...extras,
  });
  return docRef.id;
};

export const notifyClubMembers = async (
  clubId: string,
  senderId: string,
  senderName: string,
  type: NotificationType,
  title: string,
  message: string,
  extras: { actionUrl?: string } = {}
): Promise<void> => {
  try {
    const members = await getMembers(clubId);
    const promises = members
      .filter(m => m.uid !== senderId)
      .map(m => createNotification(m.uid, senderId, senderName, type, title, message, { clubId, ...extras }));
    await Promise.all(promises);
  } catch (e) {
    console.error('Failed to notify club members:', e);
  }
};

export const subscribeToNotifications = (
  uid: string,
  callback: (notifications: Notification[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => {
      const data = doc.data() as NotificationFirestore;
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
      } as Notification;
    });
    callback(notifications);
  }, (error) => {
    console.error('Notifications subscription error:', error);
    if (errorCallback) errorCallback(error);
  });
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const ref = doc(db, 'notifications', notificationId);
  await updateDoc(ref, { read: true });
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.toLowerCase()), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) return null;
  const data = snap.docs[0].data() as UserFirestore;
  return {
    ...data,
    uid: snap.docs[0].id,
    createdAt: convertTimestamp(data.createdAt),
    lastActive: convertTimestamp(data.lastActive),
  };
};

export const inviteUserToClubAndTeam = async (
  senderId: string,
  senderName: string,
  email: string,
  clubId: string,
  teamId?: string
): Promise<void> => {
  const targetUser = await findUserByEmail(email);
  if (!targetUser) {
    throw new Error('User not found on platform. They must register first.');
  }

  const clubRef = doc(db, 'clubs', clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) throw new Error('Club not found');
  const clubData = clubSnap.data() as ClubFirestore;

  await createNotification(
    targetUser.uid,
    senderId,
    senderName,
    'club_invite',
    `Invitation to join ${clubData.name}`,
    `${senderName} invited you to join their research cluster and collaborate on projects.`,
    {
      clubId,
      teamId,
      actionUrl: `/notifications`
    }
  );
};

export const acceptInvitation = async (
  uid: string,
  notificationId: string,
  clubId: string,
  teamId?: string
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const clubRef = doc(db, 'clubs', clubId);

  const batch = writeBatch(db);

  // 1. Join Club
  batch.update(userRef, {
    joinedClubs: arrayUnion(clubId)
  });

  batch.update(clubRef, {
    memberCount: increment(1)
  });

  // 2. Join Team if provided
  if (teamId) {
    const projectRef = doc(db, 'projects', teamId);
    batch.update(projectRef, {
      members: arrayUnion(uid)
    });
  }

  // 3. Mark Notification as read
  const notifRef = doc(db, 'notifications', notificationId);
  batch.update(notifRef, { read: true });

  await batch.commit();
};

// ==========================================
// Module 2 Additions: Canvas, Wiki Versions, Links
// ==========================================

export const subscribeToProjectCanvas = (
  projectId: string,
  callback: (canvas: ProjectCanvas | null) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const canvasRef = doc(db, 'project_canvases', projectId);
  return onSnapshot(canvasRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as ProjectCanvasFirestore;
    callback({
      ...data,
      id: snap.id,
      updatedAt: convertTimestamp(data.updatedAt)
    } as ProjectCanvas);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const updateProjectCanvas = async (
  projectId: string,
  paths: CanvasPath[]
): Promise<void> => {
  const canvasRef = doc(db, 'project_canvases', projectId);
  await setDoc(canvasRef, {
    projectId,
    paths,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const subscribeToMeetingCanvas = (
  meetingId: string,
  callback: (canvas: MeetingCanvas | null) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const canvasRef = doc(db, 'meeting_canvases', meetingId);
  return onSnapshot(canvasRef, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as MeetingCanvasFirestore;
    callback({
      ...data,
      id: snap.id,
      updatedAt: convertTimestamp(data.updatedAt)
    } as MeetingCanvas);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

export const updateMeetingCanvas = async (
  meetingId: string,
  paths: CanvasPath[]
): Promise<void> => {
  const canvasRef = doc(db, 'meeting_canvases', meetingId);
  await setDoc(canvasRef, {
    meetingId,
    paths,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const addProjectExternalLink = async (
  projectId: string,
  link: { title: string; url: string; type: 'onedrive' | 'github' | 'other' }
): Promise<void> => {
  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, {
    externalLinks: arrayUnion(link),
    updatedAt: serverTimestamp()
  });
};

export const createWikiVersion = async (
  articleId: string,
  content: string,
  authorId: string,
  authorName: string
): Promise<string> => {
  const versionsRef = collection(db, 'wiki_versions');
  const docRef = await addDoc(versionsRef, {
    articleId,
    content,
    authorId,
    authorName,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const subscribeToWikiVersions = (
  articleId: string,
  callback: (versions: WikiVersion[]) => void,
  errorCallback?: (error: unknown) => void
): (() => void) => {
  const versionsRef = collection(db, 'wiki_versions');
  const q = query(versionsRef, where('articleId', '==', articleId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const versions = snapshot.docs.map(doc => {
      const data = doc.data() as WikiVersionFirestore;
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt)
      } as WikiVersion;
    });
    callback(versions);
  }, (error) => {
    if (errorCallback) errorCallback(error);
  });
};

// ==================== INTEGRATION SETTINGS ====================

export const getIntegrationSettings = async (
  clubId: string
): Promise<IntegrationSettings | null> => {
  const docRef = doc(db, 'integration_settings', clubId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data() as IntegrationSettingsFirestore;
  return {
    ...data,
    id: snap.id,
    updatedAt: convertTimestamp(data.updatedAt),
  } as IntegrationSettings;
};

export const updateIntegrationSettings = async (
  clubId: string,
  settings: Partial<Omit<IntegrationSettings, 'id' | 'clubId' | 'updatedAt'>>,
  updatedBy: string
): Promise<void> => {
  const docRef = doc(db, 'integration_settings', clubId);
  await setDoc(
    docRef,
    {
      clubId,
      ...settings,
      updatedBy,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

// ==================== CALENDAR INTEGRATION ====================

export const saveCalendarIntegration = async (
  userId: string,
  provider: CalendarProvider,
  data: Omit<CalendarIntegration, 'id' | 'userId' | 'provider' | 'connectedAt'>
): Promise<void> => {
  const docId = `${userId}_${provider}`;
  const docRef = doc(db, 'calendar_integrations', docId);
  await setDoc(docRef, {
    userId,
    provider,
    ...data,
    tokenExpiry: Timestamp.fromDate(data.tokenExpiry),
    connectedAt: serverTimestamp(),
  });
};

export const getCalendarIntegration = async (
  userId: string,
  provider: CalendarProvider
): Promise<CalendarIntegration | null> => {
  const docId = `${userId}_${provider}`;
  const docRef = doc(db, 'calendar_integrations', docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data() as CalendarIntegrationFirestore;
  return {
    ...data,
    id: snap.id,
    tokenExpiry: convertTimestamp(data.tokenExpiry),
    connectedAt: convertTimestamp(data.connectedAt),
  } as CalendarIntegration;
};

export const deleteCalendarIntegration = async (
  userId: string,
  provider: CalendarProvider
): Promise<void> => {
  const docId = `${userId}_${provider}`;
  const docRef = doc(db, 'calendar_integrations', docId);
  await deleteDoc(docRef);
};

export const getUserCalendarIntegrations = async (
  userId: string
): Promise<CalendarIntegration[]> => {
  const q = query(
    collection(db, 'calendar_integrations'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as CalendarIntegrationFirestore;
    return {
      ...data,
      id: d.id,
      tokenExpiry: convertTimestamp(data.tokenExpiry),
      connectedAt: convertTimestamp(data.connectedAt),
    } as CalendarIntegration;
  });
};
