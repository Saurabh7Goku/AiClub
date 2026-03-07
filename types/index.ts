// User Types
export type UserRole = 'member' | 'leader' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  reputationScore: number;
  createdAt: Date;
  lastActive: Date;
  profile: {
    avatarUrl?: string;
    bio?: string;
    expertise: string[];
    experienceLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
    projectsWorkedOn?: { name: string; link: string }[];
    externalLinks?: {
      github?: string;
      linkedin?: string;
      portfolio?: string;
    };
    onboardingComplete?: boolean;
    availabilityStatus?: 'Available' | 'Busy' | 'Looking for Project';
  };
  digestSubscription: boolean;
  joinedClubs: string[];
}

export interface UserFirestore extends Omit<User, 'createdAt' | 'lastActive'> {
  createdAt: { seconds: number; nanoseconds: number };
  lastActive: { seconds: number; nanoseconds: number };
}

// Club Types
export interface Club {
  id: string;
  name: string;
  description: string;
  joinKey: string;
  adminId: string;
  createdAt: Date;
  memberCount: number;
}

export interface ClubFirestore extends Omit<Club, 'createdAt'> {
  createdAt: { seconds: number; nanoseconds: number };
}

// Idea Types
export type IdeaStatus = 'open' | 'under_review' | 'approved' | 'rejected';
export type IdeaCategory = 'LLM' | 'Vision' | 'Infra' | 'Agents' | 'Research' | 'Other';

export interface Idea {
  id: string;
  clubId: string;
  title: string;
  problemStatement: string;
  proposedAiUsage: string;
  submittedBy: {
    uid: string;
    displayName: string;
  };
  status: IdeaStatus;
  category: IdeaCategory;
  voteScore: number;
  votesIn: number;
  votesOut: number;
  trendingVelocity: number;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  meetingId?: string;
  aiDraftId?: string;
  tags: string[];
}

export interface IdeaFirestore extends Omit<Idea, 'createdAt' | 'updatedAt' | 'reviewedAt'> {
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
  reviewedAt?: { seconds: number; nanoseconds: number };
}

export interface IdeaInput {
  title: string;
  problemStatement: string;
  proposedAiUsage: string;
  category: IdeaCategory;
  tags?: string[];
  clubId: string;
}

// Comment Types
export interface Comment {
  id: string;
  ideaId: string;
  uid: string;
  displayName: string;
  text: string;
  createdAt: Date;
}

export interface CommentFirestore extends Omit<Comment, 'createdAt'> {
  createdAt: { seconds: number; nanoseconds: number };
}

// Vote Types
export type VoteType = 'in' | 'out';

export interface Vote {
  id: string;
  ideaId: string;
  uid: string;
  vote: VoteType;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoteFirestore extends Omit<Vote, 'createdAt' | 'updatedAt'> {
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}

// Tech Feed Types
export type TechFeedCategory = 'LLM' | 'Vision' | 'Infra' | 'Agents' | 'Research' | 'Industry' | 'Tools';

export interface TechFeedItem {
  id: string;
  clubId?: string; // Optional for global feeds, or required if club-specific
  title: string;
  summary: string;
  sourceUrl: string;
  category: TechFeedCategory;
  publishedAt: Date;
  ingestedAt: Date;
  sourceName: string;
}

export interface TechFeedItemFirestore extends Omit<TechFeedItem, 'publishedAt' | 'ingestedAt'> {
  publishedAt: { seconds: number; nanoseconds: number };
  ingestedAt: { seconds: number; nanoseconds: number };
}

// Meeting Types
export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  ideaId: string;
  scheduledAt: Date;
  organizerId: string;
  attendees: string[];
  status: MeetingStatus;
  agenda?: string;
  notes?: string;
  createdAt: Date;
}

export interface MeetingFirestore extends Omit<Meeting, 'scheduledAt' | 'createdAt'> {
  scheduledAt: { seconds: number; nanoseconds: number };
  createdAt: { seconds: number; nanoseconds: number };
}

export type MeetingRoomId = 'room-1' | 'room-2' | 'room-3' | 'room-4';

export interface MeetingRoom {
  id: string;
  clubId: string;
  roomId: MeetingRoomId;
  activeMeetingId?: string;
  updatedAt: Date;
}

export interface MeetingJoinRequest {
  id: string;
  meetingId: string;
  clubId: string;
  uid: string;
  displayName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  decidedBy?: string;
  decidedAt?: Date;
}

