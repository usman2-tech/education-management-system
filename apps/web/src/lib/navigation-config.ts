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
        { title: 'Teachers & Faculty', href: '/teachers', icon: 'Briefcase', description: 'Cross-school faculty directory' },
        { title: 'Parents Directory', href: '/parents', icon: 'UserCheck', description: 'Guardian linkages & contacts' },
        { title: 'Classes & Sections', href: '/classes', icon: 'BookOpen', description: 'Curriculum & class rosters' },
        { title: 'Academic Years', href: '/academic-years', icon: 'Calendar', description: 'Institutional terms & calendars' },
        { title: 'Subjects', href: '/subjects', icon: 'FileText', description: 'Courses & departments' },
        { title: 'Timetable Schedules', href: '/timetable', icon: 'Clock', description: 'Master institutional schedules' },
        { title: 'Attendance Oversight', href: '/attendance', icon: 'Clock', description: 'Institutional attendance logs' },
        { title: 'Attendance Reports', href: '/attendance/reports', icon: 'FileSpreadsheet', description: 'Metrics & exports' },
        { title: 'Grades Oversight', href: '/grades', icon: 'Award', description: 'Cross-school academic assessments & reports' },
        { title: 'NFC Simulator', href: '/attendance/nfc-simulator', icon: 'Radio', description: 'Simulate card gate scans' },
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
        { title: 'School Profile', href: '/schools', icon: 'Building2', description: 'Institutional configuration & contacts' },
        { title: 'Students', href: '/students', icon: 'GraduationCap', description: 'Enrollment & student profiles' },
        { title: 'Teachers & Faculty', href: '/teachers', icon: 'Briefcase', description: 'Staff assignments & directory' },
        { title: 'Parents Directory', href: '/parents', icon: 'UserCheck', description: 'Guardian linkages & contacts' },
        { title: 'Academic Years', href: '/academic-years', icon: 'Calendar', description: 'Institutional terms & dates' },
        { title: 'Classes & Sections', href: '/classes', icon: 'BookOpen', description: 'Curriculum & room allocations' },
        { title: 'Subjects', href: '/subjects', icon: 'FileText', description: 'Courses & credits' },
        { title: 'Timetable Schedules', href: '/timetable', icon: 'Clock', description: 'Master weekly schedules' },
      ],
    },
    {
      title: 'Operations & Records',
      items: [
        { title: 'Grades & Assessments', href: '/grades', icon: 'Award', description: 'Assessments, gradebook & scales' },
        { title: 'Academic Reports', href: '/grades/reports', icon: 'FileSpreadsheet', description: 'Class analytics & distributions' },
        { title: 'Attendance Register', href: '/attendance', icon: 'CheckSquare', description: 'Daily attendance logs & sessions' },
        { title: 'Attendance Reports', href: '/attendance/reports', icon: 'FileSpreadsheet', description: 'Institutional attendance analytics' },
        { title: 'NFC Gate Simulator', href: '/attendance/nfc-simulator', icon: 'Radio', description: 'Simulate student badge scans' },
        { title: 'Campus Bulletins', href: '/announcements', icon: 'Megaphone', description: 'Official broadcast messages' },
      ],
    },
  ],

  [UserRole.TEACHER]: [
    {
      title: 'Teaching Workspace',
      items: [
        { title: 'Teacher Dashboard', href: '/', icon: 'LayoutDashboard', description: 'Class schedule & daily agenda' },
        { title: 'My Schedule', href: '/timetable', icon: 'Calendar', description: 'Personal teaching timetable' },
        { title: 'Classes & Sections', href: '/classes', icon: 'BookOpen', description: 'Assigned sections and rosters' },
        { title: 'Gradebook & Exams', href: '/grades', icon: 'Award', description: 'Enter marks & publish results' },
        { title: 'Daily Attendance', href: '/attendance', icon: 'CheckSquare', description: 'Record student attendance' },
        { title: 'NFC Gate Scanner', href: '/attendance/nfc-simulator', icon: 'Radio', description: 'Classroom gate scanner' },
      ],
    },
  ],

  [UserRole.STUDENT]: [
    {
      title: 'Learning Portal',
      items: [
        { title: 'Student Dashboard', href: '/', icon: 'LayoutDashboard', description: 'Classes, deadlines & updates' },
        { title: 'My Schedule', href: '/timetable', icon: 'Calendar', description: 'Class timetable & room numbers' },
        { title: 'My Report Card', href: '/grades', icon: 'Award', description: 'View assessments, GPA & feedback' },
        { title: 'My Attendance', href: '/attendance', icon: 'CheckSquare', description: 'Personal attendance records' },
      ],
    },
  ],

  [UserRole.PARENT]: [
    {
      title: 'Family Portal',
      items: [
        { title: 'Parent Dashboard', href: '/parent/dashboard', icon: 'LayoutDashboard', description: 'Children overview & updates' },
        { title: 'My Children', href: '/parent/children', icon: 'Users', description: 'Academic records & classes' },
        { title: 'Children Grades', href: '/grades', icon: 'Award', description: 'Verified child gradebook & progress' },
        { title: 'Children Timetable', href: '/timetable', icon: 'Calendar', description: 'Verified child class schedule' },
        { title: 'Child Attendance', href: '/attendance', icon: 'CheckSquare', description: 'Verified child attendance logs' },
      ],
    },
  ],
};
