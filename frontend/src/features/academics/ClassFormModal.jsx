import React, { useState, useEffect } from 'react';
import { X, BookOpen, Wallet } from 'lucide-react';

/**
 * Modal for Adding and Editing Academic Classes.
 */
const ClassFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  classItem,
}) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('mixed');
  const [defaultFee, setDefaultFee] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (classItem) {
        setName(classItem.name || '');
        setGender(classItem.gender || 'mixed');
        setDefaultFee(classItem.defaultFee !== undefined && classItem.defaultFee !== null ? classItem.defaultFee : '');
      } else {
        setName('');
        setGender('mixed');
        setDefaultFee('');
      }
      setErrors({});
    }
  }, [isOpen, classItem]);

  if (!isOpen) return null;

  const handleSubmitForm = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Class name is required';
    }
    if (defaultFee !== '' && (Number(defaultFee) < 0 || isNaN(Number(defaultFee)))) {
      newErrors.defaultFee = 'Fee must be a valid non-negative number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      gender,
      defaultFee: defaultFee !== '' ? Number(defaultFee) : 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 p-6 overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-navy-50 dark:bg-sky-950/40 text-navy-900 dark:text-sky-400 rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {classItem ? 'Edit Class' : 'Create New Class'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {classItem ? 'Update academic level details' : 'Define a new grade or level in your school'}
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
          
          {/* Class Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Class Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Class 6, Prep, Nursery, Grade 10"
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

          {/* Gender Category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Gender Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              <ButtonTile
                active={gender === 'mixed'}
                onClick={() => setGender('mixed')}
                label="Mixed (Co-Ed)"
                subtitle="Boys & Girls"
              />
              <ButtonTile
                active={gender === 'male'}
                onClick={() => setGender('male')}
                label="Boys Only"
                subtitle="Male students"
              />
              <ButtonTile
                active={gender === 'female'}
                onClick={() => setGender('female')}
                label="Girls Only"
                subtitle="Female students"
              />
            </div>
          </div>

          {/* Default Monthly Fee */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Default Monthly Fee (Rs.)
              </label>
              <span className="text-[11px] text-slate-400">per student / month</span>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Wallet className="h-4 w-4" />
              </div>
              <input
                type="number"
                min="0"
                placeholder="e.g. 3500"
                value={defaultFee}
                onChange={(e) => {
                  setDefaultFee(e.target.value);
                  if (errors.defaultFee) setErrors(prev => ({ ...prev, defaultFee: null }));
                }}
                className={'w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ' + (
                  errors.defaultFee
                    ? 'border-rose-400 focus:ring-rose-500/30'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-navy-900/30'
                )}
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Automatically billed to every student in this class who does not have an individual custom fee override.
            </p>
            {errors.defaultFee && <p className="text-xs text-rose-500">{errors.defaultFee}</p>}
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
              {isSubmitting ? 'Saving...' : (classItem ? 'Update Class' : 'Create Class')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ButtonTile = ({ active, onClick, label, subtitle }) => (
  <button
    type="button"
    onClick={onClick}
    className={'p-2.5 rounded-xl border text-left transition-all ' + (
      active
        ? 'border-navy-900 bg-navy-50/60 dark:bg-sky-950/40 dark:border-sky-500 shadow-xs'
        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
    )}
  >
    <span className={'block text-xs font-bold ' + (active ? 'text-navy-900 dark:text-sky-300' : 'text-slate-700 dark:text-slate-300')}>
      {label}
    </span>
    <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
      {subtitle}
    </span>
  </button>
);

export default ClassFormModal;
