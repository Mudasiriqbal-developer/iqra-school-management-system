import React, { useState, useEffect } from 'react';
import { X, DollarSign, Users, ChevronRight, ChevronLeft } from 'lucide-react';
import { getClasses, getSectionsByClass, getStudents, setFeeStructure } from './feeService';
import { toast } from 'react-hot-toast';

const SetFeeStructureModal = ({ isOpen, onClose, onSuccess }) => {
  // Flow State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // Dropdown States
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  // Student Checklist States
  const [students, setStudents] = useState([]);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Step 2 Form States
  const [amountDue, setAmountDue] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Fetch classes when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const fetchClasses = async () => {
      try {
        const res = await getClasses();
        if (res.success) {
          setClassesList(res.data);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
        toast.error('Failed to load classes');
      }
    };
    fetchClasses();
  }, [isOpen]);

  // Fetch sections when class selection changes
  useEffect(() => {
    if (!isOpen) return;
    const fetchSections = async () => {
      setSectionId('');
      setStudents([]);
      setSelectedStudentIds([]);
      if (!classId) {
        setSectionsList([]);
        return;
      }
      try {
        const res = await getSectionsByClass(classId);
        if (res.success) {
          setSectionsList(res.data);
        }
      } catch (err) {
        console.error('Error fetching sections:', err);
        toast.error('Failed to load sections');
      }
    };
    fetchSections();
  }, [classId, isOpen]);

  // Fetch students when section changes
  useEffect(() => {
    if (!isOpen) return;
    const fetchStudentsList = async () => {
      setSelectedStudentIds([]);
      if (!classId || !sectionId) {
        setStudents([]);
        return;
      }
      try {
        setFetchingStudents(true);
        const res = await getStudents({ classId, sectionId, limit: 200 });
        if (res.success) {
          setStudents(res.data.students || []);
        }
      } catch (err) {
        console.error('Error fetching students:', err);
        toast.error('Failed to load students for this section');
      } finally {
        setFetchingStudents(false);
      }
    };
    fetchStudentsList();
  }, [classId, sectionId, isOpen]);

  // Reset modal state on close/open toggle
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setClassId('');
      setSectionId('');
      setStudents([]);
      setSelectedStudentIds([]);
      setAmountDue('');
      setDueDate('');
      setLoading(false);
      setProgressMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStudentIds(students.map(s => s._id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleStudentToggle = (studentId) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountDue);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount due greater than 0');
      return;
    }
    if (!dueDate) {
      toast.error('Please select a valid due date');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedStudentIds.length; i++) {
      const sId = selectedStudentIds[i];
      const studentName = students.find(s => s._id === sId)?.fullName || 'Student';
      setProgressMsg(`Setting fees for ${i + 1} of ${selectedStudentIds.length} students (${studentName})...`);
      
      try {
        const res = await setFeeStructure(sId, {
          amountDue: parsedAmount,
          dueDate: new Date(dueDate).toISOString()
        });
        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(err);
        failCount++;
      }
    }

    setLoading(false);
    setProgressMsg('');
    
    if (successCount > 0) {
      toast.success(`Successfully set fee structure for ${successCount} student(s).`);
    }
    if (failCount > 0) {
      toast.error(`Failed to update ${failCount} student(s).`);
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="relative bg-navy-primary px-6 py-5 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight">Set Fee Structure</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading / Progress State */}
        {loading ? (
          <div className="p-8 text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-navy-primary border-t-transparent"></div>
            <p className="text-sm font-bold text-navy-950">{progressMsg}</p>
          </div>
        ) : (
          <div>
            {/* Step Indicators */}
            <div className="bg-slate-50 border-b border-gray-100 px-6 py-3 flex items-center justify-between text-xs font-bold text-gray-400">
              <span className={step === 1 ? 'text-navy-primary' : ''}>1. Select Target Students</span>
              <ChevronRight className="h-4 w-4" />
              <span className={step === 2 ? 'text-navy-primary' : ''}>2. Set Fee Details</span>
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <div className="p-6 space-y-4">
                {/* Selectors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Class</label>
                    <select
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary"
                    >
                      <option value="">Select Class</option>
                      {classesList.map(c => (
                        <option key={c._id} value={c._id}>
                          {/^\d+$/.test(c.name) ? 'Class ' : ''}{c.name} — {c.gender ? c.gender.charAt(0).toUpperCase() + c.gender.slice(1) : 'Mixed'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Section</label>
                    <select
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary"
                      disabled={!classId}
                    >
                      <option value="">Select Section</option>
                      {sectionsList.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Students Checklist */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider">
                    Select Students ({selectedStudentIds.length} chosen)
                  </label>

                  {fetchingStudents ? (
                    <div className="py-8 text-center text-xs font-semibold text-gray-500">
                      Loading student roster...
                    </div>
                  ) : students.length > 0 ? (
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                      {/* Select All */}
                      <div className="bg-slate-50 border-b border-gray-100 p-3 flex items-center space-x-3 text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.length === students.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="h-4 w-4 text-navy-primary border-gray-300 rounded focus:ring-navy-primary/20"
                        />
                        <span>Select All ({students.length})</span>
                      </div>

                      {/* Student list scroll area */}
                      <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 p-2">
                        {students.map(s => {
                          const isChecked = selectedStudentIds.includes(s._id);
                          return (
                            <label
                              key={s._id}
                              className="flex items-center space-x-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleStudentToggle(s._id)}
                                className="h-4 w-4 text-navy-primary border-gray-300 rounded focus:ring-navy-primary/20"
                              />
                              <div className="text-xs">
                                <p className="font-bold text-slate-800">{s.fullName}</p>
                                <p className="text-xxs text-gray-400 font-medium">Reg: {s.registrationNumber}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-slate-50 border border-dashed border-gray-200 rounded-2xl text-xs text-gray-400 italic">
                      {sectionId ? 'No students registered in this section.' : 'Please select a Class and Section.'}
                    </div>
                  )}
                </div>

                {/* Footer step 1 */}
                <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={selectedStudentIds.length === 0}
                    className="px-5 py-2 bg-navy-primary text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-55 disabled:cursor-not-allowed transition-all flex items-center space-x-1.5"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <form onSubmit={handleSave}>
                <div className="p-6 space-y-4">
                  {/* Selected count info banner */}
                  <div className="flex items-center space-x-2 bg-blue-50 border border-blue-100 p-3 rounded-xl text-xs text-blue-700 font-semibold">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span>Applying fee structure to {selectedStudentIds.length} student(s).</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Amount Due (Rs.) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={amountDue}
                      onChange={(e) => setAmountDue(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy-primary/20 focus:border-navy-primary"
                      required
                    />
                  </div>

                  {/* Footer step 2 */}
                  <div className="pt-4 border-t border-gray-100 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors flex items-center space-x-1.5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-navy-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                      >
                        Apply Fee Structure
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default SetFeeStructureModal;
