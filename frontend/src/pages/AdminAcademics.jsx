import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Award,
  BookOpen,
  Calendar,
  CalendarCheck,
  DollarSign,
  BarChart3,
  Plus,
  Layers,
  BookMarked,
  Loader2,
  Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';

import DashboardLayout from '../components/shared/DashboardLayout';
import InlineEditableRow from '../features/academics/InlineEditableRow';
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSectionsByClass,
  createSection,
  updateSection,
  deleteSection,
  getSubjectsByClass,
  createSubject,
  updateSubject,
  deleteSubject
} from '../features/academics/academicService';

const AdminAcademics = () => {
  // Sidebar items
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Faculty', icon: Award, path: '/admin/teachers' },
    { label: 'Academic Structure', icon: BookOpen, path: '/admin/academics' },
    { label: 'Fee Management', icon: Wallet, path: '/admin/fees' },
    { label: 'Attendance', icon: CalendarCheck, path: '/admin/attendance' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  ];

  // Core academic state
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Loading states
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Form toggle states
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Fetch all classes on mount
  const fetchClasses = async (autoSelectId = null) => {
    setLoadingClasses(true);
    try {
      const res = await getClasses();
      if (res.success) {
        const fetchedClasses = res.data || [];
        setClasses(fetchedClasses);

        // Selection logic
        if (fetchedClasses.length > 0) {
          if (autoSelectId) {
            const found = fetchedClasses.find(c => c._id === autoSelectId);
            if (found) setSelectedClass(found);
          } else {
            // Keep current selection if still valid, or auto-select first class
            setSelectedClass((prev) => {
              if (prev) {
                const stillExists = fetchedClasses.find(c => c._id === prev._id);
                if (stillExists) return stillExists;
              }
              return fetchedClasses[0];
            });
          }
        } else {
          setSelectedClass(null);
        }
      } else {
        toast.error(res.message || 'Failed to load classes');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error loading classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  // Fetch sections and subjects for selected class
  const fetchDetailsForClass = async (classId) => {
    setLoadingSections(true);
    setLoadingSubjects(true);
    try {
      const [sectionsRes, subjectsRes] = await Promise.all([
        getSectionsByClass(classId),
        getSubjectsByClass(classId)
      ]);

      if (sectionsRes.success) {
        setSections(sectionsRes.data || []);
      } else {
        toast.error(sectionsRes.message || 'Failed to load sections');
      }

      if (subjectsRes.success) {
        setSubjects(subjectsRes.data || []);
      } else {
        toast.error(subjectsRes.message || 'Failed to load subjects');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server error loading class details');
    } finally {
      setLoadingSections(false);
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchDetailsForClass(selectedClass._id);
    } else {
      setSections([]);
      setSubjects([]);
    }
  }, [selectedClass]);

  // Class Handlers
  const handleAddClass = async (e) => {
    e.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    try {
      const res = await createClass({ name });
      if (res.success) {
        toast.success('Class created successfully');
        setNewClassName('');
        setIsAddingClass(false);
        // Refresh classes and select the newly created class
        await fetchClasses(res.data?._id);
      } else {
        toast.error(res.message || 'Failed to create class');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating class');
    }
  };

  const handleUpdateClass = async (id, newName) => {
    try {
      const res = await updateClass(id, { name: newName });
      if (res.success) {
        toast.success('Class updated successfully');
        setClasses(prev => prev.map(c => c._id === id ? { ...c, name: newName } : c));
        setSelectedClass(prev => prev && prev._id === id ? { ...prev, name: newName } : prev);
      } else {
        toast.error(res.message || 'Failed to update class');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating class');
    }
  };

  const handleDeleteClass = async (id) => {
    const confirm = window.confirm(
      "Delete this class? This cannot be undone if no data depends on it."
    );
    if (!confirm) return;

    try {
      const res = await deleteClass(id);
      if (res.success) {
        toast.success('Class deleted successfully');
        const remaining = classes.filter(c => c._id !== id);
        setClasses(remaining);
        if (selectedClass && selectedClass._id === id) {
          setSelectedClass(remaining.length > 0 ? remaining[0] : null);
        }
      } else {
        toast.error(res.message || 'Failed to delete class');
      }
    } catch (err) {
      // Backend blocks deletion (returns 400) if sections exist
      toast.error(err.response?.data?.message || 'Error deleting class');
    }
  };

  // Section Handlers
  const handleAddSection = async (e) => {
    e.preventDefault();
    const name = newSectionName.trim();
    if (!name || !selectedClass) return;
    try {
      const res = await createSection({ name, classId: selectedClass._id });
      if (res.success) {
        toast.success('Section created successfully');
        setNewSectionName('');
        setIsAddingSection(false);
        // Refresh sections
        const sectionsRes = await getSectionsByClass(selectedClass._id);
        if (sectionsRes.success) {
          setSections(sectionsRes.data || []);
        }
      } else {
        toast.error(res.message || 'Failed to create section');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating section');
    }
  };

  const handleUpdateSection = async (id, newName) => {
    try {
      const res = await updateSection(id, { name: newName });
      if (res.success) {
        toast.success('Section updated successfully');
        setSections(prev => prev.map(s => s._id === id ? { ...s, name: newName } : s));
      } else {
        toast.error(res.message || 'Failed to update section');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating section');
    }
  };

  const handleDeleteSection = async (id) => {
    const confirm = window.confirm(
      "Delete this section? This cannot be undone if no data depends on it."
    );
    if (!confirm) return;

    try {
      const res = await deleteSection(id);
      if (res.success) {
        toast.success('Section deleted successfully');
        setSections(prev => prev.filter(s => s._id !== id));
      } else {
        toast.error(res.message || 'Failed to delete section');
      }
    } catch (err) {
      // Backend blocks deletion (returns 400) if students are assigned to the section
      toast.error(err.response?.data?.message || 'Error deleting section');
    }
  };

  // Subject Handlers
  const handleAddSubject = async (e) => {
    e.preventDefault();
    const name = newSubjectName.trim();
    if (!name || !selectedClass) return;
    try {
      const res = await createSubject({ name, classId: selectedClass._id });
      if (res.success) {
        toast.success('Subject created successfully');
        setNewSubjectName('');
        setIsAddingSubject(false);
        // Refresh subjects
        const subjectsRes = await getSubjectsByClass(selectedClass._id);
        if (subjectsRes.success) {
          setSubjects(subjectsRes.data || []);
        }
      } else {
        toast.error(res.message || 'Failed to create subject');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating subject');
    }
  };

  const handleUpdateSubject = async (id, newName) => {
    try {
      const res = await updateSubject(id, { name: newName });
      if (res.success) {
        toast.success('Subject updated successfully');
        setSubjects(prev => prev.map(s => s._id === id ? { ...s, name: newName } : s));
      } else {
        toast.error(res.message || 'Failed to update subject');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating subject');
    }
  };

  const handleDeleteSubject = async (id) => {
    const confirm = window.confirm(
      "Delete this subject? This cannot be undone if no data depends on it."
    );
    if (!confirm) return;

    try {
      const res = await deleteSubject(id);
      if (res.success) {
        toast.success('Subject deleted successfully');
        setSubjects(prev => prev.filter(s => s._id !== id));
      } else {
        toast.error(res.message || 'Failed to delete subject');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting subject');
    }
  };

  return (
    <DashboardLayout navItems={navItems} subtitle="Administrative Suite">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 tracking-tight">Academic Structure</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure Classes, Sections, and Subjects in one unified workstation.
          </p>
        </div>

        {/* 3-Column Workstation Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* COLUMN 1: Classes */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col min-h-[480px]">
            {/* Column Header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Classes</h3>
                <p className="text-xs text-gray-400 mt-0.5">Select a class to manage its structure</p>
              </div>
              <button
                onClick={() => setIsAddingClass(!isAddingClass)}
                className={`p-1.5 rounded-lg transition-colors border ${
                  isAddingClass
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    : 'bg-navy-900 text-white border-navy-900 hover:bg-navy-800'
                }`}
                title="Add Class"
              >
                <Plus className={`h-4 w-4 transition-transform duration-200 ${isAddingClass ? 'rotate-45' : ''}`} />
              </button>
            </div>

            {/* Inline Add Class Form */}
            {isAddingClass && (
              <form onSubmit={handleAddClass} className="mb-4 p-3 bg-slate-50 border border-gray-200/50 rounded-xl space-y-2 animate-fadeIn">
                <input
                  type="text"
                  placeholder="Class Name (e.g. Grade 1)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 focus:border-navy-900 bg-white"
                  autoFocus
                />
                <div className="flex justify-end space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingClass(false);
                      setNewClassName('');
                    }}
                    className="px-2.5 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[10px] font-extrabold text-white bg-navy-900 hover:bg-navy-800 rounded-md transition-colors shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            <div className="space-y-2 flex-grow overflow-y-auto max-h-[350px] pr-1">
              {loadingClasses ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin text-navy-900" />
                  <span className="text-xs mt-2 font-medium">Loading classes...</span>
                </div>
              ) : classes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-2xl p-4 bg-slate-50/50">
                  <BookOpen className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-700">No classes yet</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[160px]">
                    Create your first class to get started.
                  </p>
                </div>
              ) : (
                classes.map((cls) => (
                  <InlineEditableRow
                    key={cls._id}
                    label={cls.name}
                    isSelected={selectedClass?._id === cls._id}
                    onClick={() => setSelectedClass(cls)}
                    onSave={(newName) => handleUpdateClass(cls._id, newName)}
                    onDelete={() => handleDeleteClass(cls._id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: Sections */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col min-h-[480px]">
            {!selectedClass ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-slate-50/30 rounded-2xl border border-dashed border-gray-200">
                <Layers className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-500">No Class Selected</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                  Select a class from the left list to view and manage its sections.
                </p>
              </div>
            ) : (
              <>
                {/* Column Header */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">
                      Sections in {selectedClass.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Manage subdivisions of this class</p>
                  </div>
                  <button
                    onClick={() => setIsAddingSection(!isAddingSection)}
                    className={`p-1.5 rounded-lg transition-colors border ${
                      isAddingSection
                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        : 'bg-navy-900 text-white border-navy-900 hover:bg-navy-800'
                    }`}
                    title="Add Section"
                  >
                    <Plus className={`h-4 w-4 transition-transform duration-200 ${isAddingSection ? 'rotate-45' : ''}`} />
                  </button>
                </div>

                {/* Inline Add Section Form */}
                {isAddingSection && (
                  <form onSubmit={handleAddSection} className="mb-4 p-3 bg-slate-50 border border-gray-200/50 rounded-xl space-y-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Section Name (e.g. A)"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 focus:border-navy-900 bg-white"
                      autoFocus
                    />
                    <div className="flex justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSection(false);
                          setNewSectionName('');
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 text-[10px] font-extrabold text-white bg-navy-900 hover:bg-navy-800 rounded-md transition-colors shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}

                {/* List */}
                <div className="space-y-2 flex-grow overflow-y-auto max-h-[350px] pr-1">
                  {loadingSections ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Loader2 className="h-6 w-6 animate-spin text-navy-900" />
                      <span className="text-xs mt-2 font-medium">Loading sections...</span>
                    </div>
                  ) : sections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-2xl p-4 bg-slate-50/50">
                      <Layers className="h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-xs font-bold text-gray-700">No sections yet</p>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-[160px]">
                        Add sections (like A, B, Gold, Silver) to this class.
                      </p>
                    </div>
                  ) : (
                    sections.map((sec) => (
                      <InlineEditableRow
                        key={sec._id}
                        label={sec.name}
                        onSave={(newName) => handleUpdateSection(sec._id, newName)}
                        onDelete={() => handleDeleteSection(sec._id)}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* COLUMN 3: Subjects */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col min-h-[480px]">
            {!selectedClass ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-slate-50/30 rounded-2xl border border-dashed border-gray-200">
                <BookMarked className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-500">No Class Selected</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                  Select a class from the left list to view and manage its subjects.
                </p>
              </div>
            ) : (
              <>
                {/* Column Header */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">
                      Subjects in {selectedClass.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Manage curriculum subjects</p>
                  </div>
                  <button
                    onClick={() => setIsAddingSubject(!isAddingSubject)}
                    className={`p-1.5 rounded-lg transition-colors border ${
                      isAddingSubject
                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        : 'bg-navy-900 text-white border-navy-900 hover:bg-navy-800'
                    }`}
                    title="Add Subject"
                  >
                    <Plus className={`h-4 w-4 transition-transform duration-200 ${isAddingSubject ? 'rotate-45' : ''}`} />
                  </button>
                </div>

                {/* Inline Add Subject Form */}
                {isAddingSubject && (
                  <form onSubmit={handleAddSubject} className="mb-4 p-3 bg-slate-50 border border-gray-200/50 rounded-xl space-y-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Subject Name (e.g. Mathematics)"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 focus:border-navy-900 bg-white"
                      autoFocus
                    />
                    <div className="flex justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSubject(false);
                          setNewSubjectName('');
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 text-[10px] font-extrabold text-white bg-navy-900 hover:bg-navy-800 rounded-md transition-colors shadow-sm"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}

                {/* List */}
                <div className="space-y-2 flex-grow overflow-y-auto max-h-[350px] pr-1">
                  {loadingSubjects ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Loader2 className="h-6 w-6 animate-spin text-navy-900" />
                      <span className="text-xs mt-2 font-medium">Loading subjects...</span>
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-2xl p-4 bg-slate-50/50">
                      <BookMarked className="h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-xs font-bold text-gray-700">No subjects yet</p>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-[160px]">
                        Add subjects (like Math, English, Physics) to this class.
                      </p>
                    </div>
                  ) : (
                    subjects.map((sub) => (
                      <InlineEditableRow
                        key={sub._id}
                        label={sub.name}
                        onSave={(newName) => handleUpdateSubject(sub._id, newName)}
                        onDelete={() => handleDeleteSubject(sub._id)}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAcademics;
