import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calendar, Award, BookOpen, CreditCard, Users, BookOpenCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/shared/DashboardLayout';
import { toast } from 'react-hot-toast';

const StudentSchedule = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState(null);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student-dashboard' },
    { label: 'My Schedule', icon: Calendar, path: '/student/schedule' },
    { label: 'Grades', icon: Award, path: '/student/grades' },
    { label: 'Fees', icon: CreditCard, path: '/student/fees' },
    { label: 'Resources', icon: BookOpen, path: '/student/resources' },
  ];

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const response = await api.get('/students/me/subjects');
        if (response.data.success) {
          setScheduleData(response.data.data);
        } else {
          toast.error(response.data.message || 'Failed to fetch subjects');
        }
      } catch (error) {
        console.error('Error fetching student subjects:', error);
        toast.error(error.response?.data?.message || 'Error loading subjects');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  if (loading) {
    return (
      <DashboardLayout
        navItems={navItems}
        userName={user?.name || 'Student'}
        userRole="Student"
        subtitle="Student Portal"
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  const className = scheduleData?.class?.name || '';
  const sectionName = scheduleData?.section?.name || '';
  const displayRole = `Student (${className}${sectionName ? `-${sectionName}` : ''})`;

  return (
    <DashboardLayout
      navItems={navItems}
      userName={user?.name || 'Student'}
      userRole={displayRole}
      subtitle="Student Portal"
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Academic Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">View subjects assigned to your class and their corresponding teachers.</p>
        </div>

        {/* Subjects List grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scheduleData?.subjects && scheduleData.subjects.length > 0 ? (
            scheduleData.subjects.map((item, index) => (
              <div 
                key={item.subjectId || index}
                className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 bg-navy-50 rounded-xl text-navy-900 border border-navy-100/50">
                      <BookOpenCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-navy-950">{item.subjectName || 'Unnamed Subject'}</h3>
                      <p className="text-xs text-gray-400">Core Subject</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
                    <div className="flex items-start space-x-3">
                      <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Teacher</p>
                        <p className="text-sm font-bold text-navy-950 mt-0.5">
                          {item.teacher?.fullName || 'TBD (Not Assigned)'}
                        </p>
                        {item.teacher?.qualification && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.teacher.qualification}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <span className="text-xs font-semibold text-navy-800 bg-navy-50/50 px-3 py-1 rounded-full border border-navy-100/30">
                    Active Subject
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white rounded-2xl border border-gray-200/60 shadow-sm p-12 text-center text-gray-400">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-medium">No subjects assigned to your class & section yet.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentSchedule;
