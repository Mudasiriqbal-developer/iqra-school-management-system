import React, { useState, useEffect } from 'react';
import { X, Layers } from 'lucide-react';

/**
 * Modal for Adding and Editing Sections with Class Teacher Assignment.
 */
const SectionFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  section,
  className,
  teachers = [],
}) => {
  const [name, setName] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (section) {
        setName(section.name || '');
        setClassTeacherId(section.classTeacherId ? (section.classTeacherId._id || section.classTeacherId) : '');
      } else {
        setName('');
        setClassTeacherId('');
      }
      setErrors({});
    }
  }, [isOpen, section]);

  if (!isOpen) return null;

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Section name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      classTeacherId: classTeacherId || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 p-6 overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-navy-50 dark:bg-sky-950/40 text-navy-900 dark:text-sky-400 rounded-xl">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {section ? 'Edit Section' : 'Add New Section'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                For {className || 'Assigned Class'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitForm} className="space-y-4 pt-4">
          
          {/* Section Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Section Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. A, B, Gold, Rose, Green"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: null }));
              }}
              className={'w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ' + (
                errors.name
                  ? 'border-rose-400 focus:ring-rose-500/30'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-navy-900/30'
              )}
              autoFocus
            />
            {errors.name && <p className="text-xs text-rose-500 font-medium">{errors.name}</p>}
          </div>

          {/* Class Teacher Assignment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Class Teacher (Optional)
              </label>
              <span className="text-[11px] text-slate-400">Faculty Lead</span>
            </div>
            <select
              value={classTeacherId}
              onChange={(e) => setClassTeacherId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            >
              <option value="">-- No Class Teacher Assigned --</option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>
                  {t.userId?.name || 'Teacher'} ({t.employeeId})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              This teacher will have primary oversight for marking daily attendance and grades for this section.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4.5 py-2.2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5.5 py-2.2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (section ? 'Update Section' : 'Create Section')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SectionFormModal;
