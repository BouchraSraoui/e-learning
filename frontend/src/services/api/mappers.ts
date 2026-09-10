import type {
  Accent,
  AdminAnalytics,
  AdminQuiz,
  AdminUserInput,
  AppNotification,
  AssistantIntent,
  AssistantReply,
  Assignment,
  AuditEntry,
  Badge,
  FaqEntry,
  FaqInput,
  CourseInput,
  ModuleInput,
  QuizInput,
  ReportRow,
  Category,
  Certificate,
  ChatMessage,
  ChatRoom,
  Comment,
  ContentType,
  CourseAudience,
  CourseDetail,
  CourseFeedback,
  CourseLevel,
  CoursePrerequisite,
  CourseResource,
  CourseSummary,
  DashboardStats,
  Department,
  Enrollment,
  EnrollmentCourse,
  EnrollmentStatus,
  Feedback,
  AssignedItem,
  LearnerDashboard,
  Leaderboard,
  LeaderboardRow,
  MandatoryItem,
  Lesson,
  LessonProgress,
  Module,
  NotificationType,
  Paginated,
  Quiz,
  QuizAnswer,
  QuizAttemptResult,
  QuizQuestion,
  QuizRef,
  QuizReviewItem,
  QuestionType,
  Role,
  TeamAssignment,
  TeamOverview,
  User,
  UserImportReport,
  VerifyResult,
} from '@/types';


interface ApiStats {
  courses_in_progress?: number;
  courses_completed?: number;
  certificates?: number;
  learning_hours?: number;
  avg_quiz_score?: number;
  streak_days?: number;
  points?: number;
}

export interface ApiUser {
  id: number | string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role: User['role'];
  department?: number | string | null;
  department_name?: string | null;
  job_title?: string;
  phone?: string;
  location?: string;
  bio?: string;
  avatar?: string | null;
  language?: User['language'];
  email_notifications?: boolean;
  is_active?: boolean;
  date_joined?: string;
  stats?: ApiStats;
}

export function mapUser(u: ApiUser): User {
  const s = u.stats ?? {};
  return {
    id: String(u.id),
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    fullName: u.full_name ?? `${u.first_name} ${u.last_name}`.trim(),
    role: u.role,
    jobTitle: u.job_title ?? '',
    departmentId: u.department != null ? String(u.department) : '',
    location: u.location ?? '',
    phone: u.phone ?? '',
    bio: u.bio ?? '',
    avatarUrl: u.avatar ?? null,
    language: u.language ?? 'fr',
    emailNotifications: u.email_notifications ?? true,
    active: u.is_active ?? true,
    createdAt: u.date_joined ?? new Date().toISOString(),
    stats: {
      coursesInProgress: s.courses_in_progress ?? 0,
      coursesCompleted: s.courses_completed ?? 0,
      certificates: s.certificates ?? 0,
      learningHours: s.learning_hours ?? 0,
      avgQuizScore: s.avg_quiz_score ?? 0,
      streakDays: s.streak_days ?? 0,
      points: s.points ?? 0,
    },
  };
}

export function mapDepartment(d: { id: number | string; name: string }): Department {
  return { id: String(d.id), name: d.name };
}


export function toAdminUserPayload(input: AdminUserInput): Record<string, unknown> {
  const out: Record<string, unknown> = {
    first_name: input.firstName,
    last_name: input.lastName,
    role: input.role,
  };
  if (input.email !== undefined) out.email = input.email;
  if (input.departmentId !== undefined) out.department = input.departmentId || null;
  if (input.managerId !== undefined) out.manager = input.managerId || null;
  if (input.jobTitle !== undefined) out.job_title = input.jobTitle;
  if (input.language !== undefined) out.language = input.language;
  if (input.active !== undefined) out.is_active = input.active;
  if (input.password) out.password = input.password;
  return out;
}

interface ApiImportReport {
  total: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; email: string; messages: string[] }>;
}

export function mapImportReport(r: ApiImportReport): UserImportReport {
  return {
    total: r.total,
    created: r.created,
    updated: r.updated,
    errors: (r.errors ?? []).map((e) => ({
      row: e.row,
      email: e.email,
      messages: e.messages,
    })),
  };
}


