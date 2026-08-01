import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Award, BookOpen, Wallet, TrendingUp, DollarSign, 
  CalendarCheck, BarChart3, HelpCircle, Send, Loader2, Mail, Phone, 
  Clock, ChevronDown, ChevronUp, Filter, Ticket, AlertCircle, RefreshCw,
  Calendar, CreditCard, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatusBadge from '../components/shared/StatusBadge';

const Support = () => {
  const { user } = useAuth();

  // Navigation items for the Sidebar based on role
  const adminNavItems = [
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

  const teacherNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/teacher-dashboard' },
    { label: 'Mark Attendance', icon: CalendarCheck, path: '/teacher/attendance' },
    { label: 'Manage Grades', icon: Award, path: '/teacher/grades' },
    { label: 'Settings', icon: Settings, path: '/teacher/settings' }
  ];

  const studentNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student-dashboard' },
    { label: 'My Schedule', icon: Calendar, path: '/student/schedule' },
    { label: 'Grades', icon: Award, path: '/student/grades' },
    { label: 'Fees', icon: CreditCard, path: '/student/fees' },
    { label: 'Settings', icon: Settings, path: '/student/settings' },
  ];

  const navItems = 
    user?.role === 'admin' 
      ? adminNavItems 
      : (user?.role === 'teacher' 
        ? teacherNavItems 
        : (user?.role === 'student' 
          ? studentNavItems 
          : [{ label: 'Dashboard', icon: LayoutDashboard, path: '/' }]));

  // States
  const [myTickets, setMyTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [myTicketsLoading, setMyTicketsLoading] = useState(false);
  const [allTicketsLoading, setAllTicketsLoading] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    category: 'Technical Issue',
    subject: '',
    message: ''
  });

  // Admin Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // FAQ Accordion State (stores the active FAQ index or null)
  const [activeFaq, setActiveFaq] = useState(null);

  // FAQs data
  const faqs = [
    // Teacher Group
    {
      group: 'For Teachers',
      question: 'How do I mark attendance?',
      answer: 'Navigate to the "Mark Attendance" tab from the sidebar, select your assigned class, section, and date, then mark student attendance status (Present, Absent, Late) and click Save.'
    },
    {
      group: 'For Teachers',
      question: 'How do I submit a leave request?',
      answer: 'Go to your Profile Settings page or submit a quick support ticket under the "Other" category to request leave approval. You can also contact the Admin office directly.'
    },
    {
      group: 'For Teachers',
      question: 'How do I update student grades?',
      answer: 'Navigate to the "Manage Grades" page in the sidebar, choose the class, section, subject, and assessment term, enter the grades in the input fields, and click Save Grades.'
    },
    // Admin Group
    {
      group: 'For Admins',
      question: 'How do I generate a fee receipt?',
      answer: 'Go to the "Fee Management" section, search for the student, choose the fee month, collect the payment, and click the download receipt icon to print a copy.'
    },
    {
      group: 'For Admins',
      question: 'How do I add a new student?',
      answer: 'Navigate to "Students" page, click the "Add Student" button, fill in the personal and parent details, upload documents, select a class and section, and click Submit.'
    },
    {
      group: 'For Admins',
      question: 'How do I manage payroll and salaries?',
      answer: 'Open the "Salary Payroll" page, click "Process Payroll" for the current month, review employee attendance and deductions, and issue payslips to teachers.'
    },
    // General Group
    {
      group: 'General Support',
      question: 'I forgot my password. How do I reset it?',
      answer: 'On the login page, click the "Forgot Password?" link, enter your registered email address, and check your inbox for a password reset email link.'
    },
    {
      group: 'General Support',
      question: 'How do I contact IT support?',
      answer: 'Submit a ticket using the form on this page, or reach out using the WhatsApp number or email address listed in the Quick Contact card.'
    }
  ];

  // Load user tickets
  const fetchMyTickets = async () => {
    try {
      setMyTicketsLoading(true);
      const res = await api.get('/support/tickets/my');
      if (res.data.success) {
        setMyTickets(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching my tickets:', err);
      toast.error('Failed to load your tickets');
    } finally {
      setMyTicketsLoading(false);
    }
  };

  // Load all tickets for admin
  const fetchAllTickets = async () => {
    if (user?.role !== 'admin') return;
    try {
      setAllTicketsLoading(true);
      const res = await api.get('/support/tickets');
      if (res.data.success) {
        setAllTickets(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching all tickets:', err);
      toast.error('Failed to load all system tickets');
    } finally {
      setAllTicketsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
    if (user?.role === 'admin') {
      fetchAllTickets();
    }
  }, [user]);

  // Form handle change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Form handle submit
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please enter a subject and details');
      return;
    }

    try {
      setSubmittingTicket(true);
      const res = await api.post('/support/tickets', formData);
      if (res.data.success) {
        toast.success('Support ticket submitted successfully!');
        setFormData({
          category: 'Technical Issue',
          subject: '',
          message: ''
        });
        // Reload ticket list
        fetchMyTickets();
        if (user?.role === 'admin') {
          fetchAllTickets();
        }
      }
    } catch (err) {
      console.error('Error submitting support ticket:', err);
      toast.error(err.response?.data?.message || 'Failed to submit support ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Admin status update handler
  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      const res = await api.patch(`/support/tickets/${ticketId}`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Ticket status updated to ${newStatus}`);
        
        // Update state locally to avoid full API reload
        setAllTickets(prev => prev.map(ticket => 
          ticket._id === ticketId ? { ...ticket, status: newStatus } : ticket
        ));
        
        // Also update local list if it contains this ticket
        setMyTickets(prev => prev.map(ticket => 
          ticket._id === ticketId ? { ...ticket, status: newStatus } : ticket
        ));
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err.response?.data?.message || 'Failed to update ticket status');
    }
  };

  // Filtered tickets for admin
  const filteredAllTickets = useMemo(() => {
    return allTickets.filter(ticket => {
      const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || ticket.category === categoryFilter;
      return matchesStatus && matchesCategory;
    });
  }, [allTickets, statusFilter, categoryFilter]);

  const toggleFaq = (index) => {
    setActiveFaq(prev => prev === index ? null : index);
  };

  // Helper to generate dynamic WhatsApp URL with pre-filled text based on role
  const getWhatsappUrl = () => {
    const baseUrl = "https://wa.me/923139318572";
    let text = "Hello IHASS Support, I need assistance.";
    if (user?.role === 'teacher') {
      text = "Hello IHASS Support, I am a teacher and need assistance.";
    } else if (user?.role === 'student') {
      text = "Hello IHASS Support, I am a student and need assistance with the portal.";
    }
    return `${baseUrl}?text=${encodeURIComponent(text)}`;
  };

  // Map database status to StatusBadge status
  const getBadgeStatus = (status) => {
    switch (status) {
      case 'Open':
        return 'info';
      case 'In Progress':
        return 'pending';
      case 'Resolved':
        return 'active';
      default:
        return 'default';
    }
  };

  return (
    <DashboardLayout
      navItems={navItems}
      userName={user?.name || 'User'}
      userRole={
        user?.role === 'admin' 
          ? 'Administrator' 
          : (user?.role === 'teacher' 
            ? 'Teacher' 
            : 'Student')
      }
      subtitle={
        user?.role === 'admin' 
          ? 'Administrative Suite' 
          : (user?.role === 'teacher' 
            ? 'Teacher Suite' 
            : 'Student Portal')
      }
    >
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Section 1: Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-2 border-b border-gray-200/60 dark:border-slate-700">
          <div>
            <h1 className="text-3xl font-extrabold text-navy-950 tracking-tight dark:text-white">Support Center</h1>
            <p className="text-sm text-gray-500 dark:text-slate-300 mt-1">
              We're here to help. Find answers to common queries or reach out directly.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <button
              onClick={() => {
                fetchMyTickets();
                if (user?.role === 'admin') fetchAllTickets();
              }}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-xl flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-sm"
              title="Refresh tickets list"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Main Content vs Quick Contact Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Section 2: FAQ Accordion */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700 shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-navy-50 dark:bg-slate-700 rounded-xl text-navy-900 dark:text-sky-400">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-navy-950 dark:text-white">Frequently Asked Questions</h2>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, index) => {
                  // Hide admin FAQs for non-admin users
                  if (faq.group === 'For Admins' && user?.role !== 'admin') {
                    return null;
                  }

                  // Hide teacher FAQs for non-teacher users
                  if (faq.group === 'For Teachers' && user?.role !== 'teacher') {
                    return null;
                  }
                  
                  const isOpen = activeFaq === index;
                  
                  return (
                    <div 
                      key={index}
                      className="border border-gray-100 dark:border-slate-700/60 rounded-xl overflow-hidden transition-all duration-200"
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-800/40 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-1 sm:space-y-0">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-navy-50 text-navy-900 dark:bg-sky-950/40 dark:text-sky-300 border border-navy-100/30 w-max">
                            {faq.group}
                          </span>
                          <span className="font-semibold text-sm text-navy-950 dark:text-slate-200">
                            {faq.question}
                          </span>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-gray-500 shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500 shrink-0 ml-2" />
                        )}
                      </button>
                      
                      {isOpen && (
                        <div className="p-4 border-t border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Submit a Ticket Form */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700 shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-navy-50 dark:bg-slate-700 rounded-xl text-navy-900 dark:text-sky-400">
                  <Ticket className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-navy-950 dark:text-white">Submit a Support Ticket</h2>
              </div>

              <form onSubmit={handleSubmitTicket} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-sky-400 outline-none transition-all text-sm text-gray-800 dark:text-slate-200"
                    >
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="Fee Query">Fee Query</option>
                      <option value="Account Access">Account Access</option>
                      <option value="Feature Request">Feature Request</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="e.g. Attendance page crashes on saving"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-sky-400 outline-none transition-all text-sm text-gray-800 dark:text-slate-200"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Message / Description
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Provide details about the issue or request..."
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-sky-400 outline-none transition-all text-sm text-gray-800 dark:text-slate-200 resize-none"
                    required
                  ></textarea>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
                  >
                    {submittingTicket ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit Ticket</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Section 4: My Tickets List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700 shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-navy-50 dark:bg-slate-700 rounded-xl text-navy-900 dark:text-sky-400">
                  <Ticket className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-navy-950 dark:text-white">My Support Tickets</h2>
              </div>

              {myTicketsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 text-navy-900 dark:text-sky-400 animate-spin" />
                </div>
              ) : myTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                  <Ticket className="h-10 w-10 mx-auto opacity-35 mb-2" />
                  <p className="text-sm">You haven't submitted any tickets yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-500 dark:text-slate-300">
                    <thead className="text-xs uppercase bg-gray-50 dark:bg-slate-750 text-gray-700 dark:text-slate-300 border-b border-gray-100 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                      {myTickets.map((ticket) => (
                        <tr key={ticket._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                            {ticket.category}
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate" title={ticket.message}>
                            <div className="font-medium text-gray-900 dark:text-white truncate">{ticket.subject}</div>
                            <div className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">{ticket.message}</div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={getBadgeStatus(ticket.status)} label={ticket.status} />
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {new Date(ticket.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 5: Admin "All Tickets" view */}
            {user?.role === 'admin' && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700 shadow-sm p-6 border-t-4 border-t-primary">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700 gap-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-navy-50 dark:bg-slate-700 rounded-xl text-navy-900 dark:text-sky-400">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-navy-950 dark:text-white">All Tickets (Admin Console)</h2>
                      <p className="text-xs text-gray-400 dark:text-slate-500">Manage and update status of student/faculty tickets</p>
                    </div>
                  </div>

                  {/* Filters Row */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-2 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs text-gray-700 dark:text-slate-200 outline-none"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                    <div>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-2 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs text-gray-700 dark:text-slate-200 outline-none"
                      >
                        <option value="All">All Categories</option>
                        <option value="Technical Issue">Technical Issue</option>
                        <option value="Fee Query">Fee Query</option>
                        <option value="Account Access">Account Access</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {allTicketsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 text-navy-900 dark:text-sky-400 animate-spin" />
                  </div>
                ) : filteredAllTickets.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                    <AlertCircle className="h-10 w-10 mx-auto opacity-35 mb-2" />
                    <p className="text-sm">No tickets found matching current filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500 dark:text-slate-300">
                      <thead className="text-xs uppercase bg-gray-50 dark:bg-slate-750 text-gray-700 dark:text-slate-300 border-b border-gray-100 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Subject & Details</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                        {filteredAllTickets.map((ticket) => (
                          <tr key={ticket._id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900 dark:text-white text-xs">{ticket.userName}</div>
                              <div className="text-[10px] text-gray-400 dark:text-slate-500 capitalize">{ticket.userRole}</div>
                            </td>
                            <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white">
                              {ticket.category}
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <div className="font-medium text-gray-900 dark:text-white truncate text-xs">{ticket.subject}</div>
                              <div className="text-[11px] text-gray-400 dark:text-slate-500 truncate mt-0.5" title={ticket.message}>{ticket.message}</div>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={getBadgeStatus(ticket.status)} label={ticket.status} />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={ticket.status}
                                onChange={(e) => handleUpdateStatus(ticket._id, e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-xs text-gray-700 dark:text-slate-200 outline-none"
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Sidebar Area: Quick Contact Card */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/60 dark:border-slate-700 shadow-sm p-6">
              <h2 className="text-lg font-bold text-navy-950 dark:text-white mb-6">Quick Contact</h2>
              
              <div className="space-y-6">
                
                {/* Contact Email */}
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-navy-50 dark:bg-slate-700 rounded-xl text-navy-900 dark:text-sky-400 mt-0.5">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Support Email</h3>
                    <p className="text-sm font-semibold text-navy-950 dark:text-slate-200 mt-1">
                      mudasiriqbal19750@gmail.com
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      Expect a response within 24 hours.
                    </p>
                  </div>
                </div>

                {/* WhatsApp / Phone */}
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-navy-50 dark:bg-slate-700 rounded-xl text-navy-900 dark:text-sky-400 mt-0.5">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">WhatsApp / Phone</h3>
                    <p className="text-sm font-semibold text-navy-950 dark:text-slate-200 mt-1">
                      +92313-9318572
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      Mon-Sat, for urgent issues.
                    </p>
                  </div>
                </div>

                {/* Office Hours */}
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-navy-50 dark:bg-slate-700 rounded-xl text-navy-900 dark:text-sky-400 mt-0.5">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Office Hours</h3>
                    <p className="text-sm font-semibold text-navy-950 dark:text-slate-200 mt-1">
                      Mon - Sat, 8:00 AM - 2:00 PM
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                      Excluding public holidays.
                    </p>
                  </div>
                </div>

              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700/60">
                <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
                  <strong>Need customized help?</strong> If your issue cannot be resolved by standard guides or IT Support, you may book an appointment with the school registrar.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Floating WhatsApp Contact Button */}
      {(user?.role === 'teacher' || user?.role === 'student') && (
        <a
          href={getWhatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-[#25D366] hover:bg-[#20BA56] text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:rotate-6 z-50 flex items-center justify-center"
          title="Direct Contact via WhatsApp"
        >
          <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.45h.007c5.589 0 10.14-4.552 10.143-10.143.002-2.71-1.052-5.257-2.962-7.17C16.551 1.38 14.008.328 11.293.328 5.705.328 1.15 10.471c0 1.888.492 3.73 1.426 5.372l-1.01 3.69 3.78-1.002c1.603.876 3.298 1.341 4.71 1.341l.001-.018zm11.39-7.464c-.312-.156-1.848-.913-2.138-1.018-.29-.106-.502-.156-.713.156-.213.313-.82.822-1.006 1.018-.186.197-.373.221-.686.064-1.1-.55-2.032-1.074-2.822-1.823-.84-.798-1.443-1.688-1.637-2.022-.19-.312-.02-.48.137-.636.14-.14.312-.365.468-.548.156-.182.208-.312.312-.52.105-.208.052-.39-.026-.547-.079-.156-.713-1.716-.978-2.35-.257-.617-.52-.533-.713-.543-.182-.01-.39-.01-.6-.01-.208 0-.547.078-.833.39-.286.313-1.093 1.068-1.093 2.604 0 1.536 1.12 3.018 1.277 3.227.156.208 2.2 3.36 5.33 4.716.745.322 1.326.515 1.78.658.748.238 1.43.205 1.97.124.6-.09 1.847-.756 2.11-1.45.26-.694.26-1.29.18-1.413-.07-.123-.27-.196-.58-.352z" />
          </svg>
        </a>
      )}
    </DashboardLayout>
  );
};

export default Support;
