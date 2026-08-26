import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Phone, MapPin, X, Info, AlertTriangle, Loader2, UserPlus, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatusBadge from '../components/shared/StatusBadge';
import ConfirmModal from '../components/shared/ConfirmModal';
import { getFamilies, createFamily, deleteFamily } from '../features/family/familyService';
import { getStudents } from '../features/students/studentService';

const AdminFamilyList = () => {
  const navigate = useNavigate();
  
  // State variables
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFamilies, setTotalFamilies] = useState(0);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [familyToDelete, setFamilyToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [familyName, setFamilyName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [alternateContact, setAlternateContact] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [reassign, setReassign] = useState(false);

  // Student search states
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [hasReassignmentConflict, setHasReassignmentConflict] = useState(false);

  // Fetch families list
  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const res = await getFamilies({
        search: searchQuery,
        page: currentPage,
        limit: 10
      });
      if (res.success) {
        setFamilies(res.data.families);
        setTotalPages(res.data.pages);
        setTotalFamilies(res.data.total);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load families list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies();
  }, [currentPage, searchQuery]);

  // Debounced student search
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
          setSearchResults(res.data.students);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingStudents(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [studentSearch]);

  // Check if any selected student triggers a reassignment prompt
  useEffect(() => {
    const conflict = selectedStudents.some(s => s.familyId);
    setHasReassignmentConflict(conflict);
    if (!conflict) {
      setReassign(false); // Reset if conflict is resolved
    }
  }, [selectedStudents]);

  const handleOpenAddModal = () => {
    setFamilyName('');
    setGuardianName('');
    setContactNumber('');
    setAlternateContact('');
    setAddress('');
    setNotes('');
    setSelectedStudents([]);
    setStudentSearch('');
    setSearchResults([]);
    setReassign(false);
    setIsAddModalOpen(true);
  };

  const handleSelectStudent = (student) => {
    // Avoid duplicate select
    if (selectedStudents.some(s => s._id === student._id)) {
      toast.error('Student already added to selection');
      return;
    }
    setSelectedStudents(prev => [...prev, student]);
    setStudentSearch('');
    setSearchResults([]);
  };

  const handleRemoveSelectedStudent = (studentId) => {
    setSelectedStudents(prev => prev.filter(s => s._id !== studentId));
  };

  const handleSubmitFamily = async (e) => {
    e.preventDefault();
    if (!familyName.trim() || !contactNumber.trim()) {
      toast.error('Family Name and Contact Number are required');
      return;
    }

    try {
      setSubmitting(true);
      const studentIds = selectedStudents.map(s => s._id);
      
      const payload = {
        familyName,
        guardianName,
        contactNumber,
        alternateContact,
        address,
        notes,
        studentIds,
        reassign
      };

      const res = await createFamily(payload);
      if (res.success) {
        toast.success('Family tree created successfully!');
        setIsAddModalOpen(false);
        fetchFamilies();
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to create family tree';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (family) => {
    setFamilyToDelete(family);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteFamily = async () => {
    try {
      const res = await deleteFamily(familyToDelete._id);
      if (res.success) {
        toast.success('Family deleted successfully. Student records are untouched.');
        fetchFamilies();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete family');
    } finally {
      setIsDeleteModalOpen(false);
      setFamilyToDelete(null);
    }
  };

  return (
    <DashboardLayout userName="Administrator" userRole="admin" subtitle="Family Tree">
      <div className="space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Family Tree (Households)</h1>
            <p className="text-sm text-gray-500 mt-1">
              Group siblings into household units for consolidated view and billing.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-2 px-5 py-3 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-bold shadow-md transition-colors duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Add Family Tree</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center space-x-3 max-w-md">
          <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by family name, contact or guardian..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-sm outline-hidden text-gray-800"
          />
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-navy-900 border-t-transparent"></div>
            <p className="text-sm font-bold text-navy-950 mt-4">Loading family listings...</p>
          </div>
        ) : families.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-gray-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Family Name</th>
                    <th className="py-4 px-6">Guardian / Contact</th>
                    <th className="py-4 px-6">Address</th>
                    <th className="py-4 px-6 text-center">Linked Students</th>
                    <th className="py-4 px-6 text-right">Combined Outstanding</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {families.map((family) => (
                    <tr key={family._id} className="hover:bg-slate-50/50 transition-colors duration-150">
                      <td className="py-4 px-6 font-extrabold text-navy-950">
                        {family.familyName}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900">{family.guardianName || '—'}</div>
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <Phone className="h-3 w-3 mr-1 text-gray-400" />
                          {family.contactNumber}
                        </div>
                      </td>
                      <td className="py-4 px-6 max-w-xs truncate" title={family.address}>
                        {family.address ? (
                          <div className="flex items-center">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 mr-1 flex-shrink-0" />
                            <span className="truncate">{family.address}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-navy-50 text-navy-800 border border-navy-100 shadow-2xs">
                            {family.students?.length || 0} Students
                          </span>
                          <div className="text-[10px] text-gray-400 max-w-[150px] truncate">
                            {family.students?.map(s => s.fullName).join(', ') || 'None linked'}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-navy-950">
                        Rs. 0.00
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => navigate(`/admin/family/${family._id}`)}
                            className="p-1.5 rounded-lg bg-navy-50 text-navy-700 hover:bg-navy-100 hover:text-navy-900 transition-colors"
                            title="View Family Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(family)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                            title="Delete Family"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs text-gray-500 font-medium">
                  Showing family {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalFamilies)} of {totalFamilies}
                </div>
                <div className="flex space-x-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-xs">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-navy-950">No families found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Create a family tree household to group sibling students under a unified contact profile.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-5 inline-flex items-center space-x-2 px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-bold shadow-xs transition-colors duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Add Family Tree</span>
            </button>
          </div>
        )}

        {/* Add Family Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8">
              
              {/* Modal Header */}
              <div className="bg-navy-900 text-white p-5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <UserPlus className="h-5 w-5 text-sky-400" />
                  <h3 className="text-lg font-extrabold tracking-tight">Create Family Tree</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmitFamily} className="flex-grow overflow-y-auto p-6 space-y-6">
                
                {/* Meta details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1">
                      Family Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mudasir Household"
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
                      placeholder="e.g. Mudasir Iqbal"
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
                      placeholder="e.g. +92 300 1234567"
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
                      placeholder="e.g. Alternate phone number"
                      value={alternateContact}
                      onChange={(e) => setAlternateContact(e.target.value)}
                      className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:border-navy-900 focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1">
                      Residential Address
                    </label>
                    <input
                      type="text"
                      placeholder="House, Street, Area, City"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:border-navy-900 focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1">
                      Admin Notes
                    </label>
                    <textarea
                      placeholder="Additional family background info..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:border-navy-900 focus:outline-hidden transition-colors resize-none"
                    />
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Sibling linkage */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1">
                      Search and Link Siblings
                    </label>
                    <div className="relative">
                      <div className="flex items-center border border-gray-200 rounded-xl p-3 bg-white focus-within:border-navy-900">
                        <Search className="h-4.5 w-4.5 text-gray-400 mr-2 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Type sibling's name or registration number..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="w-full text-sm outline-hidden text-gray-800"
                        />
                        {searchingStudents && (
                          <Loader2 className="h-4.5 w-4.5 text-gray-400 animate-spin flex-shrink-0" />
                        )}
                      </div>

                      {/* Search dropdown results */}
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100">
                          {searchResults.map((student) => {
                            const isSelected = selectedStudents.some(s => s._id === student._id);
                            return (
                              <div
                                key={student._id}
                                onClick={() => !isSelected && handleSelectStudent(student)}
                                className={`p-3 flex items-center justify-between text-xs sm:text-sm transition-colors ${
                                  isSelected 
                                    ? 'bg-slate-50 text-gray-400 cursor-not-allowed' 
                                    : 'hover:bg-slate-50 cursor-pointer text-gray-700'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-navy-950">{student.fullName}</span>
                                  <span className="text-[10px] text-gray-400 mt-0.5">
                                    Reg: {student.registrationNumber.toUpperCase()} | Class: {student.classId?.name} | Sec: {student.sectionId?.name}
                                  </span>
                                </div>
                                {student.familyId && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Already in: {student.familyId.familyName}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected students list */}
                  {selectedStudents.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-gray-400 block uppercase">Selected Siblings:</span>
                      <div className="grid grid-cols-1 gap-2.5">
                        {selectedStudents.map((student) => (
                          <div 
                            key={student._id} 
                            className="p-3 bg-slate-50 border border-gray-100 rounded-xl flex items-center justify-between text-xs sm:text-sm"
                          >
                            <div className="flex flex-col">
                              <span className="font-extrabold text-navy-950">{student.fullName}</span>
                              <span className="text-[10px] text-gray-400 mt-0.5">
                                Reg: {student.registrationNumber.toUpperCase()} | Class: {student.classId?.name} | Sec: {student.sectionId?.name}
                              </span>
                              {student.familyId && (
                                <span className="text-[10px] text-amber-600 font-semibold flex items-center mt-1">
                                  <Info className="h-3 w-3 mr-1" />
                                  Reassigns from family "{student.familyId.familyName}"
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedStudent(student._id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-slate-200 hover:text-gray-600 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reassignment Conflict Alert */}
                  {hasReassignmentConflict && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-3">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">Household Conflict Warning</h4>
                          <p className="text-xs text-amber-700 mt-1">
                            One or more selected siblings are already linked to another family tree. Creating this family will pull them from their previous households.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2.5 pl-7">
                        <input
                          type="checkbox"
                          id="reassign-confirm"
                          checked={reassign}
                          onChange={(e) => setReassign(e.target.checked)}
                          className="h-4 w-4 rounded-sm text-navy-900 border-gray-300 focus:ring-navy-900 focus:outline-hidden"
                        />
                        <label htmlFor="reassign-confirm" className="text-xs font-bold text-amber-800 cursor-pointer select-none">
                          Yes, confirm atomic reassignment for conflicting siblings
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-150">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-3 border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (hasReassignmentConflict && !reassign)}
                    className="px-5 py-3 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl transition-colors text-xs shadow-md disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Create Family Tree</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDeleteFamily}
          title="Delete Family Tree"
          message={`Are you sure you want to delete "${familyToDelete?.familyName}"? This will only dissolve the family grouping. Sibling students and their respective fee ledgers will remain completely unaffected.`}
          confirmText="Yes, Dissolve Grouping"
          cancelText="Cancel"
        />

      </div>
    </DashboardLayout>
  );
};

export default AdminFamilyList;
