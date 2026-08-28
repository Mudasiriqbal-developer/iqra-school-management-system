import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Edit2, Plus, Phone, MapPin, User, X, DollarSign, BookOpen, Download, Loader2, AlertTriangle, Info, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { 
  getFamilyById, 
  updateFamily, 
  updateFamilyStudents, 
  getFamilyFeeSummary, 
  getFamilyBooksSummary, 
  payFamilyFees, 
  downloadFamilyVoucherPDF 
} from './familyService';
import { getStudents } from '../students/studentService';

const FamilyDetailModal = ({ familyId, onClose, isFullPage = false }) => {
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

  // Financial details states
  const [feeSummary, setFeeSummary] = useState(null);
  const [booksSummary, setBooksSummary] = useState(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  // Pay modal states
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedFeeRecordIds, setSelectedFeeRecordIds] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Ref for click-outside detection on search container
  const searchContainerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load family data
  const loadFamilyDetails = async () => {
    try {
      setLoading(true);
      const res = await getFamilyById(familyId);
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
      if (onClose) onClose();
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialData = async () => {
    try {
      setLoadingFinancials(true);
      const [feeRes, booksRes] = await Promise.all([
        getFamilyFeeSummary(familyId),
        getFamilyBooksSummary(familyId)
      ]);
      if (feeRes.success) {
        setFeeSummary(feeRes.data);
      }
      if (booksRes.success) {
        setBooksSummary(booksRes.data);
      }
    } catch (err) {
      console.error('Failed to load financial data:', err);
    } finally {
      setLoadingFinancials(false);
    }
  };

  useEffect(() => {
    if (familyId) {
      loadFamilyDetails();
      loadFinancialData();
    }
  }, [familyId]);

  const openPayModal = () => {
    // Generate UUID client-side when opening
    const key = (self.crypto && self.crypto.randomUUID) 
      ? self.crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setIdempotencyKey(key);
    
    // Default: all checked
    if (feeSummary && feeSummary.students) {
      const allIds = feeSummary.students.flatMap(s => s.outstandingRecords.map(r => r.feeRecordId));
      setSelectedFeeRecordIds(allIds);
    } else {
      setSelectedFeeRecordIds([]);
    }
    
    setPaymentMethod('cash');
    setPaymentSuccessData(null);
    setIsPaying(false);
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (selectedFeeRecordIds.length === 0) {
      toast.error('Please select at least one fee record to pay');
      return;
    }

    try {
      setIsPaying(true);
      const res = await payFamilyFees(familyId, {
        feeRecordIds: selectedFeeRecordIds,
        paymentMethod,
        idempotencyKey
      });

      if (res.success) {
        toast.success(res.message || 'Payment processed successfully');
        setPaymentSuccessData(res.data);
        // Refresh family, fee summary, books summary
        await loadFamilyDetails();
        await loadFinancialData();
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Payment failed';
      toast.error(errMsg);
    } finally {
      setIsPaying(false);
    }
  };

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
      const res = await updateFamily(familyId, {
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
      const res = await updateFamilyStudents(familyId, {
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
      const res = await updateFamilyStudents(familyId, {
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-navy-900 border-t-transparent"></div>
          <p className="text-sm font-bold text-navy-950 mt-4">Loading family profile...</p>
        </div>
      );
    }

    if (!family) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Left side: Profile Metadata & Controls */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-extrabold text-navy-955 tracking-tight">
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
                  <span className="font-bold text-gray-900 block mt-0.5">{family.guardianName}</span>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-gray-400 block uppercase">Contact Number</span>
                <span className="font-bold text-gray-900 block mt-0.5">{family.contactNumber}</span>
              </div>
              {family.alternateContact && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 block uppercase">Alternate Contact</span>
                  <span className="font-bold text-gray-900 block mt-0.5">{family.alternateContact}</span>
                </div>
              )}
              {family.address && (
                <div>
                  <span className="text-xs font-semibold text-gray-400 block uppercase">Residential Address</span>
                  <span className="font-bold text-gray-900 block mt-0.5 leading-relaxed">{family.address}</span>
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
              <h3 className="text-sm font-extrabold text-navy-955 uppercase tracking-wider">
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
                <div className="relative" ref={searchContainerRef}>
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
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[280px] overflow-y-auto bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg divide-y divide-gray-100 dark:divide-slate-700">
                      {searchResults.map((student) => (
                        <div
                          key={student._id}
                          onClick={() => {
                            setSelectedStudentToLink(student);
                            setStudentSearch('');
                            setSearchResults([]);
                          }}
                          className="p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer text-gray-700 dark:text-slate-300 flex flex-col"
                        >
                          <span className="font-extrabold text-navy-955 dark:text-sky-400">{student.fullName}</span>
                          <span className="text-[9px] text-gray-400 dark:text-slate-400 mt-0.5">
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
                      <div className="font-extrabold text-navy-955">{selectedStudentToLink.fullName}</div>
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 text-left">
            <h3 className="text-sm font-extrabold text-navy-955 uppercase tracking-wider">
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
                        <h4 className="font-extrabold text-navy-955 text-sm truncate" title={student.fullName}>
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

          {/* Combined Fee & Books Panel */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5 text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-navy-955 uppercase tracking-wider flex items-center">
                  <DollarSign className="h-4.5 w-4.5 mr-1 text-navy-950" />
                  Combined Household Accounts
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Consolidated fee balance and issued assets across all siblings.</p>
              </div>
              
              <button
                onClick={openPayModal}
                disabled={!feeSummary || feeSummary.familyTotal === 0}
                className={`px-4 py-2 border rounded-xl text-xs font-extrabold flex items-center space-x-1 transition-colors ${
                  feeSummary && feeSummary.familyTotal > 0
                    ? 'bg-navy-900 hover:bg-navy-800 text-white border-navy-955 shadow-xs'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
              >
                <span>Pay Combined Fees</span>
              </button>
            </div>

            {/* Stat cards block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fee Panel */}
              <div className="p-4 bg-slate-50 rounded-xl border border-gray-150 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Combined Outstanding Dues</span>
                  <span className="text-lg font-black text-navy-950">
                    Rs. {feeSummary ? feeSummary.familyTotal.toFixed(2) : '0.00'}
                  </span>
                </div>
                
                <div className="divide-y divide-gray-100 border-t border-gray-150 pt-2 space-y-1.5 max-h-48 overflow-y-auto">
                  {feeSummary && feeSummary.students && feeSummary.students.length > 0 ? (
                    feeSummary.students.map((student) => (
                      <div key={student.studentId} className="flex justify-between items-center text-xs pt-1.5">
                        <div className="min-w-0">
                          <span className="font-bold text-gray-700 block truncate">{student.studentName}</span>
                          <span className="text-[10px] text-gray-400 block">{student.classSection}</span>
                        </div>
                        <span className="font-extrabold text-navy-900">
                          Rs. {student.studentTotal.toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 italic py-2">No students or fee data available.</p>
                  )}
                </div>
              </div>

              {/* Books Panel */}
              <div className="p-4 bg-slate-50 rounded-xl border border-gray-150 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Combined Books Outstanding</span>
                  <span className="text-lg font-black text-navy-950">—</span>
                </div>

                <div className="divide-y divide-gray-100 border-t border-gray-150 pt-2 space-y-1.5 max-h-48 overflow-y-auto">
                  {booksSummary && booksSummary.students && booksSummary.students.length > 0 ? (
                    booksSummary.students.map((student) => (
                      <div key={student.studentId} className="flex justify-between items-center text-xs pt-1.5">
                        <div className="min-w-0">
                          <span className="font-bold text-gray-700 block truncate">{student.studentName}</span>
                        </div>
                        <span className="font-bold text-gray-400">—</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 italic py-2">No students or books data available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment History Panel */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4 text-left">
            <h3 className="text-sm font-extrabold text-navy-955 uppercase tracking-wider flex items-center">
              <BookOpen className="h-4.5 w-4.5 mr-1 text-navy-950" />
              Combined Payment History
            </h3>

            {family && family.vouchers && family.vouchers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="p-3">Voucher No</th>
                      <th className="p-3">Payment Date</th>
                      <th className="p-3">Method</th>
                      <th className="p-3 text-right">Total Paid</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {family.vouchers.map((voucher) => (
                      <tr key={voucher._id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-extrabold text-navy-950">{voucher.voucherNumber}</td>
                        <td className="p-3 text-gray-600">
                          {new Date(voucher.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-gray-600 uppercase">{voucher.paymentMethod}</td>
                        <td className="p-3 text-right font-extrabold text-navy-900">
                          Rs. {voucher.totalAmount.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => downloadFamilyVoucherPDF(familyId, voucher._id, `family-voucher-${voucher.voucherNumber}.pdf`)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-900 rounded-lg border border-navy-150 transition-colors font-bold text-[10px]"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 text-center">
                No combined family payments recorded yet.
              </p>
            )}
          </div>

        </div>

      </div>
    );
  };

  const renderSubModals = () => {
    if (!family) return null;

    return (
      <>
        {/* Edit Family Info Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden my-8" onClick={(e) => e.stopPropagation()}>
              
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
              <form onSubmit={handleUpdateFamily} className="p-6 space-y-4 text-left">
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
                  <label className="text-xs font-bold text-navy-955 uppercase tracking-wide block mb-1">
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
                  <label className="text-xs font-bold text-navy-955 uppercase tracking-wide block mb-1">
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
                  <label className="text-xs font-bold text-navy-955 uppercase tracking-wide block mb-1">
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
                  <label className="text-xs font-bold text-navy-955 uppercase tracking-wide block mb-1">
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

        {/* Pay as Family Modal */}
        {isPayModalOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-xl w-full flex flex-col overflow-hidden my-8" onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="bg-navy-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-sky-400" />
                  <h3 className="text-base font-extrabold tracking-tight">Pay Combined Fees</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {!paymentSuccessData ? (
                  <form onSubmit={handleConfirmPayment} className="space-y-5 text-left">
                    
                    {/* Header info */}
                    <div className="p-3.5 bg-slate-50 border border-gray-150 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-550">Family Name:</span>
                        <span className="font-extrabold text-navy-950">{family?.familyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-555">Idempotency Key:</span>
                        <span className="text-[10px] font-mono text-gray-400">{idempotencyKey}</span>
                      </div>
                    </div>

                    {/* Outstanding list */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-navy-955 uppercase tracking-wide block">
                        Select Fees to Pay
                      </label>
                      
                      <div className="space-y-3.5 max-h-60 overflow-y-auto divide-y divide-gray-100 pr-1">
                        {feeSummary && feeSummary.students && feeSummary.students.length > 0 ? (
                          feeSummary.students.map((student) => {
                            if (student.outstandingRecords.length === 0) return null;
                            return (
                              <div key={student.studentId} className="pt-3 space-y-2">
                                <div className="text-xs font-extrabold text-navy-950 flex justify-between">
                                  <span>{student.studentName}</span>
                                  <span className="text-[10px] text-gray-400 font-semibold">{student.classSection}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {student.outstandingRecords.map((record) => {
                                    const isChecked = selectedFeeRecordIds.includes(record.feeRecordId);
                                    return (
                                      <label
                                        key={record.feeRecordId}
                                        className={`flex items-center justify-between p-2.5 border rounded-xl cursor-pointer text-xs transition-colors ${
                                          isChecked
                                            ? 'bg-navy-50/50 border-navy-200'
                                            : 'bg-white border-gray-250 hover:bg-slate-50'
                                        }`}
                                      >
                                        <div className="flex items-center space-x-2">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              if (isChecked) {
                                                setSelectedFeeRecordIds(prev => prev.filter(id => id !== record.feeRecordId));
                                              } else {
                                                setSelectedFeeRecordIds(prev => [...prev, record.feeRecordId]);
                                              }
                                            }}
                                            className="h-4 w-4 rounded-sm text-navy-900 border-gray-300 focus:ring-navy-900"
                                          />
                                          <span className="font-bold text-gray-700">{record.title || record.month}</span>
                                        </div>
                                        <span className="font-extrabold text-navy-900">Rs. {record.amount.toFixed(2)}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-gray-400 italic py-2">No outstanding fees found.</p>
                        )}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-navy-955 uppercase tracking-wide block">
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-gray-250 focus:border-navy-900 focus:outline-hidden transition-colors font-bold text-gray-800"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card">Card</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Running Total & Submit */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-150">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Running Total (Selected)</span>
                        <span className="text-lg font-black text-navy-955">
                          Rs. {
                            feeSummary?.students
                              ?.flatMap(s => s.outstandingRecords)
                              ?.filter(r => selectedFeeRecordIds.includes(r.feeRecordId))
                              ?.reduce((sum, r) => sum + r.amount, 0)
                              ?.toFixed(2) || '0.00'
                          }
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setIsPayModalOpen(false)}
                          className="px-4 py-2.5 border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isPaying || selectedFeeRecordIds.length === 0}
                          className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl transition-colors text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                        >
                          {isPaying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          <span>Confirm Payment</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  // Success State View
                  <div className="py-6 text-center space-y-5">
                    <div className="h-14 w-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto text-green-600">
                      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-lg font-black text-navy-950">Payment Successful!</h4>
                      <p className="text-xs text-gray-400">Consolidated family receipt voucher has been generated.</p>
                    </div>

                    <div className="max-w-xs mx-auto p-4 bg-slate-50 border border-gray-155 rounded-xl text-left text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-550">Voucher Number:</span>
                        <span className="font-extrabold text-navy-950">{paymentSuccessData.voucherNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-555">Total Paid Amount:</span>
                        <span className="font-extrabold text-navy-950">Rs. {paymentSuccessData.totalAmount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-555">Method:</span>
                        <span className="font-bold text-gray-700 uppercase">{paymentSuccessData.paymentMethod}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                      <button
                        onClick={() => {
                          downloadFamilyVoucherPDF(familyId, paymentSuccessData._id, `family-voucher-${paymentSuccessData.voucherNumber}.pdf`);
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl transition-colors text-xs shadow-md flex items-center justify-center space-x-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Voucher PDF</span>
                      </button>
                      <button
                        onClick={() => setIsPayModalOpen(false)}
                        className="w-full sm:w-auto px-5 py-2.5 border border-gray-255 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-xs flex items-center justify-center"
                      >
                        Close Window
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3 text-left">
          <button 
            onClick={onClose} 
            className="p-2 bg-white rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors animate-in slide-in-from-left duration-200"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <span className="text-sm font-bold text-gray-400">Back to Family Tree</span>
        </div>
        {renderContent()}
        {renderSubModals()}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-gray-150 overflow-hidden flex flex-col max-h-[90vh] my-8 animate-in fade-in zoom-in-95 duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-navy-900 text-white p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-sky-400" />
            <h3 className="text-lg font-extrabold tracking-tight">Family Profile Detail</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors animate-in spin-in-12 duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-grow overflow-y-auto p-6 min-h-0">
          {renderContent()}
        </div>
      </div>
      {renderSubModals()}
    </div>
  );
};

export default FamilyDetailModal;
