import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Award, BookOpen, Wallet, TrendingUp, DollarSign, 
  CalendarCheck, BarChart3, Settings, School, Calendar, Clock, CreditCard, 
  Save, Plus, Trash2, Phone, Mail, Loader2, Key, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import DashboardLayout from '../components/shared/DashboardLayout';

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Form states
  const [schoolName, setSchoolName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [currentSession, setCurrentSession] = useState('');
  const [workingDays, setWorkingDays] = useState([]);
  const [feeHeads, setFeeHeads] = useState([]);
  const [lateFeeAmount, setLateFeeAmount] = useState(0);
  const [lateFeeAfterDay, setLateFeeAfterDay] = useState(0);

  // Helper state for adding a fee head
  const [newFeeHead, setNewFeeHead] = useState('');

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Faculty', icon: Award, path: '/admin/teachers' },
    { label: 'Academic Structure', icon: BookOpen, path: '/admin/academics' },
    { label: 'Fee Management', icon: Wallet, path: '/admin/fees' },
    { label: 'Expense Tracker', icon: TrendingUp, path: '/admin/expenses' },
    { label: 'Salary Payroll', icon: DollarSign, path: '/admin/payroll' },
    { label: 'Attendance', icon: CalendarCheck, path: '/admin/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await api.get('/settings');
        if (response.data.success) {
          const data = response.data.data;
          setSchoolName(data.schoolName || '');
          setLogoUrl(data.logoUrl || '');
          setAddress(data.address || '');
          setContactNumber(data.contactNumber || '');
          setEmail(data.email || '');
          setCurrentSession(data.currentSession || '');
          setWorkingDays(data.workingDays || []);
          setFeeHeads(data.feeHeads || []);
          setLateFeeAmount(data.lateFeeAmount || 0);
          setLateFeeAfterDay(data.lateFeeAfterDay || 0);
        } else {
          toast.error(response.data.message || 'Failed to load settings');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error(error.response?.data?.message || 'Error occurred while fetching settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setPasswordSaving(true);
      const response = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (response.data.success) {
        toast.success('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(response.data.message || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.response?.data?.message || 'Error updating password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleWorkingDayChange = (day) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter(d => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleAddFeeHead = () => {
    const head = newFeeHead.trim();
    if (!head) {
      toast.error('Fee head name cannot be empty');
      return;
    }
    if (feeHeads.includes(head)) {
      toast.error('This fee head already exists');
      return;
    }
    setFeeHeads([...feeHeads, head]);
    setNewFeeHead('');
  };

  const handleRemoveFeeHead = (headToRemove) => {
    setFeeHeads(feeHeads.filter(h => h !== headToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validations
    if (!schoolName.trim()) {
      toast.error('School name is required');
      return;
    }
    if (!currentSession.trim()) {
      toast.error('Academic session is required');
      return;
    }
    if (parseFloat(lateFeeAmount) < 0) {
      toast.error('Late fee amount cannot be negative');
      return;
    }
    if (parseInt(lateFeeAfterDay, 10) < 0) {
      toast.error('Late fee after day cannot be negative');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        schoolName: schoolName.trim(),
        logoUrl: logoUrl.trim(),
        address: address.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        currentSession: currentSession.trim(),
        workingDays,
        feeHeads,
        lateFeeAmount: Number(lateFeeAmount),
        lateFeeAfterDay: Number(lateFeeAfterDay),
      };

      const response = await api.put('/settings', payload);
      if (response.data.success) {
        toast.success('Settings updated successfully!');
        // Page reload to refresh layout context
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error(response.data.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.message || 'Error occurred while updating settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        navItems={navItems}
        userName="Administrator"
        userRole="admin"
        subtitle="System Settings"
      >
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#00215E] border-t-transparent"></div>
          <p className="text-sm font-bold text-navy-950 mt-4">Loading system settings...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      navItems={navItems}
      userName="Administrator"
      userRole="admin"
      subtitle="System Settings"
    >
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Global Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure school profile data, active academic sessions, attendance policies, and fee rules.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card: School Profile */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-gray-100 p-5 flex items-center space-x-3">
              <div className="p-2 bg-navy-50 text-[#00215E] dark:text-sky-400 rounded-xl border border-navy-100/50 dark:border-sky-900/40">
                <School className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-md font-bold text-navy-950">School Profile</h2>
                <p className="text-xxs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Identities & Info Contact Details</p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">School Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter full school name"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] transition-all"
                />
              </div>

              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">School Logo URL</label>
                <div className="flex space-x-4 items-center">
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="flex-grow px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] transition-all"
                  />
                  {logoUrl && (
                    <div className="h-11 w-11 rounded-xl bg-slate-50 border border-gray-200 overflow-hidden flex items-center justify-center p-1 flex-shrink-0">
                      <img 
                        src={logoUrl} 
                        alt="Preview" 
                        className="h-full w-full object-contain" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Address</label>
                <textarea
                  placeholder="Enter school location or street address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows="2"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Contact Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. +92 300 1234567"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Official Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="e.g. info@iqraschool.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Academic Session */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-gray-100 p-5 flex items-center space-x-3">
              <div className="p-2 bg-navy-50 text-[#00215E] dark:text-sky-400 rounded-xl border border-navy-100/50 dark:border-sky-900/40">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-md font-bold text-navy-950">Academic Session</h2>
                <p className="text-xxs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Define Current School Term</p>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-1.5 max-w-md">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Current Session *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027"
                  value={currentSession}
                  onChange={(e) => setCurrentSession(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] transition-all"
                />
                <p className="text-xxs font-bold text-slate-400 mt-1">This session ID is tagged to all student enrollment sheets and mark-sheets.</p>
              </div>
            </div>
          </div>

          {/* Card: Attendance Days */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-gray-100 p-5 flex items-center space-x-3">
              <div className="p-2 bg-navy-50 text-[#00215E] dark:text-sky-400 rounded-xl border border-navy-100/50 dark:border-sky-900/40">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-md font-bold text-navy-950">Attendance Settings</h2>
                <p className="text-xxs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Determine Weekly Working Days</p>
              </div>
            </div>

            <div className="p-6">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Working Days (Checked = Attendance Required)</label>
              <div className="flex flex-wrap gap-4">
                {daysOfWeek.map((day) => {
                  const isChecked = workingDays.includes(day);
                  return (
                    <label 
                      key={day} 
                      className={`px-4 py-3 border rounded-xl flex items-center space-x-3 cursor-pointer transition-all duration-200 select-none ${
                        isChecked 
                          ? 'border-[#00215E] bg-[#00215E]/5 text-navy-950 font-bold' 
                          : 'border-gray-200 hover:bg-slate-50 text-gray-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleWorkingDayChange(day)}
                        className="rounded text-[#00215E] focus:ring-[#00215E]/20 h-4 w-4"
                      />
                      <span className="text-sm">{day}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card: Fee Configuration */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-gray-100 p-5 flex items-center space-x-3">
              <div className="p-2 bg-navy-50 text-[#00215E] dark:text-sky-400 rounded-xl border border-navy-100/50 dark:border-sky-900/40">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-md font-bold text-navy-950">Fee Configuration</h2>
                <p className="text-xxs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Setup fee items & defaulter penalties</p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Part 1: Fee Heads Tag List */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Fee Heads (Heads of Account)</label>
                <div className="flex max-w-md space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. Exam Fee, Library Fee"
                    value={newFeeHead}
                    onChange={(e) => setNewFeeHead(e.target.value)}
                    className="flex-grow px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00215E]/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeeHead}
                    className="bg-[#00215E] text-white font-bold px-4 rounded-xl flex items-center justify-center hover:opacity-95 transition-opacity text-xs"
                  >
                    <Plus className="h-4.5 w-4.5 mr-1" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {feeHeads.length > 0 ? (
                    feeHeads.map((head) => (
                      <span 
                        key={head}
                        className="inline-flex items-center bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-200/50 text-xs"
                      >
                        <span>{head}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeeHead(head)}
                          className="ml-2 text-slate-400 hover:text-red-600 transition-colors focus:outline-none"
                          title={`Remove ${head}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 font-medium italic">No custom fee heads configured yet.</span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Part 2: Late Fee amount */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Late Fee Fine Amount (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 500"
                    value={lateFeeAmount}
                    onChange={(e) => setLateFeeAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] transition-all"
                  />
                </div>

                {/* Part 3: Late Fee after day */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Charge fine after (Day of Month)</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    placeholder="e.g. 10 (Charges late fee after 10th of the month)"
                    value={lateFeeAfterDay}
                    onChange={(e) => setLateFeeAfterDay(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#00215E] text-white font-bold py-3 px-6 rounded-xl flex items-center space-x-2.5 hover:opacity-90 transition-opacity shadow-md text-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Saving settings...</span>
                </>
              ) : (
                <>
                  <Save className="h-4.5 w-4.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Card: Update Password */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden mt-8">
          <div className="bg-slate-50 border-b border-gray-100 p-5 flex items-center space-x-3">
            <div className="p-2 bg-navy-50 text-[#00215E] dark:text-sky-400 rounded-xl border border-navy-100/50 dark:border-sky-900/40">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-md font-bold text-navy-950">Update Password</h2>
              <p className="text-xxs text-gray-400 font-bold uppercase tracking-wider mt-0.5">Secure your administrator account</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-5 max-w-2xl">
            {/* Current Password */}
            <div className="relative">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] bg-gray-50 focus:bg-white transition-all pr-12 font-medium font-sans"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="relative">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] bg-gray-50 focus:bg-white transition-all pr-12 font-medium font-sans"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="relative">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Verify new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00215E]/20 focus:border-[#00215E] bg-gray-50 focus:bg-white transition-all pr-12 font-medium font-sans"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordSaving}
                className="bg-[#00215E] hover:opacity-90 text-white font-bold py-3 px-6 rounded-xl transition-all duration-150 text-sm shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {passwordSaving ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Change Password</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
