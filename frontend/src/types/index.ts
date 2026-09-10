
import type { Locale } from '@/i18n/config';

export type Role = 'user' | 'manager' | 'admin';

export type ContentType = 'video' | 'audio' | 'pdf' | 'slides' | 'text';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type EnrollmentStatus = 'not_started' | 'in_progress' | 'completed';
export type DurationBucket = 'short' | 'medium' | 'long';

export type Accent = 'primary' | 'brand' | 'violet' | 'emerald' | 'amber' | 'rose';

export interface Department {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  accent: Accent;
  description?: string;
  order: number;
  courseCount?: number;
}

export interface UserStats {
  coursesInProgress: number;
  coursesCompleted: number;
  certificates: number;
  learningHours: number;
  avgQuizScore: number;
  streakDays: number;
  points: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: Role;
  jobTitle: string;
  departmentId: string;
  location?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string | null;
  language: Locale;
  emailNotifications: boolean;
  active: boolean;
  createdAt: string;
  stats: UserStats;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  departmentId?: string;
}

export interface Session {
  user: User;
  token: string;
  issuedAt: string;
}

// On-net / Off-net access mode (spec 2.6.2). On-net = inside the internal Icosnet
// network; off-net = secured external access (VPN / controlled access).
export type AccessMode = 'on_net' | 'off_net';

export interface NetworkStatus {
  mode: AccessMode;
  onNet: boolean;
  demo: boolean;
}

export interface ResetPasswordPayload {
  password: string;
  email?: string;
  uid?: string;
  token?: string;
}

export type ProfileUpdate = Partial<
  Pick<
    User,
    | 'firstName'
    | 'lastName'
    | 'jobTitle'
    | 'phone'
    | 'location'
    | 'bio'
    | 'avatarUrl'
    | 'language'
    | 'emailNotifications'
  >
>;


export interface AdminUserInput {
  email?: string;
  firstName: string;
  lastName: string;
  role: Role;
  departmentId?: string | null;
  managerId?: string | null;
  jobTitle?: string;
  language?: Locale;
  active?: boolean;
  password?: string;
}

export interface AdminUserFilters {
  search?: string;
  role?: Role;
  department?: string;
  active?: boolean;
  ordering?: string;
  page?: number;
  pageSize?: number;
}

export interface UserImportError {
  row: number;
  email: string;
  messages: string[];
}

export interface UserImportReport {
  total: number;
  created: number;
  updated: number;
  errors: UserImportError[];
}

export interface DownloadFile {
  blob: Blob;
  filename: string;
}


export type CourseAudience = 'open' | 'general' | 'department';

export interface CourseInput {
  title: string;
  summary: string;
  description?: string;
  objectives?: string[];
  categoryId?: string | null;
  level: CourseLevel;
  primaryFormat: ContentType;
  durationMinutes: number;
  mandatory: boolean;
  published: boolean;
  issuesCertificate?: boolean;
  internalOnly?: boolean;
  audience?: CourseAudience;
  departmentId?: string | null;
  prerequisiteIds?: string[];
  language?: string;
  sequentialUnlock?: boolean;
}

export interface ModuleInput {
  courseId: string;
  title: string;
  summary?: string;
  order: number;
}

export interface LessonInput {
  moduleId: string;
  title: string;
  type: ContentType;
  externalUrl?: string;
  richText?: string;
  durationMinutes: number;
  order: number;
  isPreview: boolean;
  file?: File | null;
}

export interface ResourceInput {
  courseId: string;
  title: string;
  externalUrl?: string;
  file?: File | null;
}

export type QuizScope = 'course' | 'module';

export interface AnswerInput {
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface QuestionInput {
  text: string;
  type: QuestionType;
  points: number;
  order: number;
  answers: AnswerInput[];
}

export interface QuizInput {
  courseId?: string | null;
  moduleId?: string | null;
  title: string;
  description?: string;
  passScore: number;
  maxAttempts: number;
  published: boolean;
  questions: QuestionInput[];
  shuffleQuestions?: boolean;
  revealAnswers?: boolean;
}

export interface AdminAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface AdminQuestion {
  id: string;
  text: string;
  type: QuestionType;
  points: number;
  order: number;
  answers: AdminAnswer[];
}

export interface AdminQuiz {
  id: string;
  courseId: string | null;
  moduleId: string | null;
  title: string;
  description: string;
  passScore: number;
  maxAttempts: number;
  published: boolean;
  scope: QuizScope;
  questionCount: number;
  questions: AdminQuestion[];
}


export interface AssignableUser {
  id: string;
  name: string;
  email: string;
}

export interface AssignmentInput {
  userId: string;
  courseId: string;
  dueDate?: string | null;
  note?: string;
}

export interface Assignment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  department: string | null;
  course: EnrollmentCourse;
  assignedById: string | null;
  assignedByName: string | null;
  dueDate: string | null;
  note: string;
  createdAt: string;
  status: EnrollmentStatus;
  progress: number;
}

