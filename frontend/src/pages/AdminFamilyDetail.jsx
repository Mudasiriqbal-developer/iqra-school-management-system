import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Plus, Phone, MapPin, User, X, DollarSign, BookOpen, Download, Loader2, AlertTriangle, Info, Eye, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatusBadge from '../components/shared/StatusBadge';
import ConfirmModal from '../components/shared/ConfirmModal';
import { getFamilyById, updateFamily, updateFamilyStudents } from '../features/family/familyService';
import { getStudents } from '../features/students/studentService';

const AdminFamilyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State variables
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Edit metadata form states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [alternateContact, setAlternateContact] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Sibling addition states
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedStudentToLink, setSelectedStudentToLink] = useState(null);
  const [reassign, setReassign] = useState(false);
  const [linking, setLinking] = useState(false);

  // Unlink states
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [studentToUnlink, setStudentToUnlink] = useState(null);
  const [unlinking, setUnlinking] = useState(false);

  // Load family data
  const loadFamilyDetails = async () => {
    try {
      setLoading(true);
      const res = await getFamilyById(id);
      if (res.success) {
        setFamily(res.data);
        // Pre-populate edit states
        setFamilyName(res.data.familyName || '');
        setGuardianName(res.data.guardianName || '');
        setContactNumber(res.data.contactNumber || '');
        setAlternateContact(res.data.alternateContact || '');
        setAddress(res.data.address || '');
        setNotes(res.data.notes || '');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load family details');
      navigate('/admin/family');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilyDetails();
  }, [id]);

  // Debounced search for student additions
  useEffect(() => {
    if (!studentSearch.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSearchingStudents(true);
        const res = await getStudents({
          search: studentSearch,
          limit: 10
        });
        if (res.success) {
          // Filter out students who are already part of THIS family
          const filtered = res.data.students.filter(
            s => !family?.students?.some(fs => fs._id === s._id)
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingStudents(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [studentSearch, family]);

  // Handle family metadata update
  const handleUpdateFamily = async (e) => {
    e.preventDefault();
    if (!familyName.trim() || !contactNumber.trim()) {
      toast.error('Family Name and Contact Number are required');
      return;
    }

    try {
      setUpdating(true);
      const res = await updateFamily(id, {
        familyName,
        guardianName,
        contactNumber,
        alternateContact,
        address,
        notes
      });
      if (res.success) {
        toast.success('Family information updated successfully');
        setFamily(res.data);
        setIsEditModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update family information');
    } finally {
      setUpdating(false);
    }
  };

  // Handle student addition
  const handleLinkStudent = async () => {
    if (!selectedStudentToLink) return;

    try {
      setLinking(true);
      const res = await updateFamilyStudents(id, {
        add: [selectedStudentToLink._id],
        remove: [],
        reassign
      });
      if (res.success) {
        toast.success(`Linked ${selectedStudentToLink.fullName} to family tree!`);
        setFamily(res.data);
        // Clean up
        setSelectedStudentToLink(null);
        setStudentSearch('');
        setSearchResults([]);
        setReassign(false);
        setIsAddStudentOpen(false);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to link student';
      toast.error(errMsg);
    } finally {
      setLinking(false);
    }
  };

  // Handle student unlinking
  const handleUnlinkClick = (student) => {
    setStudentToUnlink(student);
    setIsUnlinkModalOpen(true);
  };

  const confirmUnlinkStudent = async () => {
    if (!studentToUnlink) return;

    try {
      setUnlinking(true);
      const res = await updateFamilyStudents(id, {
        add: [],
        remove: [studentToUnlink._id]
      });
      if (res.success) {
        toast.success(`Unlinked ${studentToUnlink.fullName} from family tree.`);
        setFamily(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to unlink student');
    } finally {
      setUnlinking(false);
      setIsUnlinkModalOpen(false);
      setStudentToUnlink(null);
    }
  };

  // Initials generator
  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .trim()
      .split(/\s+/)
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <DashboardLayout userName="Administrator" userRole="admin" subtitle="Family Tree Detail">
      <div className="space-y-6">
        
        {/* Navigation & Actions */}
        <div className="flex items-center space-x-3">
          <Link 
            to="/admin/family" 
            className="p-2 bg-white rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <span className="text-sm font-bold text-gray-400">Back to Family Tree</span>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-navy-900 border-t-transparent"></div>
            <p className="text-sm font-bold text-navy-950 mt-4">Loading family profile...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: Profile Metadata & Controls */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-extrabold text-navy-950 tracking-tight">
                      {family.familyName}
                    </h2>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mt-1">
                      Family Code Reference
                    </span>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-navy-900 rounded-xl transition-colors border border-gray-150"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3.5 text-sm">
                  {family.guardianName && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block uppercase">Primary Guardian</span>
                      <span className="font-bold text-gray-950 block mt-0.5">{family.guardianName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-semibold text-gray-400 block uppercase">Contact Number</span>
                    <span className="font-bold text-gray-950 block mt-0.5">{family.contactNumber}</span>
                  </div>
                  {family.alternateContact && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block uppercase">Alternate Contact</span>
                      <span className="font-bold text-gray-950 block mt-0.5">{family.alternateContact}</span>
                    </div>
                  )}
                  {family.address && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block uppercase">Residential Address</span>
                      <span className="font-bold text-gray-950 block mt-0.5 leading-relaxed">{family.address}</span>
                    </div>
                  )}
                  {family.notes && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 block uppercase">Admin Notes</span>
                      <span className="font-semibold text-gray-600 block mt-0.5 italic text-xs leading-relaxed">{family.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Sibling quick panel */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-extrabold text-navy-950 uppercase tracking-wider">
                    Link Sibling
                  </h3>
                  <button
                    onClick={() => setIsAddStudentOpen(prev => !prev)}
                    className="p-1.5 bg-navy-50 hover:bg-navy-100 rounded-lg text-navy-900 border border-navy-150 transition-colors"
                  >
                    {isAddStudentOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </button>
                </div>

                {isAddStudentOpen && (
                  <div className="space-y-4 pt-1">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search student to link..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:border-navy-900 focus:outline-hidden transition-colors"
                      />
                      {searchingStudents && (
                        <div className="absolute right-3 top-3.5">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      )}

                      {/* Dropdown results */}
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100">
                          {searchResults.map((student) => (
                            <div
                              key={student._id}
                              onClick={() => setSelectedStudentToLink(student)}
                              className="p-3 text-xs hover:bg-slate-50 cursor-pointer text-gray-700 flex flex-col"
                            >
                              <span className="font-extrabold text-navy-950">{student.fullName}</span>
                              <span className="text-[9px] text-gray-400 mt-0.5">
                                Reg: {student.registrationNumber} | Class: {student.classId?.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Student Block */}
                    {selectedStudentToLink && (
                      <div className="p-3.5 bg-slate-50 border border-gray-150 rounded-xl space-y-3">
                        <div className="text-xs">
                          <div className="font-extrabold text-navy-950">{selectedStudentToLink.fullName}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Reg: {selectedStudentToLink.registrationNumber} | Class: {selectedStudentToLink.classId?.name}
                          </div>
                        </div>

                        {/* Reassignment check */}
                        {selectedStudentToLink.familyId ? (
                          <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-700 space-y-2">
                            <div className="flex items-start">
                              <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-600 flex-shrink-0 mt-0.5" />
                              <span>
                                Already linked to family "{selectedStudentToLink.familyId.familyName}".
                              </span>
                            </div>
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={reassign}
                                onChange={(e) => setReassign(e.target.checked)}
                                className="h-3.5 w-3.5 rounded-sm text-navy-900 border-gray-300 focus:ring-navy-900 focus:outline-hidden"
                              />
                              <span className="font-bold">Confirm reassign</span>
                            </label>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={handleLinkStudent}
                          disabled={linking || (selectedStudentToLink.familyId && !reassign)}
                          className="w-full py-2 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center space-x-1"
                        >
                          {linking && <Loader2 className="h-3 w-3 animate-spin" />}
                          <span>Link Student</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Right side: Linked Students grid and Aggregations */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Linked Students List */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-extrabold text-navy-950 uppercase tracking-wider">
                  Linked Sibling Students ({family.students?.length || 0})
                </h3>

                {family.students && family.students.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {family.students.map((student) => (
                      <div 
                        key={student._id}
                        className="p-4 rounded-xl border border-gray-200 bg-slate-50/50 flex items-center justify-between hover:border-navy-200 transition-colors"
                      >
                        <div className="flex items-center space-x-3.5 min-w-0">
                          {/* Initials Avatar */}
                          <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold bg-navy-900 text-white flex-shrink-0">
                            {getInitials(student.fullName)}
                          </div>
                          
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-navy-950 text-sm truncate" title={student.fullName}>
                              {student.fullName}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                              Reg: {student.registrationNumber.toUpperCase()}
                            </p>
                            <p className="text-[10px] text-gray-500 font-bold mt-1">
                              Class {student.classId?.name} • Sec {student.sectionId?.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 ml-2">
                          <button
                            onClick={() => handleUnlinkClick(student)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors border border-transparent hover:border-red-100"
                            title="Unlink student"
                          >
                            <LogOut className="h-3.5 w-3.5 transform rotate-180" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 text-center">
                    No sibling students linked to this family yet. Link siblings on the left panel.
                  </p>
                )}
              </div>

              {/* Combined Fee & Books Panel (Phase 2, 3, 4 Stubs) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-navy-950 uppercase tracking-wider flex items-center">
                      <DollarSign className="h-4.5 w-4.5 mr-1 text-navy-900" />
                      Combined Household Accounts
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Consolidated fee balance and issued assets across all siblings.</p>
                  </div>
                  
                  {/* Pay button disabled for Phase 1 */}
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-xl text-xs font-extrabold cursor-not-allowed flex items-center space-x-1"
                  >
                    <span>Pay Combined Fees</span>
                  </button>
                </div>

                {/* Stat cards block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-gray-150 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Combined Outstanding Dues</span>
                      <span className="text-xl font-black text-navy-950 block mt-1">Rs. 0.00</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-150 text-gray-500 uppercase">Stub 0</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-gray-150 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Combined Books Outstanding</span>
                      <span className="text-xl font-black text-navy-950 block mt-1">—</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">Stub</span>
                  </div>
                </div>

                <div className="p-3 bg-navy-50/40 rounded-xl border border-navy-100 flex items-center text-xs text-navy-800">
                  <Info className="h-4 w-4 mr-2 text-navy-900 flex-shrink-0" />
                  <span>Fee aggregation, books outstanding summary, combined family voucher, and transaction payment modules will load in Pass 2.</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Edit Family Info Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden my-8">
              
              {/* Modal Header */}
              <div className="bg-navy-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Edit2 className="h-5 w-5 text-sky-400" />
                  <h3 className="text-base font-extrabold tracking-tight">Edit Family Details</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleUpdateFamily} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1">
                    Family Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    required
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:border-navy-900 focus:outline-hidden transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:border-navy-900 focus:outline-hidden transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    required
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:border-navy-900 focus:outline-hidden transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1">
                    Alternate Contact
                  </label>
                  <input
                    type="text"
                    value={alternateContact}
                    onChange={(e) => setAlternateContact(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:border-navy-900 focus:outline-hidden transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:border-navy-900 focus:outline-hidden transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1">
                    Admin Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:border-navy-900 focus:outline-hidden transition-colors resize-none"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-150">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-5 py-3 border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-5 py-3 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl transition-colors text-xs shadow-md disabled:opacity-50 flex items-center space-x-1"
                  >
                    {updating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Unlink Sibling Modal */}
        <ConfirmModal
          isOpen={isUnlinkModalOpen}
          onClose={() => setIsUnlinkModalOpen(false)}
          onConfirm={confirmUnlinkStudent}
          title="Unlink Sibling"
          message={`Are you sure you want to unlink ${studentToUnlink?.fullName} from the "${family?.familyName}" tree? This will clear the student's family reference, but will not modify the student or their ledger records.`}
          confirmText="Yes, Unlink"
          cancelText="Cancel"
        />

      </div>
    </DashboardLayout>
  );
};

export default AdminFamilyDetail;
