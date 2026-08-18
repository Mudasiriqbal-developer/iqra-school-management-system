import {
  LayoutDashboard,
  Users,
  Award,
  BookOpen,
  Wallet,
  TrendingUp,
  DollarSign,
  CalendarCheck,
  BarChart3,
  Settings,
  GraduationCap
} from 'lucide-react';

export const DEFAULT_NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin-dashboard', icon: LayoutDashboard },
  { key: 'students', label: 'Students', path: '/admin/students', icon: Users },
  { key: 'faculty', label: 'Faculty', path: '/admin/teachers', icon: Award },
  { key: 'academics', label: 'Academic Structure', path: '/admin/academics', icon: BookOpen },
  { key: 'fees', label: 'Fee Management', path: '/admin/fees', icon: Wallet },
  { key: 'expenses', label: 'Expense Tracker', path: '/admin/expenses', icon: TrendingUp },
  { key: 'payroll', label: 'Salary Payroll', path: '/admin/payroll', icon: DollarSign },
  { key: 'attendance', label: 'Attendance', path: '/admin/attendance', icon: CalendarCheck },
  { key: 'reports', label: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { key: 'promotion', label: 'Promotion', path: '/admin/promotion', icon: GraduationCap },
  { key: 'settings', label: 'Settings', path: '/admin/settings', icon: Settings }
];
