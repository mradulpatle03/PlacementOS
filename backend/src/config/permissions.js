// All permissions in the system
const PERMISSIONS = {
  // Student
  APPLY_DRIVE: 'apply:drive',
  VIEW_OWN_APPLICATIONS: 'view:own_applications',
  UPLOAD_RESUME: 'upload:resume',
  VIEW_DRIVES: 'view:drives',

  // Recruiter
  VIEW_PIPELINE: 'view:pipeline',
  MOVE_PIPELINE: 'move:pipeline',
  CREATE_ASSESSMENT: 'create:assessment',
  SCHEDULE_INTERVIEW: 'schedule:interview',
  UPLOAD_OFFER: 'upload:offer',

  // Coordinator
  VIEW_STUDENTS: 'view:students',
  SEND_REMINDERS: 'send:reminders',

  // TPO
  CREATE_COMPANY: 'create:company',
  CREATE_DRIVE: 'create:drive',
  MANAGE_DRIVES: 'manage:drives',
  VIEW_ANALYTICS: 'view:analytics',
  EXPORT_REPORTS: 'export:reports',
  MANAGE_POLICIES: 'manage:policies',
  VERIFY_RECRUITER: 'verify:recruiter',

  // Admin
  MANAGE_USERS: 'manage:users',
  ASSIGN_ROLES: 'assign:roles',
  VIEW_AUDIT_LOGS: 'view:audit_logs',
  MANAGE_ANNOUNCEMENTS: 'manage:announcements',
};

// Default permissions per role
const ROLE_PERMISSIONS = {
  student: [
    PERMISSIONS.VIEW_DRIVES,
    PERMISSIONS.APPLY_DRIVE,
    PERMISSIONS.VIEW_OWN_APPLICATIONS,
    PERMISSIONS.UPLOAD_RESUME,
  ],
  recruiter: [
    PERMISSIONS.VIEW_DRIVES,
    PERMISSIONS.VIEW_PIPELINE,
    PERMISSIONS.MOVE_PIPELINE,
    PERMISSIONS.CREATE_ASSESSMENT,
    PERMISSIONS.SCHEDULE_INTERVIEW,
    PERMISSIONS.UPLOAD_OFFER,
  ],
  coordinator: [
    PERMISSIONS.VIEW_DRIVES,
    PERMISSIONS.VIEW_STUDENTS,
    PERMISSIONS.VIEW_OWN_APPLICATIONS,
    PERMISSIONS.SEND_REMINDERS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  tpo: [
    PERMISSIONS.VIEW_DRIVES,
    PERMISSIONS.CREATE_COMPANY,
    PERMISSIONS.CREATE_DRIVE,
    PERMISSIONS.MANAGE_DRIVES,
    PERMISSIONS.VIEW_STUDENTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.MANAGE_POLICIES,
    PERMISSIONS.VERIFY_RECRUITER,
    PERMISSIONS.VIEW_PIPELINE,
    PERMISSIONS.MOVE_PIPELINE,
  ],
  admin: Object.values(PERMISSIONS), // admin gets everything
};

module.exports = { PERMISSIONS, ROLE_PERMISSIONS };