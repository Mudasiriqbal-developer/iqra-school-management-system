import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  X,
  Download,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  FileText,
  RefreshCw,
  ArrowRight,
  Trash2,
  Check,
  Info
} from 'lucide-react';

import StatCard from '../../components/shared/StatCard';
import StatusBadge from '../../components/shared/StatusBadge';
import {
  downloadImportTemplate,
  validateStudentImport,
  commitStudentImport,
} from './studentService';

const BulkStudentImportModal = ({ isOpen, onClose, onSuccess }) => {
  // Wizard Steps: 1 = Template, 2 = Upload, 3 = Preview & Validate, 4 = Result & Report
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Downloading template state
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Step 2: Selected file state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef(null);

  // Step 3: Validation results
  const [validationData, setValidationData] = useState(null);
  const [previewTab, setPreviewTab] = useState('valid'); // 'valid' | 'invalid'

  // Step 4: Commit & Report states
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);

  if (!isOpen) return null;

  // Reset entire wizard
  const handleReset = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setUploadProgress(0);
    setIsValidating(false);
    setValidationData(null);
    setPreviewTab('valid');
    setIsCommitting(false);
    setCommitResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Step 1: Download Template
  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await downloadImportTemplate();
      toast.success('Template downloaded successfully! Open it in Excel to add student records.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download template. Please try again.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Step 2: File Handling
  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate extension
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExt) {
      toast.error('Invalid file format. Please select a .csv, .xlsx, or .xls file.');
      return;
    }

    // Validate size (< 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller file.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Trigger Validation API
  const handleValidateFile = async () => {
    if (!selectedFile) {
      toast.error('Please choose a file to upload first');
      return;
    }

    try {
      setIsValidating(true);
      setUploadProgress(10);

      const res = await validateStudentImport(selectedFile, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 90) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      setUploadProgress(100);

      if (res.success) {
        setValidationData(res.data);
        setCurrentStep(3);
        // Default tab to invalid if there are errors and 0 valid rows, otherwise valid
        if (res.data.validCount === 0 && res.data.invalidCount > 0) {
          setPreviewTab('invalid');
        } else {
          setPreviewTab('valid');
        }
        toast.success(`Validated ${res.data.totalRows} rows: ${res.data.validCount} valid, ${res.data.invalidCount} invalid.`);
      } else {
        toast.error(res.message || 'Validation failed');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Server error occurred during validation');
    } finally {
      setIsValidating(false);
    }
  };

  // Step 3 -> 4: Commit Valid Rows (Stateless payload)
  const handleConfirmCommit = async () => {
    if (!validationData || !validationData.validRows || validationData.validRows.length === 0) {
      toast.error('No valid rows available to import');
      return;
    }

    try {
      setIsCommitting(true);
      setCurrentStep(4);

      const res = await commitStudentImport(validationData.validRows);

      if (res.success) {
        setCommitResult(res.data);
        toast.success(`Successfully imported ${res.data.successCount} student(s)!`);
      } else {
        toast.error(res.message || 'Commit failed');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Server error occurred during batch commit');
      setCommitResult({
        successCount: 0,
        failedCount: validationData.validRows.length,
        failedRows: [{
          rowNumber: 0,
          errors: [err.response?.data?.message || 'Transaction aborted due to server error'],
        }],
      });
    } finally {
      setIsCommitting(false);
    }
  };

  // Generate CSV error report for download
  const handleDownloadErrorReport = () => {
    const errorList = commitResult?.failedRows?.length > 0 
      ? commitResult.failedRows 
      : validationData?.invalidRows || [];

    if (errorList.length === 0) {
      toast.info('No failed rows to export.');
      return;
    }

    const headers = ['Row Number', 'Registration Number', 'Full Name', 'Errors'];
    const csvRows = [headers.join(',')];

    errorList.forEach(item => {
      const rowNum = item.rowNumber || item.data?.rowNumber || 'N/A';
      const regNo = `"${(item.registrationNumber || item.data?.registrationNumber || '').replace(/"/g, '""')}"`;
      const name = `"${(item.fullName || item.data?.fullName || '').replace(/"/g, '""')}"`;
      const errorsStr = `"${(item.errors || []).join('; ').replace(/"/g, '""')}"`;
      csvRows.push([rowNum, regNo, name, errorsStr].join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `student-import-errors-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFinish = () => {
    if (onSuccess) {
      onSuccess();
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100 my-6 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileSpreadsheet className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Bulk Student Import</h2>
              <p className="text-xs text-navy-200">Import student records via CSV or Excel (.xlsx/.xls)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="bg-slate-50 border-b border-gray-200/80 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            
            {/* Step 1 */}
            <div className="flex items-center space-x-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                currentStep > 1 
                  ? 'bg-emerald-600 text-white' 
                  : currentStep === 1 
                    ? 'bg-navy-900 text-white' 
                    : 'bg-gray-200 text-slate-800'
              }`}>
                {currentStep > 1 ? <Check className="h-4 w-4" /> : '1'}
              </div>
              <span className={`text-xs font-bold ${currentStep === 1 ? 'text-navy-950' : 'text-gray-500'} hidden sm:inline`}>
                Template
              </span>
            </div>

            <div className="w-8 sm:w-16 h-0.5 bg-gray-200">
              <div className={`h-full bg-emerald-500 transition-all duration-300 ${currentStep > 1 ? 'w-full' : 'w-0'}`} />
            </div>

            {/* Step 2 */}
            <div className="flex items-center space-x-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                currentStep > 2 
                  ? 'bg-emerald-600 text-white' 
                  : currentStep === 2 
                    ? 'bg-navy-900 text-white' 
                    : 'bg-gray-200 text-slate-800'
              }`}>
                {currentStep > 2 ? <Check className="h-4 w-4" /> : '2'}
              </div>
              <span className={`text-xs font-bold ${currentStep === 2 ? 'text-navy-950' : 'text-gray-500'} hidden sm:inline`}>
                Upload
              </span>
            </div>

            <div className="w-8 sm:w-16 h-0.5 bg-gray-200">
              <div className={`h-full bg-emerald-500 transition-all duration-300 ${currentStep > 2 ? 'w-full' : 'w-0'}`} />
            </div>

            {/* Step 3 */}
            <div className="flex items-center space-x-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                currentStep > 3 
                  ? 'bg-emerald-600 text-white' 
                  : currentStep === 3 
                    ? 'bg-navy-900 text-white' 
                    : 'bg-gray-200 text-slate-800'
              }`}>
                {currentStep > 3 ? <Check className="h-4 w-4" /> : '3'}
              </div>
              <span className={`text-xs font-bold ${currentStep === 3 ? 'text-navy-950' : 'text-gray-500'} hidden sm:inline`}>
                Validate & Preview
              </span>
            </div>

            <div className="w-8 sm:w-16 h-0.5 bg-gray-200">
              <div className={`h-full bg-emerald-500 transition-all duration-300 ${currentStep > 3 ? 'w-full' : 'w-0'}`} />
            </div>

            {/* Step 4 */}
            <div className="flex items-center space-x-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                currentStep === 4 
                  ? 'bg-navy-900 text-white' 
                  : 'bg-gray-200 text-slate-800'
              }`}>
                4
              </div>
              <span className={`text-xs font-bold ${currentStep === 4 ? 'text-navy-950' : 'text-gray-500'} hidden sm:inline`}>
                Commit & Report
              </span>
            </div>

          </div>
        </div>

        {/* Modal Body Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ========================================================================= */}
          {/* STEP 1: DOWNLOAD TEMPLATE */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6">
              
              {/* Guidance Banner */}
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 flex items-start space-x-4">
                <div className="p-2 bg-sky-100 text-sky-800 rounded-xl flex-shrink-0 mt-0.5">
                  <Info className="h-5 w-5" />
                </div>
                <div className="space-y-1 text-sm text-sky-950">
                  <h4 className="font-bold text-sky-950">Download the Official Excel Template</h4>
                  <p className="text-xs text-sky-800 leading-relaxed">
                    Use our pre-formatted spreadsheet template to ensure all column headers, date formats, and class/section names match your school database requirements exactly.
                  </p>
                </div>
              </div>

              {/* Template Download Card */}
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center space-y-4 hover:border-navy-400 transition-colors">
                <div className="inline-flex p-4 bg-navy-50 text-navy-900 rounded-2xl">
                  <FileSpreadsheet className="h-10 w-10 text-navy-800" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-950">student-import-template.xlsx</h3>
                  <p className="text-xs text-gray-500 mt-1">Includes sample data and reference sheets with your school's existing classes and sections.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {downloadingTemplate ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Generating Template...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Download Template (.xlsx)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Field Reference Summary Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-navy-950">Column Requirements Guide</span>
                  <span className="text-[11px] font-semibold text-gray-500">* Marked fields are mandatory</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 text-gray-500 border-b border-gray-200 font-bold">
                        <th className="py-2.5 px-4">Column Header</th>
                        <th className="py-2.5 px-4">Required</th>
                        <th className="py-2.5 px-4">Accepted Values</th>
                        <th className="py-2.5 px-4">Example</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      <tr>
                        <td className="py-2 px-4 font-bold text-navy-900">Registration Number</td>
                        <td className="py-2 px-4"><span className="text-red-600 font-bold">Yes *</span></td>
                        <td className="py-2 px-4">Unique alphanumeric string</td>
                        <td className="py-2 px-4 font-mono text-gray-500">26001</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-bold text-navy-900">Full Name</td>
                        <td className="py-2 px-4"><span className="text-red-600 font-bold">Yes *</span></td>
                        <td className="py-2 px-4">Student legal full name</td>
                        <td className="py-2 px-4">Muhammad Hamza</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-bold text-navy-900">Father Name</td>
                        <td className="py-2 px-4"><span className="text-red-600 font-bold">Yes *</span></td>
                        <td className="py-2 px-4">Father / Guardian name</td>
                        <td className="py-2 px-4">Tariq Mahmood</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-bold text-navy-900">Gender</td>
                        <td className="py-2 px-4"><span className="text-red-600 font-bold">Yes *</span></td>
                        <td className="py-2 px-4">male, female, other</td>
                        <td className="py-2 px-4">male</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-bold text-navy-900">Date of Birth</td>
                        <td className="py-2 px-4"><span className="text-red-600 font-bold">Yes *</span></td>
                        <td className="py-2 px-4">YYYY-MM-DD or DD/MM/YYYY</td>
                        <td className="py-2 px-4 font-mono text-gray-500">2016-04-15</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-bold text-navy-900">Father Contact</td>
                        <td className="py-2 px-4"><span className="text-red-600 font-bold">Yes *</span></td>
                        <td className="py-2 px-4">Phone / mobile number</td>
                        <td className="py-2 px-4 font-mono text-gray-500">03001234567</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-bold text-navy-900">Class</td>
                        <td className="py-2 px-4"><span className="text-red-600 font-bold">Yes *</span></td>
                        <td className="py-2 px-4">Exact name of active class</td>
                        <td className="py-2 px-4">Grade 1, Prep, Play Group</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-bold text-navy-900">Section</td>
                        <td className="py-2 px-4"><span className="text-red-600 font-bold">Yes *</span></td>
                        <td className="py-2 px-4">Exact section under the class</td>
                        <td className="py-2 px-4">A, B, Rose, Jasmine</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-bold text-navy-900">Monthly Fee</td>
                        <td className="py-2 px-4"><span className="text-gray-400">Optional</span></td>
                        <td className="py-2 px-4">Number &gt;= 0 (defaults to 0)</td>
                        <td className="py-2 px-4">2500</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-bold text-navy-900">Address</td>
                        <td className="py-2 px-4"><span className="text-gray-400">Optional</span></td>
                        <td className="py-2 px-4">Residential address</td>
                        <td className="py-2 px-4">Sector G-9/1, Islamabad</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-bold text-navy-900">Status</td>
                        <td className="py-2 px-4"><span className="text-gray-400">Optional</span></td>
                        <td className="py-2 px-4">active, on_leave, suspended</td>
                        <td className="py-2 px-4">active</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: UPLOAD FILE */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              
              {/* Drag and Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-navy-800 bg-navy-50/50 scale-[0.99]'
                    : selectedFile
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-gray-300 hover:border-navy-600 bg-gray-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className={`p-4 rounded-2xl ${selectedFile ? 'bg-emerald-100 text-emerald-800' : 'bg-navy-50 text-navy-900'}`}>
                    <UploadCloud className="h-8 w-8" />
                  </div>

                  <div>
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-bold text-emerald-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB — Click or drop to replace
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-navy-950">
                          Click to select or drag and drop your completed spreadsheet
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Supported file types: .xlsx, .xls, .csv (Max size: 5 MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar (Visible while validating) */}
              {isValidating && (
                <div className="bg-white p-4 border border-gray-200 rounded-2xl space-y-2">
                  <div className="flex justify-between text-xs font-bold text-navy-950">
                    <span className="flex items-center space-x-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-navy-900" />
                      <span>Parsing & validating rows...</span>
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-navy-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Upload Safety Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>No changes will be saved to your database yet.</strong> On the next step, you will be able to review row-by-row validation results, check errors, and confirm before anything is written to the system.
                </p>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: VALIDATION PREVIEW */}
          {/* ========================================================================= */}
          {currentStep === 3 && validationData && (
            <div className="space-y-6">

              {/* Stat Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  icon={FileText}
                  label="Total Rows Detected"
                  value={validationData.totalRows.toString()}
                  trend="Processed"
                  trendColor="info"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Valid Records (Ready)"
                  value={validationData.validCount.toString()}
                  trend={`${validationData.validCount} Ready to Import`}
                  trendColor="active"
                />
                <StatCard
                  icon={AlertCircle}
                  label="Invalid Records"
                  value={validationData.invalidCount.toString()}
                  trend={validationData.invalidCount > 0 ? 'Contains Errors' : 'Clean'}
                  trendColor={validationData.invalidCount > 0 ? 'danger' : 'active'}
                />
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 space-x-4">
                <button
                  type="button"
                  onClick={() => setPreviewTab('valid')}
                  className={`pb-2.5 text-xs font-bold transition-colors relative flex items-center space-x-2 ${
                    previewTab === 'valid'
                      ? 'text-navy-900 border-b-2 border-navy-900'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span>Valid Rows Ready to Import</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
                    {validationData.validCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab('invalid')}
                  className={`pb-2.5 text-xs font-bold transition-colors relative flex items-center space-x-2 ${
                    previewTab === 'invalid'
                      ? 'text-red-700 border-b-2 border-red-700'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span>Invalid Rows with Errors</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    validationData.invalidCount > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {validationData.invalidCount}
                  </span>
                </button>
              </div>

              {/* Tab 1: Valid Rows Table */}
              {previewTab === 'valid' && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                  {validationData.validRows.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-xs">
                      <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="font-semibold">No valid rows found in the uploaded file.</p>
                      <p className="mt-1">Please review the invalid rows tab and re-upload your file.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 text-gray-500 font-bold">
                          <tr>
                            <th className="py-2.5 px-4">Row #</th>
                            <th className="py-2.5 px-4">Reg No</th>
                            <th className="py-2.5 px-4">Full Name</th>
                            <th className="py-2.5 px-4">Father Name</th>
                            <th className="py-2.5 px-4">Gender</th>
                            <th className="py-2.5 px-4">DOB</th>
                            <th className="py-2.5 px-4">Contact</th>
                            <th className="py-2.5 px-4">Class & Section</th>
                            <th className="py-2.5 px-4">Monthly Fee</th>
                            <th className="py-2.5 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {validationData.validRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-2 px-4 font-mono font-bold text-navy-900">{row.rowNumber}</td>
                              <td className="py-2 px-4 font-mono font-bold text-navy-900">{row.registrationNumber}</td>
                              <td className="py-2 px-4 font-semibold">{row.fullName}</td>
                              <td className="py-2 px-4 text-gray-600">{row.fatherName}</td>
                              <td className="py-2 px-4 capitalize">{row.gender}</td>
                              <td className="py-2 px-4 font-mono text-gray-500">
                                {row.dateOfBirth ? row.dateOfBirth.split('T')[0] : 'N/A'}
                              </td>
                              <td className="py-2 px-4 font-mono text-gray-600">{row.fatherContact}</td>
                              <td className="py-2 px-4 font-semibold text-navy-950">
                                {row.className} - {row.sectionName}
                              </td>
                              <td className="py-2 px-4 font-semibold text-navy-950">
                                {row.customFee !== undefined && row.customFee !== null && row.customFee !== '' ? (
                                  <span className="text-navy-900 font-bold">Rs. {Number(row.customFee).toLocaleString()} <span className="text-[10px] text-navy-700 font-normal">(Custom)</span></span>
                                ) : (
                                  <span className="text-slate-400 font-medium text-xs">Class Default</span>
                                )}
                              </td>
                              <td className="py-2 px-4">
                                <StatusBadge status={row.status === 'active' ? 'active' : 'pending'} label={row.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Invalid Rows Table with Inline Error Reasons */}
              {previewTab === 'invalid' && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                  {validationData.invalidRows.length === 0 ? (
                    <div className="py-12 text-center text-emerald-600 text-xs">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-emerald-800">No invalid rows detected!</p>
                      <p className="text-gray-500 mt-1">All rows in your spreadsheet passed validation successfully.</p>
                    </div>
                  ) : (
                    <div className="overflow-y-auto max-h-72 divide-y divide-gray-200">
                      {validationData.invalidRows.map((inv, idx) => (
                        <div key={idx} className="p-4 bg-red-50/20 hover:bg-red-50/40 transition-colors space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                              <span className="px-2.5 py-0.5 rounded-md bg-red-100 text-red-800 font-mono text-xs font-extrabold border border-red-200">
                                Excel Row {inv.rowNumber}
                              </span>
                              <span className="font-bold text-sm text-navy-950">
                                {inv.data?.fullName || 'Missing Name'}
                              </span>
                              {inv.data?.registrationNumber && (
                                <span className="text-xs font-mono text-gray-500 font-semibold">
                                  ({inv.data.registrationNumber})
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-semibold">
                              Class: {inv.data?.className || 'N/A'} | Section: {inv.data?.sectionName || 'N/A'}
                            </span>
                          </div>

                          {/* Error list pills */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {inv.errors.map((errMsg, eIdx) => (
                              <div
                                key={eIdx}
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold shadow-2xs"
                              >
                                <AlertCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                                <span>{errMsg}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Notice */}
              <div className="bg-slate-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-gray-600">
                <span className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-navy-900 flex-shrink-0" />
                  <span>
                    When you confirm, <strong>only the {validationData.validCount} valid row(s)</strong> will be saved to your database. Invalid rows will be skipped.
                  </span>
                </span>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: COMMIT & FINAL REPORT */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6">

              {isCommitting ? (
                <div className="py-16 text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-navy-900 mx-auto" />
                  <div>
                    <h3 className="text-base font-bold text-navy-950">Writing records to database...</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Performing transactional batch commit and creating active student user accounts.
                    </p>
                  </div>
                </div>
              ) : commitResult ? (
                <div className="space-y-6">
                  
                  {/* Status Banner */}
                  <div className={`p-5 rounded-2xl border flex items-center space-x-4 ${
                    commitResult.failedCount === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : commitResult.successCount > 0
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                  }`}>
                    <div className={`p-2.5 rounded-xl ${
                      commitResult.failedCount === 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : commitResult.successCount > 0
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                    }`}>
                      {commitResult.failedCount === 0 ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <AlertTriangle className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base">
                        {commitResult.failedCount === 0
                          ? 'All Student Records Imported Successfully!'
                          : commitResult.successCount > 0
                            ? 'Partial Import Completed'
                            : 'Import Failed'}
                      </h3>
                      <p className="text-xs mt-0.5 opacity-90">
                        {commitResult.successCount} student(s) successfully registered with student portal accounts created.
                      </p>
                    </div>
                  </div>

                  {/* Summary StatCards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <StatCard
                      icon={CheckCircle2}
                      label="Successfully Inserted"
                      value={commitResult.successCount.toString()}
                      trend="Saved to Database"
                      trendColor="active"
                    />
                    <StatCard
                      icon={AlertCircle}
                      label="Failed / Skipped"
                      value={commitResult.failedCount.toString()}
                      trend={commitResult.failedCount > 0 ? 'Action Required' : 'Zero Errors'}
                      trendColor={commitResult.failedCount > 0 ? 'danger' : 'active'}
                    />
                  </div>

                  {/* If there were failed rows during commit or validation, provide error export */}
                  {(commitResult.failedCount > 0 || (validationData?.invalidCount || 0) > 0) && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-navy-950">Download Error Report</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Export a CSV file listing all failed records and exact error reasons to correct and re-upload.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadErrorReport}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-navy-900 rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 flex-shrink-0"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download Error Report (CSV)</span>
                      </button>
                    </div>
                  )}

                </div>
              ) : null}

            </div>
          )}

        </div>

        {/* Modal Footer / Navigation Controls */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          
          {/* Left Button */}
          <div>
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center space-x-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Template</span>
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center space-x-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Upload Different File</span>
              </button>
            )}

            {currentStep === 1 && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Right Action Button */}
          <div className="flex items-center space-x-3">
            {currentStep === 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <span>Continue to Upload</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                disabled={!selectedFile || isValidating}
                onClick={handleValidateFile}
                className="px-5 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-40"
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <span>Validate File</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                disabled={!validationData || validationData.validCount === 0 || isCommitting}
                onClick={handleConfirmCommit}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Import ({validationData?.validCount || 0} Students)</span>
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Done
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default BulkStudentImportModal;
