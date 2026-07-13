import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';
import { 
  createAssignment, 
  getClasses, 
  getSectionsByClass, 
  getSubjectsByClass 
} from './teacherService';

const AssignmentFormModal = ({ isOpen, onClose, teacher, onSuccess }) => {
  const [formData, setFormData] = useState({
    classId: '',
    sectionId: '',
    subjectId: '',
  });

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset states when modal state changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        classId: '',
        sectionId: '',
        subjectId: '',
      });
      setErrors({});
      setSections([]);
      setSubjects([]);
    }
  }, [isOpen]);

  // Fetch classes on mount/open
  useEffect(() => {
    if (isOpen) {
      const fetchClasses = async () => {
        try {
          setLoadingClasses(true);
          const res = await getClasses();
          if (res.success) {
            setClasses(res.data);
          } else {
            toast.error(res.message || 'Failed to fetch classes');
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load classes');
        } finally {
          setLoadingClasses(false);
        }
      };
      fetchClasses();
    }
  }, [isOpen]);

  // Fetch sections and subjects when classId changes
  useEffect(() => {
    const fetchClassDetails = async () => {
      if (!formData.classId) {
        setSections([]);
        setSubjects([]);
        return;
      }

      // Fetch Sections
      const fetchSections = async () => {
        try {
          setLoadingSections(true);
          const res = await getSectionsByClass(formData.classId);
          if (res.success) {
            setSections(res.data);
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load sections');
        } finally {
          setLoadingSections(false);
        }
      };

      // Fetch Subjects
      const fetchSubjects = async () => {
        try {
          setLoadingSubjects(true);
          const res = await getSubjectsByClass(formData.classId);
          if (res.success) {
            setSubjects(res.data);
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load subjects');
        } finally {
          setLoadingSubjects(false);
        }
      };

      fetchSections();
      fetchSubjects();
    };

    fetchClassDetails();
  }, [formData.classId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Clear downstream selectors if classId changes
      ...(name === 'classId' ? { sectionId: '', subjectId: '' } : {})
    }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.classId) newErrors.classId = 'Class is required';
    if (!formData.sectionId) newErrors.sectionId = 'Section is required';
    if (!formData.subjectId) newErrors.subjectId = 'Subject is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload = {
        teacherId: teacher._id,
        classId: formData.classId,
        sectionId: formData.sectionId,
        subjectId: formData.subjectId,
      };

      const res = await createAssignment(payload);
      if (res.success) {
        toast.success('Assignment created successfully');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Failed to create assignment');
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 409) {
        toast.error("This teacher is already assigned to this class, section, and subject.");
      } else {
        const serverMessage = err.response?.data?.message || 'Server error occurred during assignment';
        toast.error(serverMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !teacher) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100">
        
        {/* Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between text-white">
          <div>
            <h2 className="text-base font-bold">Assign Class & Subject</h2>
            <p className="text-[10px] text-slate-300 font-semibold uppercase mt-0.5">
              Teacher: {teacher.userId?.name}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Class Select */}
          <div className="flex flex-col">
            <label htmlFor="classId" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              id="classId"
              name="classId"
              value={formData.classId}
              onChange={handleChange}
              disabled={loadingClasses}
              className={`w-full px-4 py-2 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                errors.classId ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-navy-700'
              }`}
            >
              <option value="">-- Select Class --</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {/^\d+$/.test(c.name) ? 'Class ' : ''}{c.name} — {c.gender ? c.gender.charAt(0).toUpperCase() + c.gender.slice(1) : 'Mixed'}
                </option>
              ))}
            </select>
            {errors.classId && (
              <span className="text-red-500 text-xs font-medium mt-1">{errors.classId}</span>
            )}
          </div>

          {/* Section Select */}
          <div className="flex flex-col">
            <label htmlFor="sectionId" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
              Section <span className="text-red-500">*</span>
            </label>
            <select
              id="sectionId"
              name="sectionId"
              value={formData.sectionId}
              onChange={handleChange}
              disabled={!formData.classId || loadingSections}
              className={`w-full px-4 py-2 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                errors.sectionId ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-navy-700'
              } disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
            >
              <option value="">
                {!formData.classId ? 'Select a class first' : '-- Select Section --'}
              </option>
              {sections.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.sectionId && (
              <span className="text-red-500 text-xs font-medium mt-1">{errors.sectionId}</span>
            )}
          </div>

          {/* Subject Select */}
          <div className="flex flex-col">
            <label htmlFor="subjectId" className="text-xs font-bold text-navy-950 uppercase mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              id="subjectId"
              name="subjectId"
              value={formData.subjectId}
              onChange={handleChange}
              disabled={!formData.classId || loadingSubjects}
              className={`w-full px-4 py-2 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy-700/50 text-sm ${
                errors.subjectId ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-navy-700'
              } disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
            >
              <option value="">
                {!formData.classId ? 'Select a class first' : '-- Select Subject --'}
              </option>
              {subjects.map((sub) => (
                <option key={sub._id} value={sub._id}>
                  {sub.name}
                </option>
              ))}
            </select>
            {errors.subjectId && (
              <span className="text-red-500 text-xs font-medium mt-1">{errors.subjectId}</span>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-navy-900 hover:bg-navy-800 text-white font-bold py-2 px-4 rounded-xl flex items-center transition-colors text-sm shadow-sm focus:outline-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  <span>Assigning...</span>
                </>
              ) : (
                <span>Assign Combo</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default AssignmentFormModal;
