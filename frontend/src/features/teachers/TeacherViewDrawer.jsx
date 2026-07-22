import React, { useState } from 'react';
import { X, Award, Phone, Mail, BookOpen, Shield, Calendar, Plus, Loader2 } from 'lucide-react';
import StatusBadge from '../../components/shared/StatusBadge';
import { deleteAssignment } from './teacherService';
import toast from 'react-hot-toast';

const TeacherViewDrawer = ({ isOpen, onClose, teacher, assignments = [], onRefresh, onAddAssignment }) => {
  const [removingId, setRemovingId] = useState(null);

  if (!isOpen || !teacher) return null;

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
    if (!name) return 'TC';
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Status Badge mapping
  const getStatusBadgeProps = (isActive) => {
    return isActive !== false
      ? { status: 'active', label: 'Active' }
      : { status: 'danger', label: 'Deactivated' };
  };

  const statusProps = getStatusBadgeProps(teacher.userId?.isActive);

  // Generate color palette index based on teacher name length
  const colors = [
    'bg-blue-600 text-blue-100',
    'bg-purple-600 text-purple-100',
    'bg-emerald-600 text-emerald-100',
    'bg-amber-600 text-amber-100',
    'bg-pink-600 text-pink-100',
    'bg-indigo-600 text-indigo-100'
  ];
  const colorIndex = (teacher.userId?.name || '').length % colors.length;
  const avatarBg = colors[colorIndex];

  // Remove assignment handler
  const handleRemoveAssignment = async (asgId, comboName) => {
    try {
      setRemovingId(asgId);
      const res = await deleteAssignment(asgId);
      if (res.success) {
        toast.success(`Removed assignment: ${comboName}`);
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.message || 'Failed to remove assignment');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error removing assignment');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100 my-8">
        
        {/* Header Banner */}
        <div className="relative bg-navy-900 px-6 py-6 text-white flex justify-between items-start">
          <div className="flex items-center space-x-4">
            {/* Initials Fallback Avatar */}
            <div className={`h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold border-2 border-white/80 shadow-md ${avatarBg}`}>
              {getInitials(teacher.userId?.name)}
            </div>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight">{teacher.userId?.name || 'N/A'}</h2>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Employee ID: <span className="font-bold text-white">{teacher.employeeId}</span>
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

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          
          {/* Main Info Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Qualification Profile */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center mb-3">
                <Award className="h-4 w-4 mr-2 text-navy-800" />
                Qualification & Profile
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed italic">
                {teacher.qualification || 'No qualification details provided.'}
              </p>
            </div>

            {/* Contract & Employment */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center mb-3">
                <Calendar className="h-4 w-4 mr-2 text-navy-800" />
                Employment Info
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Joining Date:</span>
                  <span className="font-bold text-navy-900">{formatDate(teacher.joiningDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">System Role:</span>
                  <span className="font-bold text-navy-900 capitalize">{teacher.userId?.role || 'teacher'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="border border-gray-100 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center mb-4 border-b border-gray-100 pb-2">
              <Shield className="h-4 w-4 mr-2 text-navy-800" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-gray-400 block uppercase">Email Address</span>
                <span className="font-bold text-navy-900 flex items-center mt-1 break-all">
                  <Mail className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                  {teacher.userId?.email || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 block uppercase">Phone Number</span>
                <span className="font-bold text-navy-900 flex items-center mt-1">
                  <Phone className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                  {teacher.userId?.phone || 'No contact phone provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Classes Section */}
          <div className="border border-gray-100 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-navy-800" />
                Assigned Classes & Subjects
              </h3>
              <button
                onClick={() => onAddAssignment(teacher)}
                className="text-xs font-bold text-navy-900 hover:text-navy-700 transition-colors flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5 mr-0.5" />
                <span>Add Assignment</span>
              </button>
            </div>

            {assignments.length > 0 ? (
              <div className="overflow-hidden border border-gray-100 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-2.5 px-3 font-semibold text-gray-500 uppercase">Class</th>
                      <th className="py-2.5 px-3 font-semibold text-gray-500 uppercase">Section</th>
                      <th className="py-2.5 px-3 font-semibold text-gray-500 uppercase">Subject</th>
                      <th className="py-2.5 px-3 font-semibold text-gray-500 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assignments.map((asg) => {
                      const className = asg.classId?.name || 'N/A';
                      const sectionName = asg.sectionId?.name || 'N/A';
                      const subjectName = asg.subjectId?.name || 'N/A';
                      const comboName = `${className} - ${sectionName} - ${subjectName}`;

                      return (
                        <tr key={asg._id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-navy-950">{className}</td>
                          <td className="py-2.5 px-3 text-gray-600 font-semibold">{sectionName}</td>
                          <td className="py-2.5 px-3 text-gray-600">{subjectName}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleRemoveAssignment(asg._id, comboName)}
                              disabled={removingId === asg._id}
                              title="Remove Assignment"
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none disabled:opacity-50"
                            >
                              {removingId === asg._id ? (
                                <Loader2 className="animate-spin h-3.5 w-3.5" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-400 italic">No class assignments found for this teacher.</p>
                <button
                  onClick={() => onAddAssignment(teacher)}
                  className="mt-2 text-xs font-bold text-navy-800 hover:text-navy-700 underline focus:outline-none"
                >
                  Link class, section & subject now
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-bold transition-colors focus:outline-none"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
};

export default TeacherViewDrawer;
