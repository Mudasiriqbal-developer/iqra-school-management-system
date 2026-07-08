import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calendar, Award, BookOpen, CreditCard, Star, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';
import { toast } from 'react-hot-toast';

const StudentGrades = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student-dashboard' },
    { label: 'My Schedule', icon: Calendar, path: '/student/schedule' },
    { label: 'Grades', icon: Award, path: '/student/grades' },
    { label: 'Fees', icon: CreditCard, path: '/student/fees' },
    { label: 'Resources', icon: BookOpen, path: '/student/resources' },
  ];

  const mockGrades = [
    { subject: 'Mathematics', type: 'Midterm Exam', marks: '88/100', grade: 'A', status: 'Passed' },
    { subject: 'Physics', type: 'Midterm Exam', marks: '85/100', grade: 'A-', status: 'Passed' },
    { subject: 'Chemistry', type: 'Midterm Exam', marks: '78/100', grade: 'B+', status: 'Passed' },
    { subject: 'English Literature', type: 'Midterm Exam', marks: '92/100', grade: 'A+', status: 'Passed' },
    { subject: 'Islamic Studies', type: 'Midterm Exam', marks: '90/100', grade: 'A', status: 'Passed' },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/students/me/profile');
        if (response.data.success) {
          setProfileData(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching student profile for grades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const className = profileData?.student?.classId?.name || '';
  const sectionName = profileData?.student?.sectionId?.name || '';
  const displayRole = `Student (${className}${sectionName ? `-${sectionName}` : ''})`;

  return (
    <DashboardLayout
      navItems={navItems}
      userName={profileData?.student?.fullName || user?.name || 'Student'}
      userRole={displayRole}
      subtitle="Student Portal"
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Grades & Marksheet</h1>
          <p className="text-sm text-gray-500 mt-1">Review your academic grades, midterm/final scores, and GPA summary.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Award}
            label="Cumulative GPA"
            value="3.82"
            trend="Target: 4.0"
            trendColor="active"
          />
          <StatCard
            icon={Star}
            label="Rank in Class"
            value="3rd"
            trend="Out of 32 Students"
            trendColor="info"
          />
          <StatCard
            icon={FileText}
            label="Total Subjects"
            value="5"
            trend="All Active"
            trendColor="active"
          />
          <StatCard
            icon={CheckCircle}
            label="Passing Status"
            value="Passed"
            trend="Clear of Dues"
            trendColor="active"
          />
        </div>

        {/* Grades Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-navy-950">Academic Report Card</h2>
              <p className="text-xs text-gray-400 mt-0.5">Summary of marks and grades from latest assessments and exams.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Assessment Type</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Marks Obtained</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockGrades.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-bold text-navy-950">{record.subject}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 font-medium">{record.type}</td>
                    <td className="py-4 px-6 text-sm text-gray-700 font-semibold">{record.marks}</td>
                    <td className="py-4 px-6 text-sm font-bold text-navy-800">{record.grade}</td>
                    <td className="py-4 px-6 text-sm">
                      <StatusBadge status="active" label={record.status} />
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

export default StudentGrades;
