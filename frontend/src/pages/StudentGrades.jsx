import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Calendar, Award, BookOpen, CreditCard, Star, FileText, CheckCircle, RefreshCw } from 'lucide-react';
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
  const [grades, setGrades] = useState([]);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student-dashboard' },
    { label: 'My Schedule', icon: Calendar, path: '/student/schedule' },
    { label: 'Grades', icon: Award, path: '/student/grades' },
    { label: 'Fees', icon: CreditCard, path: '/student/fees' },
    { label: 'Resources', icon: BookOpen, path: '/student/resources' },
  ];

  useEffect(() => {
    const fetchGradesAndProfile = async () => {
      try {
        setLoading(true);
        const [profileRes, gradesRes] = await Promise.all([
          api.get('/students/me/profile'),
          api.get('/grades/me')
        ]);

        if (profileRes.data.success) {
          setProfileData(profileRes.data.data);
        }
        if (gradesRes.data.success) {
          setGrades(gradesRes.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching student profile & grades:', error);
        toast.error('Error loading academic records');
      } finally {
        setLoading(false);
      }
    };

    fetchGradesAndProfile();
  }, []);

  // Compute GPA and statistics dynamically
  const gradeStats = useMemo(() => {
    if (grades.length === 0) {
      return { gpa: 'N/A', totalSubjects: 0, passingStatus: 'No Records', failCount: 0 };
    }

    let totalPoints = 0;
    let failCount = 0;
    const uniqueSubjects = new Set();

    grades.forEach((g) => {
      if (g.subjectId?._id || g.subjectId) {
        uniqueSubjects.add(g.subjectId._id || g.subjectId);
      }
      
      const pct = (g.marksObtained / g.totalMarks) * 100;
      if (pct >= 90) totalPoints += 4.0;
      else if (pct >= 85) totalPoints += 4.0;
      else if (pct >= 80) totalPoints += 3.7;
      else if (pct >= 75) totalPoints += 3.3;
      else if (pct >= 70) totalPoints += 3.0;
      else if (pct >= 65) totalPoints += 2.7;
      else if (pct >= 60) totalPoints += 2.3;
      else if (pct >= 55) totalPoints += 2.0;
      else if (pct >= 50) totalPoints += 1.0;
      else {
        totalPoints += 0.0;
        failCount++;
      }
    });

    const gpa = (totalPoints / grades.length).toFixed(2);
    const passingStatus = failCount > 0 ? 'Needs Attention' : 'Passed';

    return {
      gpa,
      totalSubjects: uniqueSubjects.size,
      passingStatus,
      failCount,
    };
  }, [grades]);

  const getGradeLetter = (obtained, total) => {
    if (obtained === undefined || !total) return 'N/A';
    const pct = (obtained / total) * 100;
    if (pct >= 90) return 'A+';
    if (pct >= 85) return 'A';
    if (pct >= 80) return 'A-';
    if (pct >= 75) return 'B+';
    if (pct >= 70) return 'B';
    if (pct >= 65) return 'B-';
    if (pct >= 60) return 'C+';
    if (pct >= 55) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  };

  const formatExamType = (type) => {
    switch (type) {
      case 'quiz': return 'Quiz';
      case 'assignment': return 'Assignment';
      case 'midterm': return 'Midterm Exam';
      case 'final': return 'Final Exam';
      default: return type;
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        navItems={navItems}
        userName={user?.name || 'Student'}
        userRole="Student"
        subtitle="Student Portal"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="animate-spin h-12 w-12 border-b-2 border-navy-900" />
        </div>
      </DashboardLayout>
    );
  }

  const studentName = profileData?.student?.fullName || user?.name || 'Student';
  const className = profileData?.student?.classId?.name || '';
  const sectionName = profileData?.student?.sectionId?.name || '';
  const displayRole = `Student (${className}${sectionName ? `-${sectionName}` : ''})`;

  return (
    <DashboardLayout
      navItems={navItems}
      userName={studentName}
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
            value={gradeStats.gpa}
            trend="Academic Standings"
            trendColor={gradeStats.gpa !== 'N/A' && parseFloat(gradeStats.gpa) >= 3.0 ? 'active' : 'pending'}
          />
          <StatCard
            icon={Star}
            label="Failing Assessments"
            value={gradeStats.failCount}
            trend={gradeStats.failCount > 0 ? 'Action Required' : 'Excellent Standings'}
            trendColor={gradeStats.failCount > 0 ? 'danger' : 'active'}
          />
          <StatCard
            icon={FileText}
            label="Subjects Enrolled"
            value={gradeStats.totalSubjects}
            trend="Active Core Curriculum"
            trendColor="info"
          />
          <StatCard
            icon={CheckCircle}
            label="Passing Status"
            value={gradeStats.passingStatus}
            trend="Clear of Academic Probation"
            trendColor={gradeStats.passingStatus === 'Passed' ? 'active' : 'pending'}
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
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Comments / Teacher Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grades.length > 0 ? (
                  grades.map((record, index) => {
                    const gradeLetter = getGradeLetter(record.marksObtained, record.totalMarks);
                    const isPass = gradeLetter !== 'F';
                    return (
                      <tr key={record._id || index} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6 text-sm font-bold text-navy-950">
                          {record.subjectId?.name || 'Unknown Subject'}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 font-medium">
                          {formatExamType(record.examType)}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700 font-semibold">
                          {record.marksObtained} / {record.totalMarks}
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-navy-800">
                          {gradeLetter}
                        </td>
                        <td className="py-4 px-6 text-sm">
                          <StatusBadge status={isPass ? 'active' : 'danger'} label={isPass ? 'Passed' : 'Failed'} />
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-500 italic">
                          {record.comments || 'No remarks provided.'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-sm text-gray-400">
                      No grade entries recorded yet for this student.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentGrades;
