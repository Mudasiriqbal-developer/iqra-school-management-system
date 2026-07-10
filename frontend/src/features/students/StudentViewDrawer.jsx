import React from 'react';
import { X, User, MapPin, Phone, Mail, BookOpen, Shield, DollarSign, CalendarCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/shared/StatusBadge';
import { downloadAdmissionReceipt } from './studentService';

const StudentViewDrawer = ({ isOpen, onClose, student }) => {
  if (!isOpen || !student) return null;

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Generate initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Map student status to StatusBadge type
  const getStatusBadgeProps = (status) => {
    switch (status) {
      case 'active':
        return { status: 'active', label: 'Active' };
      case 'on_leave':
        return { status: 'pending', label: 'On Leave' };
      case 'suspended':
        return { status: 'danger', label: 'Suspended' };
      default:
        return { status: 'default', label: status || 'Unknown' };
    }
  };

  // Map fee status to StatusBadge type
  const getFeeBadgeProps = (feeStatus) => {
    switch (feeStatus) {
      case 'paid':
        return { status: 'active', label: 'Paid' };
      case 'pending':
        return { status: 'pending', label: 'Pending' };
      case 'overdue':
        return { status: 'danger', label: 'Overdue' };
      default:
        return { status: 'default', label: feeStatus || 'Unpaid' };
    }
  };

  const statusProps = getStatusBadgeProps(student.status);
  const feeStatusProps = getFeeBadgeProps(student.feeInfo?.status);

  // Generate color palette index based on student name length
  const colors = [
    'bg-blue-600 text-blue-100',
    'bg-purple-600 text-purple-100',
    'bg-emerald-600 text-emerald-100',
    'bg-amber-600 text-amber-100',
    'bg-pink-600 text-pink-100',
    'bg-indigo-600 text-indigo-100'
  ];
  const colorIndex = (student.fullName || '').length % colors.length;
  const avatarBg = colors[colorIndex];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100 my-8">
        
        {/* Header Banner */}
        <div className="relative bg-navy-900 px-6 py-6 text-white flex justify-between items-start">
          <div className="flex items-center space-x-4">
            {/* Student Photo / Fallback Avatar */}
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.fullName}
                className="h-16 w-16 rounded-full object-cover border-2 border-white/80 shadow-md"
              />
            ) : (
              <div className={`h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold border-2 border-white/80 shadow-md ${avatarBg}`}>
                {getInitials(student.fullName)}
              </div>
            )}

            <div>
              <h2 className="text-xl font-extrabold tracking-tight">{student.fullName}</h2>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Registration No: <span className="font-bold text-white">{student.registrationNumber}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <StatusBadge status={statusProps.status} label={statusProps.label} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Academic Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center mb-3">
                <BookOpen className="h-4 w-4 mr-2 text-navy-800" />
                Academic Information
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Class:</span>
                  <span className="font-bold text-navy-900">{student.classId?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Section:</span>
                  <span className="font-bold text-navy-900">{student.sectionId?.name || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center mb-3">
                <User className="h-4 w-4 mr-2 text-navy-800" />
                Personal Details
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Gender:</span>
                  <span className="font-bold text-navy-900 capitalize">{student.gender || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Date of Birth:</span>
                  <span className="font-bold text-navy-900">{formatDate(student.dateOfBirth)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Contact & Guardian Details */}
          <div className="border border-gray-100 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center mb-4 border-b border-gray-100 pb-2">
              <Shield className="h-4 w-4 mr-2 text-navy-800" />
              Guardian Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-semibold text-gray-400 block uppercase">Father's Name</span>
                  <span className="font-bold text-navy-900">{student.fatherName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-400 block uppercase">Father's Contact</span>
                  <span className="font-bold text-navy-900 flex items-center mt-0.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                    {student.fatherContact || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-semibold text-gray-400 block uppercase">Email Address</span>
                  <span className="font-bold text-navy-900 flex items-center mt-0.5 break-all">
                    <Mail className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                    {student.email || 'No email provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-400 block uppercase">Residential Address</span>
              <span className="font-bold text-navy-900 flex items-start mt-1">
                <MapPin className="h-4 w-4 text-gray-400 mr-1.5 mt-0.5 flex-shrink-0" />
                <span>{student.address || 'No address provided'}</span>
              </span>
            </div>
          </div>

          {/* Fee Information */}
          <div className="border border-gray-100 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center mb-4 border-b border-gray-100 pb-2">
              <DollarSign className="h-4 w-4 mr-2 text-navy-800" />
              Financial Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Fee Status:</span>
                <StatusBadge status={feeStatusProps.status} label={feeStatusProps.label} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Due Date:</span>
                <span className="font-bold text-navy-900 flex items-center">
                  <CalendarCheck className="h-4 w-4 text-gray-400 mr-1.5" />
                  {formatDate(student.feeInfo?.dueDate)}
                </span>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <span className="text-xs font-bold text-navy-950 uppercase tracking-wider block mb-2">Payment History</span>
              {student.feeInfo?.history && student.feeInfo.history.length > 0 ? (
                <div className="overflow-hidden border border-gray-100 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-2 px-3 font-semibold text-gray-500 uppercase">Paid Date</th>
                        <th className="py-2 px-3 font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="py-2 px-3 font-semibold text-gray-500 uppercase">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {student.feeInfo.history.map((pay, index) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-gray-600">{formatDate(pay.paidOn)}</td>
                          <td className="py-2 px-3 font-bold text-navy-950">Rs. {pay.amount}</td>
                          <td className="py-2 px-3 text-gray-600 capitalize">{pay.method}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200 text-center">
                  No payment history yet.
                </p>
              )}
            </div>
          </div>

          {/* Admission Details (Optional / If exists) */}
          {((student.admissionFee && student.admissionFee > 0) || (student.books && student.books.length > 0)) && (
            <div className="border border-gray-100 p-4 rounded-xl space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-navy-800" />
                  Admission Details
                </h3>
                <button
                  type="button"
                  onClick={async () => {
                    const toastId = toast.loading('Downloading admission receipt...');
                    try {
                      await downloadAdmissionReceipt(student._id, student.registrationNumber);
                      toast.success('Admission receipt downloaded successfully!', { id: toastId });
                    } catch (err) {
                      console.error(err);
                      toast.error('Failed to download admission receipt.', { id: toastId });
                    }
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-colors focus:outline-none"
                >
                  <span>Download Admission Receipt</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs font-semibold text-gray-400 block uppercase">Admission Fee</span>
                  <span className="font-bold text-navy-900">
                    {student.admissionFee && student.admissionFee > 0 ? `Rs. ${student.admissionFee}` : 'No admission fee recorded'}
                  </span>
                </div>
              </div>

              {student.books && student.books.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-navy-950 uppercase tracking-wider block mb-2">Books Purchased</span>
                  <div className="overflow-hidden border border-gray-100 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="py-2 px-3 font-semibold text-gray-500 uppercase">Book Title</th>
                          <th className="py-2 px-3 font-semibold text-gray-500 uppercase">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {student.books.map((book, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-gray-600">{book.title}</td>
                            <td className="py-2 px-3 font-bold text-navy-950">Rs. {book.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-bold transition-colors focus:outline-none"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
};

export default StudentViewDrawer;