export interface MeetingPresence {
  id: string;
  meetingId: string;
  uid: string;
  displayName: string;
  lastActiveAt: Date;
  cursor?: { index: number; length: number };
}

export type MeetingSessionStatus = 'active' | 'ended';

export interface MeetingSession {
  id: string;
  clubId: string;
  roomId: MeetingRoomId;
  status: MeetingSessionStatus;
  createdBy: string;
  startedAt: Date;
  endedAt?: Date;
  attendees: string[];
}

export interface MeetingSessionFirestore extends Omit<MeetingSession, 'startedAt' | 'endedAt'> {
  startedAt: { seconds: number; nanoseconds: number };
  endedAt?: { seconds: number; nanoseconds: number };
}

export interface MeetingBoard {
  id: string;
  meetingId: string;
  delta: unknown;
  updatedAt: Date;
}

export interface MeetingBoardFirestore extends Omit<MeetingBoard, 'updatedAt'> {
  updatedAt: { seconds: number; nanoseconds: number };
}

// Real-time collaborative operation for meeting board
export interface MeetingBoardOp {
  id: string;
  meetingId: string;
  delta: any; // Quill Delta (change only, not full content)
  uid: string;
  displayName: string;
  createdAt: Date;
}

export interface MeetingBoardOpFirestore extends Omit<MeetingBoardOp, 'createdAt'> {
  createdAt: { seconds: number; nanoseconds: number };
}

export interface MeetingOutput {
  id: string;
  meetingId: string;
  clubId: string;
  createdAt: Date;
  modelUsed: string;
  transcript: string;
  summaryNotes: string;
  futureAgenda: string[];
  futureScopes: string[];
  promises: string[];
  attendees: string[];
  boardSnapshot?: string;
  canvasSnapshot?: string; // serialized drawing data or image reference
}

// AI Draft Types
export interface FeasibilityNotes {
  technical: string;
  operational: string;
  risks: string[];
}

export interface AIDraft {
  id: string;
  ideaId: string;
  refinedDescription: string;
  architectureOutline: string;
  discussionAgenda: string[];
  feasibilityNotes: FeasibilityNotes;
  nextSteps: string[];
  generatedAt: Date;
  modelUsed: string;
  status: 'success' | 'pending' | 'failed';
}

