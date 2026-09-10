import { analyticsService } from './analytics';
import { assessmentsService } from './assessments';
import { assistantService } from './assistant';
import { authService } from './auth';
import { certificatesService } from './certificates';
import { communityService } from './community';
import { coursesService } from './courses';
import { dashboardService } from './dashboard';
import { engagementService } from './engagement';
import { managementService } from './management';
import { networkService } from './network';
import { notificationsService } from './notifications';
import { progressService } from './progress';
import { referenceService } from './reference';
import { usersService } from './users';

export const apiServices = {
  auth: authService,
  users: usersService,
  reference: referenceService,
  courses: coursesService,
  progress: progressService,
  assessments: assessmentsService,
  certificates: certificatesService,
  dashboard: dashboardService,
  engagement: engagementService,
  community: communityService,
  notifications: notificationsService,
  network: networkService,
  analytics: analyticsService,
  management: managementService,
  assistant: assistantService,
};