export function toCoursePayload(input: CourseInput): Record<string, unknown> {
  const out: Record<string, unknown> = {
    title: input.title,
    summary: input.summary,
    level: input.level,
    primary_format: input.primaryFormat,
    duration_minutes: input.durationMinutes,
    is_mandatory: input.mandatory,
    is_published: input.published,
  };
  if (input.description !== undefined) out.description = input.description;
  if (input.objectives !== undefined) out.objectives = input.objectives;
  if (input.issuesCertificate !== undefined) out.issues_certificate = input.issuesCertificate;
  if (input.internalOnly !== undefined) out.internal_only = input.internalOnly;
  if (input.audience !== undefined) out.audience = input.audience;
  if (input.departmentId !== undefined) out.department = input.departmentId || null;
  if (input.language !== undefined) out.language = input.language;
  if (input.sequentialUnlock !== undefined) out.sequential_unlock = input.sequentialUnlock;
  if (input.categoryId !== undefined) out.category = input.categoryId || null;
  if (input.prerequisiteIds !== undefined) out.prerequisites = input.prerequisiteIds.map(Number);
  return out;
}

export function toModulePayload(input: ModuleInput): Record<string, unknown> {
  return {
    course: Number(input.courseId),
    title: input.title,
    summary: input.summary ?? '',
    order: input.order,
  };
}

export function toQuizPayload(input: QuizInput): Record<string, unknown> {
  return {
    course: input.courseId ? Number(input.courseId) : null,
    module: input.moduleId ? Number(input.moduleId) : null,
    title: input.title,
    description: input.description ?? '',
    pass_score: input.passScore,
    max_attempts: input.maxAttempts,
    is_published: input.published,
    shuffle_questions: input.shuffleQuestions ?? false,
    reveal_answers: input.revealAnswers ?? false,
    questions: input.questions.map((q) => ({
      text: q.text,
      type: q.type,
      points: q.points,
      order: q.order,
      answers: q.answers.map((a) => ({ text: a.text, is_correct: a.isCorrect, order: a.order })),
    })),
  };
}

interface ApiAdminAnswer {
  id: number | string;
  text: string;
  is_correct: boolean;
  order: number;
}

interface ApiAdminQuestion {
  id: number | string;
  text: string;
  type: QuestionType;
  points: number;
  order: number;
  answers: ApiAdminAnswer[];
}

interface ApiAdminQuiz {
  id: number | string;
  course?: number | string | null;
  module?: number | string | null;
  title: string;
  description?: string;
  pass_score: number;
  max_attempts: number;
  is_published: boolean;
  scope: 'course' | 'module';
  question_count: number;
  questions: ApiAdminQuestion[];
}


interface ApiAssignment {
  id: number | string;
  user: number | string;
  user_name: string;
  user_email: string;
  department?: string | null;
  course: ApiEnrollmentCourse;
  assigned_by?: number | string | null;
  assigned_by_name?: string | null;
  due_date?: string | null;
  note?: string;
  created_at: string;
  status: EnrollmentStatus;
  progress: number;
}

export function mapAssignment(a: ApiAssignment): Assignment {
  return {
    id: String(a.id),
    userId: String(a.user),
    userName: a.user_name,
    userEmail: a.user_email,
    department: a.department ?? null,
    course: mapEnrollmentCourse(a.course),
    assignedById: a.assigned_by != null ? String(a.assigned_by) : null,
    assignedByName: a.assigned_by_name ?? null,
    dueDate: a.due_date ?? null,
    note: a.note ?? '',
    createdAt: a.created_at,
    status: a.status,
    progress: a.progress,
  };
}

interface ApiReportRow {
  user_name: string;
  user_email: string;
  department: string;
  course_title: string;
  course_slug: string;
  status: EnrollmentStatus;
  progress: number;
  enrolled_at: string;
  completed_at: string;
}