export interface AIDraftFirestore extends Omit<AIDraft, 'generatedAt'> {
  generatedAt: { seconds: number; nanoseconds: number };
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Config Types
export interface AppConfig {
  voteThreshold: number;
  controversialThreshold: number;
  stalledDaysThreshold: number;
}

// ==========================================
// Module 1: Communication & Discussions
// ==========================================

export type ChannelType = 'text' | 'announcement';

export interface Channel {
  id: string;
  clubId: string;
  name: string;
  description: string;
  type: ChannelType;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ChannelFirestore extends Omit<Channel, 'createdAt' | 'updatedAt'> {
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}

export type MessageType = 'text' | 'poll';

export interface MessageReaction {
  emoji: string;
  users: string[]; // array of user IDs who reacted with this emoji
}

export interface MessageAttachment {
  type: 'image' | 'file' | 'link' | 'onedrive';
  url: string;
  name: string;
  size?: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of user IDs
}

export interface PollData {
  question: string;
  allowMultiple: boolean;
  options: PollOption[];
  closed: boolean;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  clubId: string;
  uid: string;
  displayName: string;
  content: string; // Plain text or Fallback
  richText?: string; // HTML from React Quill
  type: MessageType;
  pollData?: PollData;
  mentions: string[]; // array of uids or roles mentioned
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  replyCount: number;
  threadId?: string; // If this is a reply, the ID of the parent message
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
}

export interface ChatMessageFirestore extends Omit<ChatMessage, 'createdAt' | 'updatedAt'> {
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}
// ==========================================
// Module 2: Project Collaboration
// ==========================================

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';

export interface Project {
  id: string;
  clubId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  leadId: string;
  members: string[]; // array of user IDs
  startDate: Date;
  targetDate?: Date;
  completedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  githubUrl?: string;
  driveUrl?: string; // OneDrive link
  externalLinks?: { title: string; url: string; type: 'onedrive' | 'github' | 'other' }[];
}

export interface ProjectFirestore extends Omit<Project, 'startDate' | 'targetDate' | 'completedDate' | 'createdAt' | 'updatedAt'> {
  startDate: { seconds: number; nanoseconds: number };
  targetDate?: { seconds: number; nanoseconds: number };
  completedDate?: { seconds: number; nanoseconds: number };
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  clubId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  creatorId: string;
  dueDate?: Date;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
  order: number; // For Kanban drag-and-drop
}

export interface TaskFirestore extends Omit<Task, 'dueDate' | 'createdAt' | 'updatedAt'> {
  dueDate?: { seconds: number; nanoseconds: number };
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  targetDate: Date;
  completedDate?: Date;
  isCompleted: boolean;
  order: number;
}

export interface MilestoneFirestore extends Omit<Milestone, 'targetDate' | 'completedDate'> {
  targetDate: { seconds: number; nanoseconds: number };
  completedDate?: { seconds: number; nanoseconds: number };
}
// Notification Types
export type NotificationType = 'club_invite' | 'team_invite' | 'system_alert' | 'idea_update' | 'new_event' | 'new_wiki' | 'new_idea';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  clubId?: string;
  teamId?: string;
  actionUrl?: string; // e.g., /notifications?accept=xyz
  metadata?: {
    ideaId?: string;
    articleId?: string;
    meetingId?: string;
    eventId?: string;
    teamId?: string;
  };
}

export interface NotificationFirestore extends Omit<Notification, 'createdAt'> {
  createdAt: { seconds: number; nanoseconds: number };
}

// ==========================================
// Module 2 Additions: Canvas & Wiki History
// ==========================================

export interface CanvasPath {
  tool: 'pencil' | 'eraser';
  path: { x: number; y: number }[];
  color: string;
}

export interface ProjectCanvas {
  id: string; // same as projectId
  projectId: string;
  paths: CanvasPath[];
  updatedAt: Date;
}

export interface ProjectCanvasFirestore extends Omit<ProjectCanvas, 'updatedAt'> {
  updatedAt: { seconds: number; nanoseconds: number };
}

export interface MeetingCanvas {
  id: string; // same as meetingId
  meetingId: string;
  paths: CanvasPath[];
  updatedAt: Date;
}

export interface MeetingCanvasFirestore extends Omit<MeetingCanvas, 'updatedAt'> {
  updatedAt: { seconds: number; nanoseconds: number };
}

export interface WikiVersion {
  id: string; // auto-generated
  articleId: string; // references wiki_articles
  content: string; // full markdown content snapshot
  authorId: string;
  authorName: string;
  createdAt: Date; // timestamp of version capture
}

export interface WikiVersionFirestore extends Omit<WikiVersion, 'createdAt'> {
  createdAt: { seconds: number; nanoseconds: number };
}

// ==========================================
// Video Conferencing Types (WebRTC)
// ==========================================

export interface VideoParticipant {
  uid: string;
  displayName: string;
  hasVideo: boolean;
  hasAudio: boolean;
  isScreenSharing: boolean;
  joinedAt: number;
}

export interface VideoRoom {
  id: string;
  meetingId: string;
  participants: Record<string, VideoParticipant>;
  createdAt: number;
}

export interface RTCSignal {
  type: 'offer' | 'answer' | 'candidate';
  from: string;
  to: string;
  data: any;
  timestamp: number;
}

// ==========================================
// Teams/Slack Integration Types
// ==========================================

export interface IntegrationNotificationConfig {
  meetingStarted: boolean;
  meetingEnded: boolean;
  newIdea: boolean;
  ideaApproved: boolean;
  ideaRejected: boolean;
}

export interface IntegrationSettings {
  id: string;
  clubId: string;
  teamsWebhookUrl?: string;
  slackWebhookUrl?: string;
  notifications: IntegrationNotificationConfig;
  updatedAt: Date;
  updatedBy: string;
}

export interface IntegrationSettingsFirestore extends Omit<IntegrationSettings, 'updatedAt'> {
  updatedAt: { seconds: number; nanoseconds: number };
}

// ==========================================
// Calendar Integration Types
// ==========================================

export type CalendarProvider = 'google';

export interface CalendarIntegration {
  id: string;
  userId: string;
  provider: CalendarProvider;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  calendarId: string;
  syncEnabled: boolean;
  connectedAt: Date;
}

export interface CalendarIntegrationFirestore extends Omit<CalendarIntegration, 'tokenExpiry' | 'connectedAt'> {
  tokenExpiry: { seconds: number; nanoseconds: number };
  connectedAt: { seconds: number; nanoseconds: number };
}
