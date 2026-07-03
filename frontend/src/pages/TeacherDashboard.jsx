import React from 'react';
import { LayoutDashboard, BookOpen, Users, CheckSquare, Calendar, Clock, ArrowRight } from 'lucide-react';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

const TeacherDashboard = () => {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/teacher-dashboard' },
    { label: 'Classes', icon: BookOpen, path: '/teacher/classes' },
    { label: 'Grading', icon: CheckSquare, path: '/teacher/grading' },
    { label: 'Attendance', icon: Calendar, path: '/teacher/attendance' },
    { label: 'Schedule', icon: Clock, path: '/teacher/schedule' },
  ];

  const recentSubmissions = [
    { id: 'SUB104', student: 'Amina Rehman', class: 'Grade 8-A English', assignment: 'Midterm Essay Draft', date: 'Today, 09:30 AM', status: 'pending', label: 'Pending Review' },
    { id: 'SUB103', student: 'Bilal Siddiqui', class: 'Grade 8-B English', assignment: 'Midterm Essay Draft', date: 'Yesterday', status: 'active', label: 'Graded' },
    { id: 'SUB102', student: 'Hamza Malik', class: 'Grade 8-A English', assignment: 'Midterm Essay Draft', date: 'June 30, 2026', status: 'active', label: 'Graded' },
    { id: 'SUB101', student: 'Fatima Noor', class: 'Grade 8-A English', assignment: 'Vocabulary Quiz 4', date: 'June 29, 2026', status: 'danger', label: 'Late Submission' },
    { id: 'SUB100', student: 'Zayd Yousuf', class: 'Grade 8-B English', assignment: 'Vocabulary Quiz 4', date: 'June 29, 2026', status: 'active', label: 'Graded' },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Sarah Ahmed"
      userRole="Senior Faculty"
      subtitle="Teacher Portal"
    >
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Faculty Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Review assignments, grade exams, track student progress, and schedule classes.</p>
          </div>
        </div>

        {/* 4 StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={BookOpen}
            label="My Classes"
            value="6"
          />
          <StatCard
            icon={Users}
            label="Active Students"
            value="142"
          />
          <StatCard
            icon={CheckSquare}
            label="Assignments Graded"
            value="88%"
            trend="+4%"
            trendColor="active"
          />
          <StatCard
            icon={Calendar}
            label="Average Attendance"
            value="96.2%"
            trend="+1.2%"
            trendColor="active"
          />
        </div>

        {/* Sample Table Block */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-navy-950">Recent Submissions</h2>
              <p className="text-xs text-gray-400 mt-0.5">Inbox of assignment files uploaded by your class sections.</p>
            </div>
            <button className="text-xs font-bold text-navy-800 hover:text-navy-700 transition-colors flex items-center space-x-1">
              <span>View All Inbox</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Class / Section</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Assignment</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted On</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentSubmissions.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-gray-600">{row.id}</td>
                    <td className="py-4 px-6 text-sm font-bold text-navy-950">{row.student}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 font-medium">{row.class}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">{row.assignment}</td>
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

export default TeacherDashboard;
