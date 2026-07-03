import React from 'react';
import { LayoutDashboard, Users, Award, Calendar, DollarSign, BarChart3, Plus, ArrowRight } from 'lucide-react';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';

const AdminDashboard = () => {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Faculty', icon: Award, path: '/admin/faculty' },
    { label: 'Attendance', icon: Calendar, path: '/admin/attendance' },
    { label: 'Finance', icon: DollarSign, path: '/admin/finance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ];

  const recentRegistrations = [
    { id: 'REG001', name: 'Zainab Fatima', role: 'Student', date: 'July 03, 2026', status: 'active' },
    { id: 'REG002', name: 'Muhammad Ali', role: 'Student', date: 'July 02, 2026', status: 'active' },
    { id: 'REG003', name: 'Ayesha Khan', role: 'Teacher', date: 'June 30, 2026', status: 'pending' },
    { id: 'REG004', name: 'Omar Farooq', role: 'Student', date: 'June 28, 2026', status: 'danger' },
    { id: 'REG005', name: 'Sana Ahmed', role: 'Student', date: 'June 25, 2026', status: 'active' },
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Mudasir Iqbal"
      userRole="Administrator"
      subtitle="Administrative Suite"
    >
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">System Overview</h1>
            <p className="text-sm text-gray-500 mt-1">Manage school admissions, payroll, schedule, and reporting.</p>
          </div>
          <button className="bg-navy-900 text-white font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 hover:bg-navy-800 transition-colors shadow-sm text-sm">
            <Plus className="h-4 w-4" />
            <span>Add Student / Staff</span>
          </button>
        </div>

        {/* 4 StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Users}
            label="Total Students"
            value="1,280"
            trend="+4.2%"
            trendColor="active"
          />
          <StatCard
            icon={Award}
            label="Total Faculty"
            value="84"
            trend="+2.1%"
            trendColor="active"
          />
          <StatCard
            icon={DollarSign}
            label="Fees Collected"
            value="$45,200"
            trend="+12.5%"
            trendColor="active"
          />
          <StatCard
            icon={Calendar}
            label="Attendance Today"
            value="94.6%"
            trend="-0.4%"
            trendColor="danger"
          />
        </div>

        {/* Sample Table Block */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-navy-950">Recent Registrations</h2>
              <p className="text-xs text-gray-400 mt-0.5">List of newly registered students and faculty pending validation.</p>
            </div>
            <button className="text-xs font-bold text-navy-800 hover:text-navy-700 transition-colors flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Date Joined</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentRegistrations.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-gray-600">{row.id}</td>
                    <td className="py-4 px-6 text-sm font-bold text-navy-950">{row.name}</td>
                    <td className="py-4 px-6 text-sm font-medium text-gray-600">{row.role}</td>
                    <td className="py-4 px-6 text-sm text-gray-500">{row.date}</td>
                    <td className="py-4 px-6 text-sm">
                      <StatusBadge status={row.status} label={row.status === 'active' ? 'Active' : row.status === 'pending' ? 'Pending' : 'Suspended'} />
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

export default AdminDashboard;
