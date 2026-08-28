import React, { useState, useEffect } from 'react';
import { X, BookMarked, Sparkles } from 'lucide-react';

/**
 * Modal for Adding and Editing Curriculum Subjects with Quick Suggestion Tags.
 */
const SubjectFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  subject,
  className,
  existingSubjects = [],
}) => {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({});

  const COMMON_SUBJECTS = [
    'Mathematics',
    'English Language',
    'General Science',
    'Urdu Literature',
    'Islamiyat',
    'Computer Science',
    'Social Studies',
    'Pakistan Studies',
    'Physics',
    'Chemistry',
    'Biology',
    'Art & Drawing'
  ];

  useEffect(() => {
    if (isOpen) {
      if (subject) {
        setName(subject.name || '');
      } else {
        setName('');
      }
      setErrors({});
    }
  }, [isOpen, subject]);

  if (!isOpen) return null;

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Subject name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 p-6 overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-navy-50 dark:bg-sky-950/40 text-navy-900 dark:text-sky-400 rounded-xl">
              <BookMarked className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {subject ? 'Edit Subject' : 'Add Curriculum Subject'}
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
          
          {/* Subject Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Subject Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mathematics, General Science, English"
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

          {/* Quick Suggestions (If adding new) */}
          {!subject && (
            <div className="space-y-2">
              <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Quick Suggestions</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SUBJECTS.map(sug => {
                  const isAlreadyAdded = existingSubjects.some(s => s.name?.toLowerCase() === sug.toLowerCase());
                  return (
                    <button
                      key={sug}
                      type="button"
                      disabled={isAlreadyAdded}
                      onClick={() => { setName(sug); if (errors.name) setErrors({}); }}
                      className={'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ' + (
                        isAlreadyAdded
                          ? 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                          : name === sug
                          ? 'bg-navy-900 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                      )}
                    >
                      {sug}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
              {isSubmitting ? 'Saving...' : (subject ? 'Update Subject' : 'Add Subject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectFormModal;