export function mapReportRow(r: ApiReportRow): ReportRow {
  return {
    userName: r.user_name,
    userEmail: r.user_email,
    department: r.department,
    courseTitle: r.course_title,
    courseSlug: r.course_slug,
    status: r.status,
    progress: r.progress,
    enrolledAt: r.enrolled_at,
    completedAt: r.completed_at,
  };
}

interface ApiAuditEntry {
  id: number | string;
  actor?: number | string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  action: string;
  target_type?: string;
  target_repr?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export function mapAuditEntry(a: ApiAuditEntry): AuditEntry {
  return {
    id: String(a.id),
    actorId: a.actor != null ? String(a.actor) : null,
    actorName: a.actor_name ?? null,
    actorEmail: a.actor_email ?? null,
    action: a.action,
    targetType: a.target_type ?? '',
    targetRepr: a.target_repr ?? '',
    metadata: a.metadata ?? {},
    createdAt: a.created_at,
  };
}

interface ApiAnalytics {
  users: { total: number; active: number; inactive: number; by_role: Record<string, number> };
  courses: { total: number; published: number; draft: number; mandatory: number };
  enrollments: {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    completion_rate: number;
  };
  certificates: number;
  avg_quiz_score: number;
  top_courses: Array<{
    title: string;
    slug: string;
    enrollments: number;
    completed: number;
    completion_rate: number;
  }>;
  category_breakdown: Array<{ name: string; accent: Accent; courses: number; enrollments: number }>;
}

export function mapAnalytics(a: ApiAnalytics): AdminAnalytics {
  return {
    users: {
      total: a.users.total,
      active: a.users.active,
      inactive: a.users.inactive,
      byRole: {
        user: a.users.by_role.user ?? 0,
        manager: a.users.by_role.manager ?? 0,
        admin: a.users.by_role.admin ?? 0,
      },
    },
    courses: { ...a.courses },
    enrollments: {
      total: a.enrollments.total,
      completed: a.enrollments.completed,
      inProgress: a.enrollments.in_progress,
      notStarted: a.enrollments.not_started,
      completionRate: a.enrollments.completion_rate,
    },
    certificates: a.certificates,
    avgQuizScore: a.avg_quiz_score,
    topCourses: (a.top_courses ?? []).map((c) => ({
      title: c.title,
      slug: c.slug,
      enrollments: c.enrollments,
      completed: c.completed,
      completionRate: c.completion_rate,
    })),
    categoryBreakdown: (a.category_breakdown ?? []).map((c) => ({
      name: c.name,
      accent: c.accent,
      courses: c.courses,
      enrollments: c.enrollments,
    })),
  };
}

export function mapAdminQuiz(q: ApiAdminQuiz): AdminQuiz {
  return {
    id: String(q.id),
    courseId: q.course != null ? String(q.course) : null,
    moduleId: q.module != null ? String(q.module) : null,
    title: q.title,
    description: q.description ?? '',
    passScore: q.pass_score,
    maxAttempts: q.max_attempts,
    published: q.is_published,
    scope: q.scope,
    questionCount: q.question_count,
    questions: (q.questions ?? []).map((qu) => ({
      id: String(qu.id),
      text: qu.text,
      type: qu.type,
      points: qu.points,
      order: qu.order,
      answers: (qu.answers ?? []).map((a) => ({
        id: String(a.id),
        text: a.text,
        isCorrect: a.is_correct,
        order: a.order,
      })),
    })),
  };
}


export interface ApiCategory {
  id: number | string;
  name: string;
  slug: string;
  accent: Accent;
  description?: string;
  order?: number;
  course_count?: number;
}

export function mapCategory(c: ApiCategory): Category {
  return {
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    accent: c.accent,
    description: c.description ?? '',
    order: c.order ?? 0,
    courseCount: c.course_count,
  };
}

interface ApiCourseSummary {
  id: number | string;
  title: string;
  slug: string;
  summary: string;
  category?: number | string | null;
  category_name?: string | null;
  category_accent?: Accent | null;
  level: CourseLevel;
  primary_format: ContentType;
  duration_minutes: number;
  is_mandatory: boolean;
  is_published: boolean;
  issues_certificate?: boolean;
  internal_only?: boolean;
  audience?: CourseAudience;
  department?: number | string | null;
  department_name?: string | null;
  thumbnail?: string | null;
  author?: number | string | null;
  author_name?: string | null;
  module_count?: number;
  lesson_count?: number;
  created_at: string;
  updated_at: string;
}

export function mapCourseSummary(c: ApiCourseSummary): CourseSummary {
  return {
    id: String(c.id),
    title: c.title,
    slug: c.slug,
    summary: c.summary,
    categoryId: c.category != null ? String(c.category) : null,
    categoryName: c.category_name ?? null,
    categoryAccent: c.category_accent ?? null,
    level: c.level,
    primaryFormat: c.primary_format,
    durationMinutes: c.duration_minutes,
    mandatory: c.is_mandatory,
    published: c.is_published,
    issuesCertificate: c.issues_certificate ?? true,
    internalOnly: c.internal_only ?? false,
    audience: c.audience ?? 'open',
    departmentId: c.department != null ? String(c.department) : null,
    departmentName: c.department_name ?? null,
    thumbnailUrl: c.thumbnail ?? null,
    authorId: c.author != null ? String(c.author) : null,
    authorName: c.author_name ?? null,
    moduleCount: c.module_count ?? 0,
    lessonCount: c.lesson_count ?? 0,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

interface ApiLesson {
  id: number | string;
  title: string;
  content_type: ContentType;
  duration_minutes: number;
  order: number;
  is_preview: boolean;
  file?: string | null;
  file_name?: string | null;
  external_url?: string;
  rich_text?: string;
}

function mapLesson(l: ApiLesson): Lesson {
  return {
    id: String(l.id),
    title: l.title,
    type: l.content_type,
    durationMinutes: l.duration_minutes,
    order: l.order,
    isPreview: l.is_preview,
    fileUrl: l.file ?? null,
    fileName: l.file_name ?? null,
    externalUrl: l.external_url ?? '',
    richText: l.rich_text ?? '',
  };
}

interface ApiModule {
  id: number | string;
  title: string;
  summary?: string;
  order: number;
  lesson_count?: number;
  lessons?: ApiLesson[];
}

function mapModule(m: ApiModule): Module {
  return {
    id: String(m.id),
    title: m.title,
    summary: m.summary ?? '',
    order: m.order,
    lessonCount: m.lesson_count ?? m.lessons?.length ?? 0,
    lessons: (m.lessons ?? []).map(mapLesson),
  };
}

interface ApiResource {
  id: number | string;
  title: string;
  file?: string | null;
  external_url?: string;
}

function mapResource(r: ApiResource): CourseResource {
  return {
    id: String(r.id),
    title: r.title,
    fileUrl: r.file ?? null,
    externalUrl: r.external_url ?? '',
  };
}

interface ApiPrerequisite {
  id: number | string;
  title: string;
  slug: string;
  level: CourseLevel;
  duration_minutes: number;
}

function mapPrerequisite(p: ApiPrerequisite): CoursePrerequisite {
  return {
    id: String(p.id),
    title: p.title,
    slug: p.slug,
    level: p.level,
    durationMinutes: p.duration_minutes,
  };
}

interface ApiCourseDetail extends ApiCourseSummary {
  description?: string;
  objectives?: string[];
  modules?: ApiModule[];
  resources?: ApiResource[];
  prerequisites?: ApiPrerequisite[];
  quizzes?: ApiQuizRef[];
}

export function mapCourseDetail(c: ApiCourseDetail): CourseDetail {
  return {
    ...mapCourseSummary(c),
    description: c.description ?? '',
    objectives: c.objectives ?? [],
    modules: (c.modules ?? []).map(mapModule),
    resources: (c.resources ?? []).map(mapResource),
    prerequisites: (c.prerequisites ?? []).map(mapPrerequisite),
    quizzes: (c.quizzes ?? []).map(mapQuizRef),
  };
}

interface ApiPaginated {
  count: number;
  page: number;
  pages: number;
  page_size: number;
  results: unknown[];
}

export function mapPaginated<T>(
  data: ApiPaginated,
  mapRow: (row: never) => T,
): Paginated<T> {
  return {
    count: data.count,
    page: data.page,
    pages: data.pages,
    pageSize: data.page_size,
    results: (data.results as never[]).map(mapRow),
  };
}


interface ApiEnrollmentCourse {
  id: number | string;
  title: string;
  slug: string;
  summary: string;
  level: CourseLevel;
  primary_format: ContentType;
  duration_minutes: number;
  is_mandatory: boolean;
  thumbnail?: string | null;
  category_name?: string | null;
  category_accent?: Accent | null;
  module_count?: number;
  lesson_count?: number;
}

export function mapEnrollmentCourse(c: ApiEnrollmentCourse): EnrollmentCourse {
  return {
    id: String(c.id),
    title: c.title,
    slug: c.slug,
    summary: c.summary,
    level: c.level,
    primaryFormat: c.primary_format,
    durationMinutes: c.duration_minutes,
    mandatory: c.is_mandatory,
    thumbnailUrl: c.thumbnail ?? null,
    categoryName: c.category_name ?? null,
    categoryAccent: c.category_accent ?? null,
    moduleCount: c.module_count ?? 0,
    lessonCount: c.lesson_count ?? 0,
  };
}

interface ApiLessonProgress {
  lesson: number | string;
  completed: boolean;
  resume_position_seconds: number;
  time_spent_seconds: number;
  completed_at?: string | null;
}

function mapLessonProgress(p: ApiLessonProgress): LessonProgress {
  return {
    lessonId: String(p.lesson),
    completed: p.completed,
    resumePositionSeconds: p.resume_position_seconds,
    timeSpentSeconds: p.time_spent_seconds,
    completedAt: p.completed_at ?? null,
  };
}

interface ApiEnrollment {
  id: number | string;
  status: EnrollmentStatus;
  progress: number;
  enrolled_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  last_lesson?: number | string | null;
  course: ApiEnrollmentCourse;
  lesson_progress?: ApiLessonProgress[];
}

export function mapEnrollment(e: ApiEnrollment): Enrollment {
  return {
    id: String(e.id),
    status: e.status,
    progress: e.progress,
    enrolledAt: e.enrolled_at,
    startedAt: e.started_at ?? null,
    completedAt: e.completed_at ?? null,
    lastLessonId: e.last_lesson != null ? String(e.last_lesson) : null,
    course: mapEnrollmentCourse(e.course),
    lessonProgress: (e.lesson_progress ?? []).map(mapLessonProgress),
  };
}

interface ApiQuizRef {
  id: number | string;
  title: string;
  description?: string;
  pass_score: number;
  max_attempts: number;
  question_count: number;
  scope: 'course' | 'module';
  module?: number | string | null;
}

export function mapQuizRef(q: ApiQuizRef): QuizRef {
  return {
    id: String(q.id),
    title: q.title,
    description: q.description ?? '',
    passScore: q.pass_score,
    maxAttempts: q.max_attempts,
    questionCount: q.question_count,
    scope: q.scope,
    moduleId: q.module != null ? String(q.module) : null,
  };
}

interface ApiQuizAnswer {
  id: number | string;
  text: string;
  order: number;
}

interface ApiQuizQuestion {
  id: number | string;
  text: string;
  type: QuestionType;
  order: number;
  points: number;
  answers: ApiQuizAnswer[];
}

interface ApiQuiz {
  id: number | string;
  title: string;
  description?: string;
  pass_score: number;
  max_attempts: number;
  course_slug?: string | null;
  attempts_used: number;
  attempts_left: number | null;
  questions: ApiQuizQuestion[];
}

function mapAnswer(a: ApiQuizAnswer): QuizAnswer {
  return { id: String(a.id), text: a.text, order: a.order };
}

function mapQuestion(q: ApiQuizQuestion): QuizQuestion {
  return {
    id: String(q.id),
    text: q.text,
    type: q.type,
    order: q.order,
    points: q.points,
    answers: q.answers.map(mapAnswer),
  };
}

export function mapQuiz(q: ApiQuiz): Quiz {
  return {
    id: String(q.id),
    title: q.title,
    description: q.description ?? '',
    passScore: q.pass_score,
    maxAttempts: q.max_attempts,
    courseSlug: q.course_slug ?? null,
    attemptsUsed: q.attempts_used,
    attemptsLeft: q.attempts_left,
    questions: q.questions.map(mapQuestion),
  };
}

interface ApiReviewItem {
  question_id: number | string;
  correct: boolean;
  correct_answer_ids: Array<number | string>;
  selected_answer_ids: Array<number | string>;
}

interface ApiAttemptResult {
  id: number | string;
  attempt_number: number;
  score: number;
  passed: boolean;
  submitted_at: string;
  review?: ApiReviewItem[] | null;
}

function mapReviewItem(r: ApiReviewItem): QuizReviewItem {
  return {
    questionId: String(r.question_id),
    correct: r.correct,
    correctAnswerIds: r.correct_answer_ids.map(String),
    selectedAnswerIds: r.selected_answer_ids.map(String),
  };
}

export function mapAttemptResult(a: ApiAttemptResult): QuizAttemptResult {
  return {
    id: String(a.id),
    attemptNumber: a.attempt_number,
    score: a.score,
    passed: a.passed,
    submittedAt: a.submitted_at,
    review: a.review ? a.review.map(mapReviewItem) : null,
  };
}

interface ApiCertificate {
  id: number | string;
  code: string;
  holder_name: string;
  course_title: string;
  course_slug?: string | null;
  issued_at: string;
  is_valid: boolean;
}

export function mapCertificate(c: ApiCertificate): Certificate {
  return {
    id: String(c.id),
    code: c.code,
    holderName: c.holder_name,
    courseTitle: c.course_title,
    courseSlug: c.course_slug ?? null,
    issuedAt: c.issued_at,
    isValid: c.is_valid,
  };
}

interface ApiVerify {
  valid: boolean;
  code: string;
  holder_name?: string;
  course_title?: string;
  issued_at?: string;
}

export function mapVerify(v: ApiVerify): VerifyResult {
  return {
    valid: v.valid,
    code: v.code,
    holderName: v.holder_name,
    courseTitle: v.course_title,
    issuedAt: v.issued_at,
  };
}


interface ApiMandatoryItem {
  course: ApiEnrollmentCourse;
  status: EnrollmentStatus;
  progress: number;
  enrolled: boolean;
}

interface ApiAssignedItem extends ApiMandatoryItem {
  due_date: string | null;
  assigned_by: string | null;
}

interface ApiTeamAssignment {
  id: string;
  user_name: string;
  user_email: string;
  course: ApiEnrollmentCourse;
  status: EnrollmentStatus;
  progress: number;
  due_date: string | null;
  overdue: boolean;
}

interface ApiTeamOverview {
  assignments: ApiTeamAssignment[];
  counts: {
    total: number;
    not_started: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
}

interface ApiDashboard {
  stats: ApiStats & { mandatory_remaining?: number };
  continue_learning: unknown[];
  mandatory: ApiMandatoryItem[];
  assigned?: ApiAssignedItem[];
  team?: ApiTeamOverview | null;
  recommendations: unknown[];
  recent_certificates: unknown[];
}

function mapDashboardStats(s: ApiStats & { mandatory_remaining?: number }): DashboardStats {
  return {
    coursesInProgress: s.courses_in_progress ?? 0,
    coursesCompleted: s.courses_completed ?? 0,
    certificates: s.certificates ?? 0,
    learningHours: s.learning_hours ?? 0,
    avgQuizScore: s.avg_quiz_score ?? 0,
    streakDays: s.streak_days ?? 0,
    points: s.points ?? 0,
    mandatoryRemaining: s.mandatory_remaining ?? 0,
  };
}

function mapMandatoryItem(m: ApiMandatoryItem): MandatoryItem {
  return {
    course: mapEnrollmentCourse(m.course),
    status: m.status,
    progress: m.progress,
    enrolled: m.enrolled,
  };
}

function mapAssignedItem(a: ApiAssignedItem): AssignedItem {
  return {
    course: mapEnrollmentCourse(a.course),
    status: a.status,
    progress: a.progress,
    enrolled: a.enrolled,
    dueDate: a.due_date ?? null,
    assignedBy: a.assigned_by ?? null,
  };
}

function mapTeamAssignment(a: ApiTeamAssignment): TeamAssignment {
  return {
    id: String(a.id),
    userName: a.user_name,
    userEmail: a.user_email,
    course: mapEnrollmentCourse(a.course),
    status: a.status,
    progress: a.progress,
    dueDate: a.due_date ?? null,
    overdue: Boolean(a.overdue),
  };
}

function mapTeamOverview(t: ApiTeamOverview): TeamOverview {
  return {
    assignments: (t.assignments ?? []).map(mapTeamAssignment),
    counts: {
      total: t.counts?.total ?? 0,
      notStarted: t.counts?.not_started ?? 0,
      inProgress: t.counts?.in_progress ?? 0,
      completed: t.counts?.completed ?? 0,
      overdue: t.counts?.overdue ?? 0,
    },
  };
}

export function mapDashboard(d: ApiDashboard): LearnerDashboard {
  return {
    stats: mapDashboardStats(d.stats),
    continueLearning: (d.continue_learning as never[]).map(mapEnrollment),
    mandatory: (d.mandatory ?? []).map(mapMandatoryItem),
    assigned: (d.assigned ?? []).map(mapAssignedItem),
    team: d.team ? mapTeamOverview(d.team) : null,
    recommendations: (d.recommendations as never[]).map(mapCourseSummary),
    recentCertificates: (d.recent_certificates as never[]).map(mapCertificate),
  };
}


interface ApiComment {
  id: number | string;
  course: string;
  lesson?: number | string | null;
  author: number | string;
  author_name: string;
  author_avatar?: string | null;
  author_role: Role;
  parent?: number | string | null;
  body: string;
  is_hidden: boolean;
  reactions?: Array<{ emoji: string; count: number; reacted: boolean }>;
  created_at: string;
  updated_at: string;
}

export function mapComment(c: ApiComment): Comment {
  return {
    id: String(c.id),
    courseSlug: c.course,
    lessonId: c.lesson != null ? String(c.lesson) : null,
    authorId: String(c.author),
    authorName: c.author_name,
    authorAvatarUrl: c.author_avatar ?? null,
    authorRole: c.author_role,
    parentId: c.parent != null ? String(c.parent) : null,
    body: c.body,
    isHidden: c.is_hidden,
    reactions: (c.reactions ?? []).map((r) => ({
      emoji: r.emoji,
      count: r.count,
      reacted: r.reacted,
    })),
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

interface ApiFeedback {
  id: number | string;
  course: string;
  rating: number;
  comment: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export function mapFeedback(f: ApiFeedback): Feedback {
  return {
    id: String(f.id),
    courseSlug: f.course,
    rating: f.rating,
    comment: f.comment,
    authorName: f.author_name,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  };
}

interface ApiCourseFeedback {
  average: number;
  count: number;
  mine?: ApiFeedback | null;
  results: ApiFeedback[];
}

export function mapCourseFeedback(d: ApiCourseFeedback): CourseFeedback {
  return {
    average: d.average,
    count: d.count,
    mine: d.mine ? mapFeedback(d.mine) : null,
    results: (d.results ?? []).map(mapFeedback),
  };
}

interface ApiBadge {
  id: number | string;
  code: string;
  name: string;
  description: string;
  icon: string;
  accent: Accent;
  points: number;
  order: number;
  earned: boolean;
  earned_at?: string | null;
}

export function mapBadge(b: ApiBadge): Badge {
  return {
    id: String(b.id),
    code: b.code,
    name: b.name,
    description: b.description,
    icon: b.icon,
    accent: b.accent,
    points: b.points,
    order: b.order,
    earned: b.earned,
    earnedAt: b.earned_at ?? null,
  };
}

interface ApiLeaderboardRow {
  rank: number;
  user_id: number | string;
  name: string;
  avatar?: string | null;
  department?: string | null;
  points: number;
  badges: number;
  is_me: boolean;
}

function mapLeaderboardRow(r: ApiLeaderboardRow): LeaderboardRow {
  return {
    rank: r.rank,
    userId: String(r.user_id),
    name: r.name,
    avatarUrl: r.avatar ?? null,
    department: r.department ?? null,
    points: r.points,
    badges: r.badges,
    isMe: r.is_me,
  };
}

interface ApiLeaderboard {
  results: ApiLeaderboardRow[];
  me: ApiLeaderboardRow;
  scope: 'all' | 'department';
}

export function mapLeaderboard(d: ApiLeaderboard): Leaderboard {
  return {
    results: (d.results ?? []).map(mapLeaderboardRow),
    me: mapLeaderboardRow(d.me),
    scope: d.scope,
  };
}

interface ApiChatRoom {
  id: number | string;
  slug: string;
  name: string;
  description?: string;
  is_active: boolean;
  message_count?: number;
  created_at: string;
}

export function mapChatRoom(r: ApiChatRoom): ChatRoom {
  return {
    id: String(r.id),
    slug: r.slug,
    name: r.name,
    description: r.description ?? '',
    isActive: r.is_active,
    messageCount: r.message_count ?? 0,
    createdAt: r.created_at,
  };
}

interface ApiChatMessage {
  id: number | string;
  room: string;
  author: number | string;
  author_name: string;
  author_avatar?: string | null;
  author_role: Role;
  body: string;
  is_deleted: boolean;
  created_at: string;
}

export function mapChatMessage(m: ApiChatMessage): ChatMessage {
  return {
    id: String(m.id),
    roomSlug: m.room,
    authorId: String(m.author),
    authorName: m.author_name,
    authorAvatarUrl: m.author_avatar ?? null,
    authorRole: m.author_role,
    body: m.body,
    isDeleted: m.is_deleted,
    createdAt: m.created_at,
  };
}

interface ApiNotification {
  id: number | string;
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  is_read: boolean;
  created_at: string;
}

export function mapNotification(n: ApiNotification): AppNotification {
  return {
    id: String(n.id),
    type: n.type,
    title: n.title,
    body: n.body,
    url: n.url,
    isRead: n.is_read,
    createdAt: n.created_at,
  };
}


interface ApiFaqEntry {
  id: number | string;
  question: string;
  answer: string;
  category?: string;
  keywords?: string[] | string;
  language?: string;
  order?: number;
  is_published: boolean;
  updated_at?: string;
}

export function mapFaqEntry(f: ApiFaqEntry): FaqEntry {
  const keywords = Array.isArray(f.keywords)
    ? f.keywords
    : typeof f.keywords === 'string'
      ? f.keywords.split(',').map((k) => k.trim()).filter(Boolean)
      : [];
  return {
    id: String(f.id),
    question: f.question,
    answer: f.answer,
    category: f.category ?? '',
    keywords,
    language: f.language === 'en' ? 'en' : 'fr',
    order: f.order ?? 0,
    published: f.is_published,
    updatedAt: f.updated_at ?? new Date().toISOString(),
  };
}

export function toFaqPayload(input: FaqInput): Record<string, unknown> {
  const out: Record<string, unknown> = {
    question: input.question,
    answer: input.answer,
    category: input.category,
    keywords: input.keywords,
    is_published: input.published,
  };
  if (input.language !== undefined) out.language = input.language;
  if (input.order !== undefined) out.order = input.order;
  return out;
}

// Keyword-FAQ sources arrive as {id, question}; RAG citations as {title, url}.
interface ApiAssistantSource {
  id?: number | string;
  question?: string;
  title?: string;
  url?: string;
}

interface ApiAssistantReply {
  answer: string;
  intent: AssistantIntent;
  sources?: ApiAssistantSource[];
  suggestions?: string[];
  offline?: boolean;
}

export function mapAssistantReply(r: ApiAssistantReply): AssistantReply {
  return {
    answer: r.answer,
    intent: r.intent,
    sources: (r.sources ?? []).map((s, i) => ({
      id: s.id !== undefined ? String(s.id) : `src-${i}`,
      question: s.question ?? s.title ?? '',
      url: s.url || undefined,
    })),
    suggestions: r.suggestions ?? [],
    offline: r.offline ?? false,
  };
}
