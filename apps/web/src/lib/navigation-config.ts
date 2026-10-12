/**
 * MODULE: Navigation Configurations by Role
 *
 * PURPOSE:
 * Authoritative mapping of navigation hierarchy, icon representations, and
 * allowed user role memberships for the institutional layout.
 *
 * DEPENDENCIES:
 * UserRole from @ems/contracts.
 */

import { UserRole } from '@ems/contracts';

export interface NavSection {
  title: string;
  items: {
    title: string;
    href: string;
    icon: string;
    badge?: string;
    description: string;
  }[];
}

export const ROLE_NAVIGATION: Record<UserRole, NavSection[]> = {
  [UserRole.PLATFORM_ADMIN]: [
    {
      title: 'Institutional Control',
      items: [
        { title: 'Overview', href: '/', icon: 'LayoutDashboard', description: 'Platform operations & status' },
        { title: 'Schools Directory', href: '/schools', icon: 'Building2', description: 'Manage institutional tenants' },
        { title: 'System Accounts', href: '/users', icon: 'Users', description: 'Cross-school identity directory' },
        { title: 'Subscriptions', href: '/subscriptions', icon: 'CreditCard', description: 'License tiers and activation' },
      ],
    },
    {
      title: 'Governance & Security',
      items: [
        { title: 'Audit Logs', href: '/audit-logs', icon: 'ShieldCheck', description: 'Security trails & access logs' },
        { title: 'Global Settings', href: '/settings', icon: 'Sliders', description: 'Platform-level configurations' },
        { title: 'Infrastructure Health', href: '/system-health', icon: 'Activity', description: 'Service health & latencies' },
      ],
    },
  ],

  [UserRole.SCHOOL_ADMIN]: [
    {
      title: 'Academic Administration',
      items: [
        { title: 'Campus Dashboard', href: '/', icon: 'LayoutDashboard', description: 'Campus operations summary' },
        { title: 'Students', href: '/students', icon: 'GraduationCap', description: 'Enrollment & student profiles' },
        { title: 'Teachers & Faculty', href: '/teachers', icon: 'Briefcase', description: 'Staff assignments & directory' },
        { title: 'Parents Directory', href: '/parents', icon: 'UserCheck', description: 'Guardian linkages & contacts' },
        { title: 'Classes & Sections', href: '/classes', icon: 'BookOpen', description: 'Curriculum & room allocations' },
      ],
    },
    {
      title: 'Operations & Records',
      items: [
        { title: 'Timetable Schedules', href: '/timetable', icon: 'Calendar', description: 'Master institutional schedules' },
        { title: 'Attendance Oversight', href: '/attendance', icon: 'Clock', description: 'Daily attendance logs & trends' },
        { title: 'Examinations', href: '/exams', icon: 'FileText', description: 'Academic terms & assessments' },
        { title: 'Campus Bulletins', href: '/announcements', icon: 'Megaphone', description: 'Official broadcast messages' },
      ],
    },
  ],

  [UserRole.TEACHER]: [
    {
      title: 'Teaching Workspace',
      items: [
        { title: 'Teacher Dashboard', href: '/', icon: 'LayoutDashboard', description: 'Class schedule & daily agenda' },
        { title: 'My Classes', href: '/my-classes', icon: 'BookOpen', description: 'Assigned sections and rosters' },
        { title: 'Daily Attendance', href: '/attendance', icon: 'CheckSquare', description: 'Record student attendance' },
        { title: 'Gradebook', href: '/gradebook', icon: 'Award', description: 'Term marks and grading' },
        { title: 'Homework & Content', href: '/homework', icon: 'FileSpreadsheet', description: 'Assignments & courseware' },
      ],
    },
    {
      title: 'Collaboration & AI',
      items: [
        { title: 'AI Teaching Assistant', href: '/ai-assistant', icon: 'Sparkles', badge: 'AI', description: 'Lesson summaries & planning' },
        { title: 'Messages', href: '/messages', icon: 'MessageSquare', description: 'Direct parent & student messaging' },
      ],
    },
  ],

  [UserRole.STUDENT]: [
    {
      title: 'Learning Portal',
      items: [
        { title: 'Student Dashboard', href: '/', icon: 'LayoutDashboard', description: 'Classes, deadlines & updates' },
        { title: 'My Schedule', href: '/timetable', icon: 'Calendar', description: 'Daily timetable & classrooms' },
        { title: 'Courses & Lessons', href: '/courses', icon: 'BookOpen', description: 'Syllabus and learning materials' },
        { title: 'Assignments', href: '/homework', icon: 'FileText', description: 'Active and graded submissions' },
        { title: 'Exams & Marks', href: '/grades', icon: 'Award', description: 'Report cards & test scores' },
      ],
    },
    {
      title: 'Support & AI',
      items: [
        { title: 'AI Personal Tutor', href: '/ai-tutor', icon: 'Bot', badge: 'AI', description: 'Curriculum study assistant' },
        { title: 'Student Messages', href: '/messages', icon: 'MessageSquare', description: 'Teacher communication' },
      ],
    },
  ],

  [UserRole.PARENT]: [
    {
      title: 'Family Portal',
      items: [
        { title: 'Parent Dashboard', href: '/', icon: 'LayoutDashboard', description: 'Children overview & updates' },
        { title: 'Children Profiles', href: '/children', icon: 'Users', description: 'Academic records & classes' },
        { title: 'Attendance Record', href: '/attendance', icon: 'Clock', description: 'Check-in & absence reports' },
        { title: 'Academic Progress', href: '/grades', icon: 'Award', description: 'Term marks & teacher feedback' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { title: 'School Notices', href: '/announcements', icon: 'Bell', description: 'Official school broadcasts' },
        { title: 'Teacher Chat', href: '/messages', icon: 'MessageSquare', description: 'Direct dialogue with teachers' },
      ],
    },
  ],
};
