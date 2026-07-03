import React from 'react';
import { LayoutDashboard, Calendar, Award, BookOpen, Clock, CreditCard, ArrowRight } from 'lucide-react';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

const StudentDashboard = () => {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student' },
    { label: 'My Schedule', icon: Calendar, path: '/student/schedule' },
    { label: 'Grades', icon: Award, path: '/student/grades' },
    { label: 'Fees', icon: CreditCard, path: '/student/fees' },
    { label: 'Resources', icon: BookOpen, path: '/student/resources' },
  ];

  const upcomingAssessments = [
    { id: 'ASM201', subject: 'Mathematics', type: 'Quiz 5 (Geometry)', date: 'Today, 11:30 AM', status: 'pending', label: 'Not Started' },
    { id: 'ASM202', subject: 'Physics', type: 'Lab Report 2 Submission', date: 'July 05, 2026', status: 'info', label: 'Draft Saved' },
    { id: 'ASM203', subject: 'English Literature', type: 'Book Review Presentation', date: 'July 08, 2026', status: 'active', label: 'Prepared' },
    { id: 'ASM204', subject: 'Chemistry', type: 'Monthly Unit Test', date: 'July 10, 2026', status: 'pending', label: 'Not Started' },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Zainab Fatima"
      userRole="Student (Grade 8-A)"
      subtitle="Student Portal"
    >
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Student Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Check grades, attend classes, manage fees, and complete assessments.</p>
          </div>
        </div>

        {/* 4 StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Award}
            label="GPA"
            value="3.82"
            trend="+0.15"
            trendColor="active"
          />
          <StatCard
            icon={Calendar}
            label="Attendance Rate"
            value="98.4%"
            trend="+0.8%"
            trendColor="active"
          />
          <StatCard
            icon={Clock}
            label="Pending Assignments"
            value="3"
            trend="Needs Attention"
            trendColor="pending"
          />
          <StatCard
            icon={BookOpen}
            label="Library Books Due"
            value="1"
            trend="Overdue"
            trendColor="danger"
          />
        </div>

        {/* Sample Table Block */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-navy-950">Upcoming Assessments</h2>
              <p className="text-xs text-gray-400 mt-0.5">Tasks and test events scheduled for the next 7 days.</p>
            </div>
            <button className="text-xs font-bold text-navy-800 hover:text-navy-700 transition-colors flex items-center space-x-1">
              <span>View Full Calendar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Assessment Type</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Due / Scheduled Date</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingAssessments.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-gray-600">{row.id}</td>
                    <td className="py-4 px-6 text-sm font-bold text-navy-950">{row.subject}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 font-medium">{row.type}</td>
                    <td className="py-4 px-6 text-sm text-gray-500">{row.date}</td>
                    <td className="py-4 px-6 text-sm">
                      <StatusBadge status={row.status} label={row.label} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
