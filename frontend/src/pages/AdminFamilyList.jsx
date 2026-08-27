import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Phone, MapPin, X, Info, AlertTriangle, Loader2, UserPlus, Eye, Trash2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/shared/DashboardLayout';
import StatusBadge from '../components/shared/StatusBadge';
import ConfirmModal from '../components/shared/ConfirmModal';
import { getFamilies, deleteFamily, createFamilyWithEnrollment } from '../features/family/familyService';
import { getStudents, getClasses, getSectionsByClass } from '../features/students/studentService';

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

  // Wizard States
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [address, setAddress] = useState('');
  const [members, setMembers] = useState([]);
  const [errorsStep1, setErrorsStep1] = useState({});

  // Class & Section data for dropdowns
  const [classes, setClasses] = useState([]);
  const [sectionsMap, setSectionsMap] = useState({}); // { [classId]: [sections] }
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Ref for row-level search timeouts
  const searchTimeouts = useRef({});

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

  // Helper to create empty member
  const createEmptyMember = (mode = 'existing') => ({
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    mode, // 'existing' | 'new'
    studentId: '',
    selectedStudent: null,
    studentSearch: '',
    searchResults: [],
    searching: false,
    studentData: {
      name: '',
      dateOfBirth: '',
      gender: '',
      classId: '',
      sectionId: '',
      parentName: '',
      fatherContact: '',
    },
    feeConfig: {
      monthlyFee: '',
      bookFee: '',
      bookFeeDueDate: '',
    },
    errors: {},
    serverErrors: [],
  });

  // Fetch all classes once
  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const res = await getClasses();
      if (res.success) {
        setClasses(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  // Fetch sections of class dynamically
  const fetchSectionsForClass = async (classId) => {
    if (!classId || sectionsMap[classId]) return;
    try {
      const res = await getSectionsByClass(classId);
      if (res.success) {
        setSectionsMap(prev => ({
          ...prev,
          [classId]: res.data
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sections for this class');
    }
  };

  // Validate a single member's data
  const validateMember = (member, allMembers) => {
    const errors = {};

    if (member.mode === 'existing') {
      if (!member.studentId) {
        errors.studentId = 'Existing student must be selected';
      }
    } else if (member.mode === 'new') {
      const { name, dateOfBirth, gender, classId, sectionId, parentName, fatherContact } = member.studentData;
      const { monthlyFee, bookFee, bookFeeDueDate } = member.feeConfig;

      if (!name.trim()) {
        errors.name = 'Full name is required';
      }

      if (!dateOfBirth) {
        errors.dateOfBirth = 'Date of birth is required';
      } else {
        const dobDate = new Date(dateOfBirth);
        if (isNaN(dobDate.getTime())) {
          errors.dateOfBirth = 'Invalid date format';
        } else if (dobDate >= new Date()) {
          errors.dateOfBirth = 'Date of birth must be in the past';
        }
      }

      if (!gender) {
        errors.gender = 'Gender is required';
      } else if (!['male', 'female', 'other'].includes(gender)) {
        errors.gender = 'Gender must be male, female, or other';
      }

      if (!classId) {
        errors.classId = 'Class is required';
      }

      if (!sectionId) {
        errors.sectionId = 'Section is required';
      }

      if (!parentName.trim()) {
        errors.parentName = "Parent/Father's name is required";
      }

      if (!fatherContact.trim()) {
        errors.fatherContact = "Father's contact is required";
      }

      if (monthlyFee === undefined || monthlyFee === null || monthlyFee === '') {
        errors.monthlyFee = 'Monthly fee is required';
      } else {
        const feeNum = parseFloat(monthlyFee);
        if (isNaN(feeNum) || feeNum < 0) {
          errors.monthlyFee = 'Monthly fee must be >= 0';
        }
      }

      if (bookFee !== undefined && bookFee !== null && bookFee !== '') {
        const bookFeeNum = parseFloat(bookFee);
        if (isNaN(bookFeeNum) || bookFeeNum < 0) {
          errors.bookFee = 'Book fee must be >= 0';
        }
        if (bookFeeNum > 0 && !bookFeeDueDate) {
          errors.bookFeeDueDate = 'Book fee due date is required when book fee > 0';
        }
      }
    }

    return errors;
  };

  // Find duplicate fingerprints across all new rows
  const checkDuplicateFingerprints = (currentMembers) => {
    const fingerprints = {};
    const duplicateIds = new Set();

    currentMembers.forEach(m => {
      if (m.mode === 'new') {
        const name = (m.studentData.name || '').trim().toLowerCase();
        const dob = m.studentData.dateOfBirth || '';
        const contact = (m.studentData.fatherContact || '').trim().replace(/\D/g, '');

        if (name && dob && contact) {
          const fp = `${name}_${dob}_${contact}`;
          if (fingerprints[fp]) {
            duplicateIds.add(m.id);
            duplicateIds.add(fingerprints[fp]);
          } else {
            fingerprints[fp] = m.id;
          }
        }
      }
    });

    return duplicateIds;
  };

  const handleOpenAddModal = () => {
    setFamilyName('');
    setContactInfo('');
    setAddress('');
    setErrorsStep1({});
    setStep(1);
    setMembers([createEmptyMember('existing')]);
    setIsAddModalOpen(true);
    fetchClasses();
  };

  const handleStudentSearchChange = (rowId, query) => {
    setMembers(prev => prev.map(m => m.id === rowId ? { ...m, studentSearch: query } : m));

    if (searchTimeouts.current[rowId]) {
      clearTimeout(searchTimeouts.current[rowId]);
    }

    if (!query.trim()) {
      setMembers(prev => prev.map(m => m.id === rowId ? { ...m, searchResults: [] } : m));
      return;
    }

    setMembers(prev => prev.map(m => m.id === rowId ? { ...m, searching: true } : m));

    searchTimeouts.current[rowId] = setTimeout(async () => {
      try {
        const res = await getStudents({ search: query, limit: 10 });
        if (res.success) {
          setMembers(prev => prev.map(m => m.id === rowId ? { ...m, searchResults: res.data.students, searching: false } : m));
        }
      } catch (err) {
        console.error(err);
        setMembers(prev => prev.map(m => m.id === rowId ? { ...m, searching: false } : m));
      }
    }, 400);
  };

  const handleSelectExistingStudent = (rowId, student) => {
    // Avoid duplicate selection across different rows
    const isAlreadySelected = members.some(m => m.studentId === student._id && m.id !== rowId);
    if (isAlreadySelected) {
      toast.error('This student is already selected in another row');
      return;
    }

    setMembers(prev => {
      const updated = prev.map(m => {
        if (m.id === rowId) {
          const updatedRow = {
            ...m,
            studentId: student._id,
            selectedStudent: student,
            studentSearch: '',
            searchResults: [],
            serverErrors: [],
          };
          updatedRow.errors = validateMember(updatedRow, prev);
          return updatedRow;
        }
        return m;
      });
      return updated;
    });
  };

  const handleRemoveSelectedExistingStudent = (rowId) => {
    setMembers(prev => {
      return prev.map(m => {
        if (m.id === rowId) {
          const updatedRow = {
            ...m,
            studentId: '',
            selectedStudent: null,
            serverErrors: [],
          };
          updatedRow.errors = validateMember(updatedRow, prev);
          return updatedRow;
        }
        return m;
      });
    });
  };

  const handleToggleMode = (rowId, mode) => {
    setMembers(prev => {
      const updated = prev.map(m => {
        if (m.id === rowId) {
          const resetRow = createEmptyMember(mode);
          resetRow.id = rowId;
          return resetRow;
        }
        return m;
      });
      const duplicateIds = checkDuplicateFingerprints(updated);
      return updated.map(m => {
        const errors = { ...m.errors };
        if (duplicateIds.has(m.id)) {
          errors.duplicate = 'Duplicate student details found in another row';
        } else {
          delete errors.duplicate;
        }
        return { ...m, errors };
      });
    });
  };

  const handleAddMemberRow = () => {
    setMembers(prev => [...prev, createEmptyMember('existing')]);
  };

  const handleRemoveMemberRow = (rowId) => {
    if (members.length <= 1) {
      toast.error('At least one family member is required');
      return;
    }
    setMembers(prev => {
      const updated = prev.filter(m => m.id !== rowId);
      const duplicateIds = checkDuplicateFingerprints(updated);
      return updated.map(m => {
        const errors = { ...m.errors };
        if (duplicateIds.has(m.id)) {
          errors.duplicate = 'Duplicate student details found in another row';
        } else {
          delete errors.duplicate;
        }
        return { ...m, errors };
      });
    });
  };

  const handleNewStudentDataChange = (rowId, field, value) => {
    setMembers(prev => {
      const updated = prev.map(m => {
        if (m.id === rowId) {
          const newStudentData = { ...m.studentData, [field]: value };
          if (field === 'classId') {
            newStudentData.sectionId = '';
            fetchSectionsForClass(value);
          }
          const updatedRow = { ...m, studentData: newStudentData, serverErrors: [] };
          updatedRow.errors = validateMember(updatedRow, prev);
          return updatedRow;
        }
        return m;
      });

      const duplicateIds = checkDuplicateFingerprints(updated);
      return updated.map(m => {
        const errors = { ...m.errors };
        if (duplicateIds.has(m.id)) {
          errors.duplicate = 'Duplicate student details found in another row';
        } else {
          delete errors.duplicate;
        }
        return { ...m, errors };
      });
    });
  };

  const handleFeeConfigChange = (rowId, field, value) => {
    setMembers(prev => {
      return prev.map(m => {
        if (m.id === rowId) {
          const newFeeConfig = { ...m.feeConfig, [field]: value };
          // If bookFee is cleared or <= 0, also clear bookFeeDueDate
          if (field === 'bookFee' && (value === '' || parseFloat(value) <= 0)) {
            newFeeConfig.bookFeeDueDate = '';
          }
          const updatedRow = { ...m, feeConfig: newFeeConfig, serverErrors: [] };
          updatedRow.errors = validateMember(updatedRow, prev);
          return updatedRow;
        }
        return m;
      });
    });
  };

  const handleNextStep = () => {
    const errs = {};
    if (!familyName.trim()) errs.familyName = 'Family Name is required';
    if (!contactInfo.trim()) errs.contactInfo = 'Contact Number is required';
    
    if (Object.keys(errs).length > 0) {
      setErrorsStep1(errs);
      toast.error('Please fix the errors in Step 1');
      return;
    }
    setErrorsStep1({});
    setStep(2);
  };

  const handleSubmitWizard = async (e) => {
    e.preventDefault();

    const errs1 = {};
    if (!familyName.trim()) errs1.familyName = 'Family Name is required';
    if (!contactInfo.trim()) errs1.contactInfo = 'Contact Number is required';
    
    if (Object.keys(errs1).length > 0) {
      setErrorsStep1(errs1);
      setStep(1);
      toast.error('Please fix the errors in Step 1');
      return;
    }

    let hasErrors = false;
    const duplicateIds = checkDuplicateFingerprints(members);

    const validatedMembers = members.map(m => {
      const errors = validateMember(m, members);
      if (duplicateIds.has(m.id)) {
        errors.duplicate = 'Duplicate student details found in another row';
      }
      if (Object.keys(errors).length > 0) {
        hasErrors = true;
      }
      return { ...m, errors, serverErrors: [] };
    });

    if (hasErrors) {
      setMembers(validatedMembers);
      toast.error('Please fix validation errors on member rows');
      return;
    }

    // Build api payload
    const payloadMembers = members.map(m => {
      if (m.mode === 'existing') {
        return {
          mode: 'existing',
          studentId: m.studentId,
        };
      } else {
        const studentData = {
          name: m.studentData.name.trim(),
          dateOfBirth: m.studentData.dateOfBirth,
          gender: m.studentData.gender,
          classId: m.studentData.classId,
          sectionId: m.studentData.sectionId,
          parentName: m.studentData.parentName.trim(),
          fatherContact: m.studentData.fatherContact.trim(),
        };
        const feeConfig = {
          monthlyFee: parseFloat(m.feeConfig.monthlyFee) || 0,
        };
        if (m.feeConfig.bookFee !== '' && m.feeConfig.bookFee !== undefined) {
          feeConfig.bookFee = parseFloat(m.feeConfig.bookFee);
          if (feeConfig.bookFee > 0) {
            feeConfig.bookFeeDueDate = m.feeConfig.bookFeeDueDate;
          }
        }
        return {
          mode: 'new',
          studentData,
          feeConfig,
        };
      }
    });

    const payload = {
      familyName: familyName.trim(),
      address: address.trim(),
      contactInfo: contactInfo.trim(),
      members: payloadMembers,
    };

    try {
      setSubmitting(true);
      const res = await createFamilyWithEnrollment(payload);
      if (res.success) {
        setIsAddModalOpen(false);
        fetchFamilies();

        if (res.createdStudents && res.createdStudents.length > 0) {
          toast((t) => (
            <div className="flex flex-col space-y-1">
              <span className="font-bold text-gray-900 text-sm">Family created successfully!</span>
              <span className="text-xs text-gray-500 font-semibold block mt-1">New students enrolled:</span>
              <ul className="list-disc list-inside space-y-1 text-xs text-navy-950 font-medium">
                {res.createdStudents.map(s => (
                  <li key={s.studentId || s.regNumber}>
                    <span className="font-extrabold text-navy-950">{s.name}</span> — Reg #{s.regNumber}
                  </li>
                ))}
              </ul>
            </div>
          ), {
            duration: 8000,
            icon: '🎉',
          });
        } else {
          toast.success('Family tree created successfully!');
        }
      }
    } catch (err) {
      console.error(err);
      const responseData = err.response?.data;
      if (responseData && responseData.errors && Array.isArray(responseData.errors)) {
        // Map server errors to rows - NO generic toast
        setMembers(prev => {
          const updated = [...prev];
          responseData.errors.forEach(errItem => {
            if (updated[errItem.index]) {
              updated[errItem.index] = {
                ...updated[errItem.index],
                serverErrors: errItem.errors,
              };
            }
          });
          return updated;
        });
      } else {
        const errMsg = responseData?.message || 'Failed to create family with enrollment';
        toast.error(errMsg);
      }
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

        {/* Add Family Modal / Wizard */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto">
            <div className={`bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8 transition-all duration-300 ${step === 1 ? 'max-w-2xl' : 'max-w-5xl'}`}>
              
              {/* Modal Header */}
              <div className="bg-navy-900 text-white p-5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <UserPlus className="h-5 w-5 text-sky-400" />
                  <h3 className="text-lg font-extrabold tracking-tight">Create Family Tree & Enroll Siblings</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body / Wizard Forms */}
              <form onSubmit={handleSubmitWizard} className="flex flex-col flex-grow overflow-hidden">
                
                {/* Step 1: Family Meta Details */}
                {step === 1 && (
                  <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <span className="text-xs font-bold text-navy-900 bg-navy-50 px-3 py-1 rounded-full uppercase tracking-wider">Step 1 of 2: Family Profile</span>
                      <span className="text-xs font-semibold text-gray-400">Next: Sibling Members</span>
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                      <div>
                        <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1.5">
                          Family Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Mudasir Household"
                          value={familyName}
                          onChange={(e) => {
                            setFamilyName(e.target.value);
                            if (errorsStep1.familyName) {
                              setErrorsStep1(prev => ({ ...prev, familyName: '' }));
                            }
                          }}
                          className={`w-full text-sm p-3 rounded-xl border focus:outline-hidden transition-colors ${
                            errorsStep1.familyName ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-navy-900'
                          }`}
                        />
                        {errorsStep1.familyName && (
                          <p className="text-red-500 text-xs font-medium mt-1">{errorsStep1.familyName}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1.5">
                          Contact Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. +92 300 1234567"
                          value={contactInfo}
                          onChange={(e) => {
                            setContactInfo(e.target.value);
                            if (errorsStep1.contactInfo) {
                              setErrorsStep1(prev => ({ ...prev, contactInfo: '' }));
                            }
                          }}
                          className={`w-full text-sm p-3 rounded-xl border focus:outline-hidden transition-colors ${
                            errorsStep1.contactInfo ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-navy-900'
                          }`}
                        />
                        {errorsStep1.contactInfo && (
                          <p className="text-red-500 text-xs font-medium mt-1">{errorsStep1.contactInfo}</p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1.5">
                          Residential Address
                        </label>
                        <textarea
                          placeholder="House, Street, Area, City"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          rows={3}
                          className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:border-navy-900 focus:outline-hidden transition-colors resize-none"
                        />
                      </div>
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-150">
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(false)}
                        className="px-5 py-3 border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-5 py-3 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl transition-colors text-xs shadow-md flex items-center space-x-1.5"
                      >
                        <span>Next: Add Members</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Sibling Members Row Manager */}
                {step === 2 && (
                  <div className="flex-grow p-6 flex flex-col overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-gray-100 mb-4 gap-2">
                      <span className="text-xs font-bold text-navy-900 bg-navy-50 px-3 py-1 rounded-full uppercase tracking-wider">Step 2 of 2: Family Sibling Members</span>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-xs font-bold text-navy-900 hover:underline flex items-center space-x-1"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Back to Family details</span>
                      </button>
                    </div>

                    {/* Repeatable List Section */}
                    <div className="flex-grow overflow-y-auto pr-1.5 space-y-6 mb-4">
                      {members.map((member, idx) => {
                        const hasDuplicateError = !!member.errors.duplicate;

                        return (
                          <div
                            key={member.id}
                            className={`p-5 rounded-2xl border transition-all duration-200 ${
                              member.serverErrors?.length > 0 || Object.keys(member.errors).length > 0
                                ? 'border-red-200 bg-red-50/10'
                                : 'border-gray-200 bg-slate-50/30'
                            }`}
                          >
                            
                            {/* Row Action Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 mb-4 border-b border-gray-200/80 gap-3">
                              <div className="flex items-center space-x-3">
                                <span className="h-6 w-6 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                                  {idx + 1}
                                </span>
                                <h4 className="text-sm font-extrabold text-navy-950 uppercase tracking-wider">
                                  {member.mode === 'existing' ? 'Link Existing Student' : 'Enroll New Sibling'}
                                </h4>
                              </div>

                              <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-3xs">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMode(member.id, 'existing')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                      member.mode === 'existing'
                                        ? 'bg-navy-900 text-white shadow-2xs'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                  >
                                    Existing Student
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMode(member.id, 'new')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                      member.mode === 'new'
                                        ? 'bg-navy-900 text-white shadow-2xs'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                  >
                                    New Student
                                  </button>
                                </div>

                                {members.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMemberRow(member.id)}
                                    className="p-1.5 rounded-lg border border-red-200 text-red-500 bg-white hover:bg-red-50 hover:text-red-600 transition-colors shadow-2xs"
                                    title="Remove Member Row"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Existing Student Search Mode */}
                            {member.mode === 'existing' && (
                              <div className="space-y-3">
                                {!member.selectedStudent ? (
                                  <div>
                                    <label className="text-xs font-bold text-navy-950 uppercase tracking-wide block mb-1">
                                      Search and Link Student
                                    </label>
                                    <div className="relative">
                                      <div className="flex items-center border border-gray-200 rounded-xl p-3 bg-white focus-within:border-navy-900">
                                        <Search className="h-4.5 w-4.5 text-gray-400 mr-2 flex-shrink-0" />
                                        <input
                                          type="text"
                                          placeholder="Type sibling's name or registration number..."
                                          value={member.studentSearch}
                                          onChange={(e) => handleStudentSearchChange(member.id, e.target.value)}
                                          className="w-full text-sm outline-hidden text-gray-800"
                                        />
                                        {member.searching && (
                                          <Loader2 className="h-4.5 w-4.5 text-gray-400 animate-spin flex-shrink-0" />
                                        )}
                                      </div>

                                      {/* Row Search Dropdown results */}
                                      {member.searchResults?.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-100">
                                          {member.searchResults.map((student) => {
                                            const isSelectedElsewhere = members.some(m => m.studentId === student._id && m.id !== member.id);
                                            return (
                                              <div
                                                key={student._id}
                                                onClick={() => !isSelectedElsewhere && handleSelectExistingStudent(member.id, student)}
                                                className={`p-3 flex items-center justify-between text-xs sm:text-sm transition-colors ${
                                                  isSelectedElsewhere
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
                                    {member.errors.studentId && (
                                      <p className="text-red-500 text-xs font-semibold mt-1">{member.errors.studentId}</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-4 bg-white border border-gray-150 rounded-xl flex items-center justify-between shadow-3xs">
                                    <div className="flex flex-col">
                                      <span className="font-extrabold text-navy-950 text-sm">{member.selectedStudent.fullName}</span>
                                      <span className="text-xs text-gray-500 mt-0.5">
                                        Registration: <span className="font-semibold text-navy-900">{member.selectedStudent.registrationNumber.toUpperCase()}</span> | 
                                        Class: <span className="font-semibold text-navy-900">{member.selectedStudent.classId?.name || '—'}</span> | 
                                        Section: <span className="font-semibold text-navy-900">{member.selectedStudent.sectionId?.name || '—'}</span>
                                      </span>
                                      {member.selectedStudent.familyId && (
                                        <span className="text-[10px] text-amber-600 font-semibold flex items-center mt-1">
                                          <Info className="h-3.5 w-3.5 mr-1" />
                                          Will reassign from family "{member.selectedStudent.familyId.familyName}"
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSelectedExistingStudent(member.id)}
                                      className="p-1.5 rounded-lg text-gray-400 hover:bg-slate-100 hover:text-gray-600 transition-colors border border-gray-200 shadow-3xs"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* New Student Input Section */}
                            {member.mode === 'new' && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="text-[10px] font-extrabold text-navy-950 uppercase block mb-1">
                                      Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Full name of student"
                                      value={member.studentData.name}
                                      onChange={(e) => handleNewStudentDataChange(member.id, 'name', e.target.value)}
                                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                                        member.errors.name ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-900 bg-white'
                                      }`}
                                    />
                                    {member.errors.name && (
                                      <p className="text-red-500 text-[10px] font-semibold mt-1">{member.errors.name}</p>
                                    )}
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-extrabold text-navy-950 uppercase block mb-1">
                                      Date of Birth <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="date"
                                      value={member.studentData.dateOfBirth}
                                      onChange={(e) => handleNewStudentDataChange(member.id, 'dateOfBirth', e.target.value)}
                                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                                        member.errors.dateOfBirth ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-900 bg-white'
                                      }`}
                                    />
                                    {member.errors.dateOfBirth && (
                                      <p className="text-red-500 text-[10px] font-semibold mt-1">{member.errors.dateOfBirth}</p>
                                    )}
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-extrabold text-navy-950 uppercase block mb-1">
                                      Gender <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      value={member.studentData.gender}
                                      onChange={(e) => handleNewStudentDataChange(member.id, 'gender', e.target.value)}
                                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                                        member.errors.gender ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-900 bg-white'
                                      }`}
                                    >
                                      <option value="">Select Gender</option>
                                      <option value="male">Male</option>
                                      <option value="female">Female</option>
                                      <option value="other">Other</option>
                                    </select>
                                    {member.errors.gender && (
                                      <p className="text-red-500 text-[10px] font-semibold mt-1">{member.errors.gender}</p>
                                    )}
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-extrabold text-navy-950 uppercase block mb-1">
                                      Class <span className="text-red-500">*</span>
                                    </label>
                                    {loadingClasses ? (
                                      <div className="flex items-center text-xs p-2.5 border border-gray-200 bg-white rounded-xl">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-gray-400" />
                                        <span>Loading Classes...</span>
                                      </div>
                                    ) : (
                                      <select
                                        value={member.studentData.classId}
                                        onChange={(e) => handleNewStudentDataChange(member.id, 'classId', e.target.value)}
                                        className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                                          member.errors.classId ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-900 bg-white'
                                        }`}
                                      >
                                        <option value="">Select Class</option>
                                        {classes.map(cls => (
                                          <option key={cls._id} value={cls._id}>{cls.name}</option>
                                        ))}
                                      </select>
                                    )}
                                    {member.errors.classId && (
                                      <p className="text-red-500 text-[10px] font-semibold mt-1">{member.errors.classId}</p>
                                    )}
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-extrabold text-navy-950 uppercase block mb-1">
                                      Section <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      value={member.studentData.sectionId}
                                      onChange={(e) => handleNewStudentDataChange(member.id, 'sectionId', e.target.value)}
                                      disabled={!member.studentData.classId}
                                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                                        !member.studentData.classId ? 'bg-slate-100 border-gray-200 cursor-not-allowed' :
                                        member.errors.sectionId ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-900 bg-white'
                                      }`}
                                    >
                                      <option value="">Select Section</option>
                                      {(sectionsMap[member.studentData.classId] || []).map(sec => (
                                        <option key={sec._id} value={sec._id}>{sec.name}</option>
                                      ))}
                                    </select>
                                    {member.errors.sectionId && (
                                      <p className="text-red-500 text-[10px] font-semibold mt-1">{member.errors.sectionId}</p>
                                    )}
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-extrabold text-navy-950 uppercase block mb-1">
                                      Father Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Parent / Father's Name"
                                      value={member.studentData.parentName}
                                      onChange={(e) => handleNewStudentDataChange(member.id, 'parentName', e.target.value)}
                                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                                        member.errors.parentName ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-900 bg-white'
                                      }`}
                                    />
                                    {member.errors.parentName && (
                                      <p className="text-red-500 text-[10px] font-semibold mt-1">{member.errors.parentName}</p>
                                    )}
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-extrabold text-navy-950 uppercase block mb-1">
                                      Father Contact <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Father's phone/contact"
                                      value={member.studentData.fatherContact}
                                      onChange={(e) => handleNewStudentDataChange(member.id, 'fatherContact', e.target.value)}
                                      className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                                        member.errors.fatherContact ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-900 bg-white'
                                      }`}
                                    />
                                    {member.errors.fatherContact && (
                                      <p className="text-red-500 text-[10px] font-semibold mt-1">{member.errors.fatherContact}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Fee Sub-section */}
                                <div className="bg-navy-50/30 border border-navy-100/50 p-4 rounded-xl space-y-3 shadow-3xs">
                                  <h5 className="text-[10px] font-bold text-navy-900 uppercase tracking-wider border-b border-navy-150/80 pb-1.5 flex items-center">
                                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-navy-700" />
                                    Fee Configuration (Setup at Enrollment Only)
                                  </h5>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                      <label className="text-[10px] font-bold text-navy-950 uppercase block mb-1">
                                        Monthly tuition Fee (Rs.) <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="e.g. 3500"
                                        value={member.feeConfig.monthlyFee}
                                        onChange={(e) => handleFeeConfigChange(member.id, 'monthlyFee', e.target.value)}
                                        className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                                          member.errors.monthlyFee ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-900 bg-white'
                                        }`}
                                      />
                                      {member.errors.monthlyFee && (
                                        <p className="text-red-500 text-[10px] font-semibold mt-1">{member.errors.monthlyFee}</p>
                                      )}
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-bold text-navy-950 uppercase block mb-1">
                                        One-time Book Fee (Rs.) <span className="text-gray-400">(Optional)</span>
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="e.g. 1500"
                                        value={member.feeConfig.bookFee}
                                        onChange={(e) => handleFeeConfigChange(member.id, 'bookFee', e.target.value)}
                                        className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                                          member.errors.bookFee ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-900 bg-white'
                                        }`}
                                      />
                                      {member.errors.bookFee && (
                                        <p className="text-red-500 text-[10px] font-semibold mt-1">{member.errors.bookFee}</p>
                                      )}
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-bold text-navy-950 uppercase block mb-1">
                                        Book Fee Due Date {parseFloat(member.feeConfig.bookFee) > 0 && <span className="text-red-500">*</span>}
                                      </label>
                                      <input
                                        type="date"
                                        value={member.feeConfig.bookFeeDueDate}
                                        disabled={!(parseFloat(member.feeConfig.bookFee) > 0)}
                                        onChange={(e) => handleFeeConfigChange(member.id, 'bookFeeDueDate', e.target.value)}
                                        className={`w-full text-xs p-2.5 rounded-xl border focus:outline-hidden ${
                                          !(parseFloat(member.feeConfig.bookFee) > 0) ? 'bg-slate-100 border-gray-200 cursor-not-allowed' :
                                          member.errors.bookFeeDueDate ? 'border-red-400 focus:border-red-500 bg-red-50/10' : 'border-gray-200 focus:border-navy-900 bg-white'
                                        }`}
                                      />
                                      {member.errors.bookFeeDueDate && (
                                        <p className="text-red-500 text-[10px] font-semibold mt-1">{member.errors.bookFeeDueDate}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Client Duplicate Alert Indicator */}
                            {hasDuplicateError && (
                              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl flex items-start">
                                <AlertTriangle className="h-4 w-4 mr-2 text-amber-600 flex-shrink-0 mt-0.5" />
                                <span className="font-semibold">{member.errors.duplicate}</span>
                              </div>
                            )}

                            {/* Server-side Inline validation errors list */}
                            {member.serverErrors?.length > 0 && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl">
                                <h6 className="font-extrabold flex items-center mb-1 text-[10px] uppercase tracking-wider">
                                  <AlertTriangle className="h-4 w-4 mr-1.5 text-red-600" />
                                  Enrollment rejected by server
                                </h6>
                                <ul className="list-disc list-inside pl-1 space-y-0.5 text-[10px] font-medium">
                                  {member.serverErrors.map((serr, sidx) => (
                                    <li key={sidx}>{serr}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>

                    {/* Add Another Member Row */}
                    <div className="flex justify-center pt-1 pb-4 flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleAddMemberRow}
                        className="px-5 py-2.5 bg-navy-50 text-navy-900 hover:bg-navy-100 font-bold rounded-xl text-xs flex items-center space-x-2 border border-navy-200/50 shadow-3xs transition-colors"
                      >
                        <Plus className="h-4 w-4 text-navy-950" />
                        <span>Add Sibling Member</span>
                      </button>
                    </div>

                    {/* Step 2 Form Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-150 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-4 py-2.5 border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors text-xs flex items-center space-x-1 shadow-3xs"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Back</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(false)}
                          className="px-5 py-2.5 border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-xs shadow-3xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl transition-colors text-xs shadow-md disabled:opacity-50 flex items-center space-x-1.5"
                        >
                          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          <span>Submit Family & Enrollments</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