export interface ReportFilters {
  department?: string;
  course?: string;
  status?: EnrollmentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportRow {
  userName: string;
  userEmail: string;
  department: string;
  courseTitle: string;
  courseSlug: string;
  status: EnrollmentStatus;
  progress: number;
  enrolledAt: string;
  completedAt: string;
}

export interface ReportResult {
  count: number;
  rows: ReportRow[];
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetRepr: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}


export interface AnalyticsUsers {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<Role, number>;
}

export interface AnalyticsCourses {
  total: number;
  published: number;
  draft: number;
  mandatory: number;
}

export interface AnalyticsEnrollments {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
}

export interface TopCourse {
  title: string;
  slug: string;
  enrollments: number;
  completed: number;
  completionRate: number;
}

export interface CategoryStat {
  name: string;
  accent: Accent;
  courses: number;
  enrollments: number;
}

export interface AdminAnalytics {
  users: AnalyticsUsers;
  courses: AnalyticsCourses;
  enrollments: AnalyticsEnrollments;
  certificates: number;
  avgQuizScore: number;
  topCourses: TopCourse[];
  categoryBreakdown: CategoryStat[];
}


export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  summary: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryAccent: Accent | null;
  level: CourseLevel;
  primaryFormat: ContentType;
  durationMinutes: number;
  mandatory: boolean;
  published: boolean;
  issuesCertificate?: boolean;
  internalOnly?: boolean;
  audience?: CourseAudience;
  departmentId?: string | null;
  departmentName?: string | null;
  thumbnailUrl: string | null;
  authorId: string | null;
  authorName: string | null;
  moduleCount: number;
  lessonCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: ContentType;
  durationMinutes: number;
  order: number;
  isPreview: boolean;
  fileUrl: string | null;
  fileName?: string | null;
  externalUrl: string;
  richText: string;
}

export interface Module {
  id: string;
  title: string;
  summary: string;
  order: number;
  lessonCount: number;
  lessons: Lesson[];
}

export interface CourseResource {
  id: string;
  title: string;
  fileUrl: string | null;
  externalUrl: string;
}

export interface CoursePrerequisite {
  id: string;
  title: string;
  slug: string;
  level: CourseLevel;
  durationMinutes: number;
}

export interface CourseDetail extends CourseSummary {
  description: string;
  objectives: string[];
  modules: Module[];
  resources: CourseResource[];
  prerequisites: CoursePrerequisite[];
  quizzes: QuizRef[];
}

/** Anonymous glimpse of the library shown on the public landing page. */
export interface LandingPreviewCourse {
  title: string;
  category: string | null;
  accent: Accent;
  formats: ContentType[];
}

export interface LandingPreview {
  categories: string[];
  courses: LandingPreviewCourse[];
  path: string | null;
}

export interface CourseFilters {
  search?: string;
  category?: string;
  level?: CourseLevel;
  contentType?: ContentType;
  duration?: DurationBucket;
  mandatory?: boolean;
  ordering?: string;
  page?: number;
  pageSize?: number;
  mine?: boolean;
}

export interface Paginated<T> {
  count: number;
  page: number;
  pages: number;
  pageSize: number;
  results: T[];
}


export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  resumePositionSeconds: number;
  timeSpentSeconds: number;
  completedAt?: string | null;
}

export interface EnrollmentCourse {
  id: string;
  title: string;
  slug: string;
  summary: string;
  level: CourseLevel;
  primaryFormat: ContentType;
  durationMinutes: number;
  mandatory: boolean;
  thumbnailUrl: string | null;
  categoryName: string | null;
  categoryAccent: Accent | null;
  moduleCount: number;
  lessonCount: number;
}

export interface Enrollment {
  id: string;
  status: EnrollmentStatus;
  progress: number;
  enrolledAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  lastLessonId: string | null;
  course: EnrollmentCourse;
  lessonProgress: LessonProgress[];
}

export interface LessonProgressInput {
  resumePositionSeconds?: number;
  timeSpentSeconds?: number;
  completed?: boolean;
}

export type QuestionType = 'single' | 'multiple' | 'true_false' | 'dropdown';

export interface QuizRef {
  id: string;
  title: string;
  description: string;
  passScore: number;
  maxAttempts: number;
  questionCount: number;
  scope: 'course' | 'module';
  moduleId: string | null;
}

