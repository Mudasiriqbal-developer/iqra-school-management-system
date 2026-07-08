import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calendar, Award, BookOpen, CreditCard, Wallet, CalendarClock, Receipt, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatCard from '../components/shared/StatCard';
import StatusBadge from '../components/shared/StatusBadge';
import { toast } from 'react-hot-toast';

const StudentFees = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feeData, setFeeData] = useState(null);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student-dashboard' },
    { label: 'My Schedule', icon: Calendar, path: '/student/schedule' },
    { label: 'Grades', icon: Award, path: '/student/grades' },
    { label: 'Fees', icon: CreditCard, path: '/student/fees' },
    { label: 'Resources', icon: BookOpen, path: '/student/resources' },
  ];

  useEffect(() => {
    const fetchFeeData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/students/me/fees');
        if (response.data.success) {
          setFeeData(response.data.data);
        } else {
          toast.error(response.data.message || 'Failed to fetch fee data');
        }
      } catch (error) {
        console.error('Error fetching fee history:', error);
        toast.error(error.response?.data?.message || 'Error loading fee data');
      } finally {
        setLoading(false);
      }
    };

    fetchFeeData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending';
      case 'overdue': return 'Overdue';
      default: return status;
    }
  };

  const getStatusType = (status) => {
    switch (status) {
      case 'paid': return 'active';
      case 'pending': return 'pending';
      case 'overdue': return 'danger';
      default: return 'info';
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  const studentName = feeData?.studentName || user?.name || 'Student';
  const className = feeData?.class?.name || '';
  const sectionName = feeData?.section?.name || '';
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
          <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Fee Structure & History</h1>
          <p className="text-sm text-gray-500 mt-1">Review your current monthly fee, balance, and previous payments.</p>
        </div>

        {/* Status Check & Top Cards */}
        {feeData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={Wallet}
              label="Total Monthly Due"
              value={`Rs. ${feeData.amountDue || 0}`}
              trend="Current Cycle"
              trendColor="info"
            />
            <StatCard
              icon={Receipt}
              label="Amount Paid"
              value={`Rs. ${feeData.amountPaid || 0}`}
              trend="Paid in Cycle"
              trendColor="active"
            />
            <StatCard
              icon={CreditCard}
              label="Remaining Balance"
              value={`Rs. ${feeData.balance || 0}`}
              trend={feeData.balance > 0 ? 'Due Now' : 'Clear'}
              trendColor={feeData.balance > 0 ? 'danger' : 'active'}
            />
            <StatCard
              icon={CalendarClock}
              label="Payment Due Date"
              value={formatDate(feeData.dueDate)}
              trend={getStatusLabel(feeData.feeStatus)}
              trendColor={getStatusType(feeData.feeStatus)}
            />
          </div>
        )}

        {/* History Table */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-navy-950">Payment History</h2>
              <p className="text-xs text-gray-400 mt-0.5">Records of all fee transactions received by the admin.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">For Month</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount Paid</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Method</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Date</th>
                  <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feeData?.history && feeData.history.length > 0 ? (
                  feeData.history.map((record, index) => (
                    <tr key={record._id || index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-sm font-bold text-navy-950">{record.forMonth}</td>
                      <td className="py-4 px-6 text-sm font-semibold text-gray-700">Rs. {record.amount}</td>
                      <td className="py-4 px-6 text-sm text-gray-600 capitalize">
                        {record.method?.replace('_', ' ')}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">{formatDate(record.paidOn)}</td>
                      <td className="py-4 px-6 text-sm">
                        <StatusBadge status="active" label="Successful" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-sm text-gray-400">
                      No payment history recorded yet.
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

export default StudentFees;