export interface QuizAnswer {
  id: string;
  text: string;
  order: number;
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: QuestionType;
  order: number;
  points: number;
  answers: QuizAnswer[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  passScore: number;
  maxAttempts: number;
  courseSlug: string | null;
  attemptsUsed: number;
  attemptsLeft: number | null;
  questions: QuizQuestion[];
}

export type QuizResponses = Record<string, number[]>;

export interface QuizReviewItem {
  questionId: string;
  correct: boolean;
  correctAnswerIds: string[];
  selectedAnswerIds: string[];
}

export interface QuizAttemptResult {
  id: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  submittedAt: string;
  review: QuizReviewItem[] | null;
}

export interface Certificate {
  id: string;
  code: string;
  holderName: string;
  courseTitle: string;
  courseSlug: string | null;
  issuedAt: string;
  isValid: boolean;
}

export interface VerifyResult {
  valid: boolean;
  code: string;
  holderName?: string;
  courseTitle?: string;
  issuedAt?: string;
}


export interface CommentReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface Comment {
  id: string;
  courseSlug: string;
  lessonId: string | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorRole: Role;
  parentId: string | null;
  body: string;
  isHidden: boolean;
  reactions: CommentReaction[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentInput {
  courseSlug: string;
  body: string;
  lessonId?: string | null;
  parentId?: string | null;
}

export interface Feedback {
  id: string;
  courseSlug: string;
  rating: number;
  comment: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseFeedback {
  average: number;
  count: number;
  mine: Feedback | null;
  results: Feedback[];
}

export interface FeedbackInput {
  rating: number;
  comment?: string;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  accent: Accent;
  points: number;
  order: number;
  earned: boolean;
  earnedAt: string | null;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  department: string | null;
  points: number;
  badges: number;
  isMe: boolean;
}

export type LeaderboardScope = 'all' | 'department';

export interface Leaderboard {
  results: LeaderboardRow[];
  me: LeaderboardRow;
  scope: LeaderboardScope;
}

export interface ChatRoom {
  id: string;
  slug: string;
  name: string;
  description: string;
  isActive: boolean;
  messageCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomSlug: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorRole: Role;
  body: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface RoomConnection {
  send: (body: string) => void;
  remove: (messageId: string) => void;
  close: () => void;
}

export interface RoomHandlers {
  onMessage: (message: ChatMessage) => void;
  onDeleted: (messageId: string) => void;
  onError?: (code: string) => void;
}

export type NotificationType =
  | 'enrollment'
  | 'certificate'
  | 'badge'
  | 'comment_reply'
  | 'new_course'
  | 'reminder'
  | 'deadline';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  isRead: boolean;
  createdAt: string;
}


export interface DashboardStats extends UserStats {
  mandatoryRemaining: number;
}

export interface MandatoryItem {
  course: EnrollmentCourse;
  status: EnrollmentStatus;
  progress: number;
  enrolled: boolean;
}

export interface AssignedItem {
  course: EnrollmentCourse;
  status: EnrollmentStatus;
  progress: number;
  enrolled: boolean;
  dueDate: string | null;
  assignedBy: string | null;
}

export interface TeamAssignment {
  id: string;
  userName: string;
  userEmail: string;
  course: EnrollmentCourse;
  status: EnrollmentStatus;
  progress: number;
  dueDate: string | null;
  overdue: boolean;
}

export interface TeamCounts {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface TeamOverview {
  assignments: TeamAssignment[];
  counts: TeamCounts;
}

export interface LearnerDashboard {
  stats: DashboardStats;
  continueLearning: Enrollment[];
  mandatory: MandatoryItem[];
  assigned: AssignedItem[];
  /** Manager/admin only — what they assigned to other people. Null for learners. */
  team: TeamOverview | null;
  recommendations: CourseSummary[];
  recentCertificates: Certificate[];
}


export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  language: 'fr' | 'en';
  order: number;
  published: boolean;
  updatedAt: string;
}

export interface FaqInput {
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  language?: 'fr' | 'en';
  order?: number;
  published: boolean;
}

export type AssistantIntent = 'faq' | 'personal' | 'fallback' | 'rag' | 'greeting';

export interface AssistantSource {
  id: string;
  /** Display label — the FAQ question, or the cited document/course title for RAG. */
  question: string;
  /** RAG citation link (course, help page…); absent on keyword-FAQ sources. */
  url?: string;
}

export interface AssistantReply {
  answer: string;
  intent: AssistantIntent;
  sources: AssistantSource[];
  suggestions: string[];
  /** True when the AI backend was unavailable and the offline keyword engine answered. */
  offline: boolean;
}

/** A prior conversation turn, sent with the next question so follow-ups keep context. */
export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  intent?: AssistantIntent;
  sources?: AssistantSource[];
  suggestions?: string[];
  /** True when this answer came from the offline keyword engine (AI backend down). */
  offline?: boolean;
}

export class ServiceError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'ServiceError';
    this.code = code;
  }
}
