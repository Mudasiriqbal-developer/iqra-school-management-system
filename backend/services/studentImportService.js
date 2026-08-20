const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { z } = require('zod');

const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const Section = require('../models/Section');

/**
 * Standardizes date parsing from Excel serial numbers, Date instances, or string formats.
 * Supports YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, etc.
 * @param {any} val 
 * @returns {Date|null}
 */
const parseDateValue = (val) => {
  if (!val && val !== 0) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }

  // Handle Excel serial date numbers (e.g. 44561)
  if (typeof val === 'number') {
    // Excel base date is Dec 30 1899 due to the 1900 leap year bug
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Check if format is DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const date = new Date(year, month, day);
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
    }

    // Try standard ISO parsing
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

/**
 * Normalizes header keys for tolerant spreadsheet parsing.
 * @param {string} key 
 * @returns {string}
 */
const normalizeHeader = (key) => {
  if (!key) return '';
  return key
    .toString()
    .toLowerCase()
    .replace(/[*#]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Maps normalized header keys to standard internal field names.
 */
const HEADER_MAPPING = {
  registrationnumber: 'registrationNumber',
  regnumber: 'registrationNumber',
  regno: 'registrationNumber',
  rollnumber: 'registrationNumber',
  rollno: 'registrationNumber',
  studentid: 'registrationNumber',

  fullname: 'fullName',
  studentname: 'fullName',
  name: 'fullName',

  fathername: 'fatherName',
  guardianname: 'fatherName',
  fatherguardianname: 'fatherName',

  gender: 'gender',
  sex: 'gender',

  dateofbirth: 'dateOfBirth',
  dob: 'dateOfBirth',
  birthdate: 'dateOfBirth',

  fathercontact: 'fatherContact',
  contactnumber: 'fatherContact',
  contact: 'fatherContact',
  phone: 'fatherContact',
  phonenumber: 'fatherContact',
  mobilenumber: 'fatherContact',
  mobile: 'fatherContact',
  guardiancontact: 'fatherContact',

  class: 'className',
  classname: 'className',
  grade: 'className',

  section: 'sectionName',
  sectionname: 'sectionName',

  monthlyfeeamount: 'monthlyFeeAmount',
  monthlyfee: 'monthlyFeeAmount',
  fee: 'monthlyFeeAmount',
  tuitionfee: 'monthlyFeeAmount',

  address: 'address',
  homeaddress: 'address',
  residentialaddress: 'address',

  status: 'status',
  studentstatus: 'status',
};

/**
 * Zod schema for single row structure validation.
 */
const rowZodSchema = z.object({
  registrationNumber: z.string({ required_error: 'Registration number is required' })
    .min(1, 'Registration number is required')
    .max(50, 'Registration number too long'),
  fullName: z.string({ required_error: 'Full name is required' })
    .min(1, 'Full name is required')
    .max(100, 'Full name too long'),
  fatherName: z.string({ required_error: "Father's name is required" })
    .min(1, "Father's name is required")
    .max(100, "Father's name too long"),
  gender: z.enum(['male', 'female', 'other'], {
    errorMap: () => ({ message: 'Gender must be male, female, or other' }),
  }),
  fatherContact: z.string({ required_error: "Father's contact is required" })
    .min(5, 'Contact number is too short')
    .max(25, 'Contact number is too long'),
  className: z.string({ required_error: 'Class name is required' })
    .min(1, 'Class name is required'),
  sectionName: z.string({ required_error: 'Section name is required' })
    .min(1, 'Section name is required'),
  monthlyFeeAmount: z.number().min(0, 'Monthly fee cannot be negative').optional(),
  address: z.string().max(300, 'Address too long').optional(),
  status: z.enum(['active', 'on_leave', 'suspended'], {
    errorMap: () => ({ message: 'Status must be active, on_leave, or suspended' }),
  }).optional(),
});

/**
 * Generates an Excel template (.xlsx buffer) for student bulk import.
 * Includes column headers, sample rows, and a second reference sheet with valid classes and sections.
 */
const generateImportTemplate = async () => {
  const classes = await Class.find().sort({ orderIndex: 1, name: 1 }).lean();
  const sections = await Section.find().populate('classId', 'name').sort({ orderIndex: 1, name: 1 }).lean();

  // Template columns
  const templateHeaders = [
    'Registration Number *',
    'Full Name *',
    'Father Name *',
    'Gender *',
    'Date of Birth *',
    'Father Contact *',
    'Class *',
    'Section *',
    'Monthly Fee',
    'Address',
    'Status',
  ];

  // Provide realistic sample rows
  const sampleClassName = classes.length > 0 ? classes[0].name : '1';
  const matchingSection = sections.find(s => s.classId && s.classId.name === sampleClassName);
  const sampleSectionName = matchingSection ? matchingSection.name : 'A';

  const sampleRows = [
    [
      '26001',
      'Muhammad Hamza',
      'Tariq Mahmood',
      'male',
      '2016-04-15',
      '03001234567',
      sampleClassName,
      sampleSectionName,
      2500,
      'House 14, Street 3, Sector G-9/1, Islamabad',
      'active',
    ],
    [
      '26002',
      'Fatima Zahra',
      'Usman Ghani',
      'female',
      '2017-09-22',
      '03129876543',
      sampleClassName,
      sampleSectionName,
      2500,
      'Flat 4B, Iqra Heights, Rawalpindi',
      'active',
    ],
  ];

  const templateData = [templateHeaders, ...sampleRows];
  const templateSheet = xlsx.utils.aoa_to_sheet(templateData);

  // Set column widths
  templateSheet['!cols'] = [
    { wch: 22 }, // Registration Number
    { wch: 22 }, // Full Name
    { wch: 22 }, // Father Name
    { wch: 12 }, // Gender
    { wch: 16 }, // Date of Birth
    { wch: 18 }, // Father Contact
    { wch: 16 }, // Class
    { wch: 16 }, // Section
    { wch: 14 }, // Monthly Fee
    { wch: 35 }, // Address
    { wch: 14 }, // Status
  ];

  // Reference sheet with available classes and sections in the school system
  const referenceData = [
    ['Class Name', 'Gender Type', 'Available Sections'],
  ];

  classes.forEach((cls) => {
    const classSections = sections
      .filter((s) => s.classId && (s.classId._id.toString() === cls._id.toString() || s.classId.name === cls.name))
      .map((s) => s.name)
      .join(', ');

    referenceData.push([
      cls.name,
      cls.gender ? (cls.gender.charAt(0).toUpperCase() + cls.gender.slice(1)) : 'Mixed',
      classSections || 'None created yet',
    ]);
  });

  const referenceSheet = xlsx.utils.aoa_to_sheet(referenceData);
  referenceSheet['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 30 }];

  // Instructions sheet
  const instructionData = [
    ['Bulk Student Import Instructions'],
    [''],
    ['Field Name', 'Required', 'Accepted Values / Format', 'Description'],
    ['Registration Number', 'Yes', 'Unique alphanumeric string (e.g. 26001)', 'Student roll/admission number. Must be unique in system.'],
    ['Full Name', 'Yes', 'Text (e.g. Abdullah Khan)', 'Student legal name.'],
    ['Father Name', 'Yes', 'Text (e.g. Imran Khan)', "Father's / Guardian's name."],
    ['Gender', 'Yes', 'male / female / other', 'Case-insensitive gender value.'],
    ['Date of Birth', 'Yes', 'YYYY-MM-DD or DD/MM/YYYY (e.g. 2016-05-20)', 'Valid date of birth.'],
    ['Father Contact', 'Yes', 'Phone number (e.g. 03001234567)', 'Primary contact number for alerts and portal.'],
    ['Class', 'Yes', 'Exact class name from system (see Valid Reference Values tab)', 'Must match an existing active class in database.'],
    ['Section', 'Yes', 'Exact section name under that class', 'Must match an existing section under the specified class.'],
    ['Monthly Fee', 'No', 'Number >= 0 (e.g. 3000)', 'Defaults to 0 if left empty.'],
    ['Address', 'No', 'Text', 'Residential address of the student.'],
    ['Status', 'No', 'active / on_leave / suspended', 'Defaults to active if left empty.'],
  ];
  const instructionSheet = xlsx.utils.aoa_to_sheet(instructionData);
  instructionSheet['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 38 }, { wch: 50 }];

  // Build workbook
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, templateSheet, 'Student Import Template');
  xlsx.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');
  xlsx.utils.book_append_sheet(workbook, referenceSheet, 'Valid Reference Values');

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Validates an uploaded CSV/Excel spreadsheet without persisting to the database.
 * Returns parsed valid rows and detailed row-by-row invalid error reports.
 * 
 * @param {Buffer} fileBuffer 
 * @returns {Promise<{ validRows: Array, invalidRows: Array, totalRows: number, validCount: number, invalidCount: number }>}
 */
const validateImportFile = async (fileBuffer) => {
  if (!fileBuffer || fileBuffer.length === 0) {
    const error = new Error('Empty file uploaded');
    error.statusCode = 400;
    throw error;
  }

  // Parse spreadsheet buffer
  let workbook;
  try {
    workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true, raw: false });
  } catch (err) {
    const error = new Error('Failed to parse spreadsheet. Please ensure it is a valid .csv, .xlsx, or .xls file.');
    error.statusCode = 400;
    throw error;
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    const error = new Error('Spreadsheet contains no sheets');
    error.statusCode = 400;
    throw error;
  }

  const worksheet = workbook.Sheets[sheetName];
  // Parse rows as raw 2D array to inspect headers and data
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length <= 1) {
    const error = new Error('Spreadsheet contains no data rows to import');
    error.statusCode = 400;
    throw error;
  }

  // Header row extraction
  const headerRow = rawRows[0];
  const headerMap = {}; // colIndex -> standardFieldName

  headerRow.forEach((colName, index) => {
    const norm = normalizeHeader(colName);
    if (HEADER_MAPPING[norm]) {
      headerMap[index] = HEADER_MAPPING[norm];
    }
  });

  // Verify mandatory columns exist in header
  const detectedFields = Object.values(headerMap);
  const mandatoryFields = ['registrationNumber', 'fullName', 'fatherName', 'gender', 'dateOfBirth', 'fatherContact', 'className', 'sectionName'];
  const missingHeaders = mandatoryFields.filter(f => !detectedFields.includes(f));

  if (missingHeaders.length > 0) {
    const humanNames = {
      registrationNumber: 'Registration Number',
      fullName: 'Full Name',
      fatherName: 'Father Name',
      gender: 'Gender',
      dateOfBirth: 'Date of Birth',
      fatherContact: 'Father Contact',
      className: 'Class',
      sectionName: 'Section',
    };
    const missingHuman = missingHeaders.map(h => humanNames[h] || h).join(', ');
    const error = new Error(`Missing required column headers: ${missingHuman}. Please download the official template.`);
    error.statusCode = 400;
    throw error;
  }

  // Fetch DB Reference Data (Classes & Sections)
  const allClasses = await Class.find().lean();
  const allSections = await Section.find().lean();

  // Create lookup maps
  const classMap = new Map(); // className.toLowerCase() -> classDoc
  allClasses.forEach(c => {
    classMap.set(c.name.toString().trim().toLowerCase(), c);
  });

  const sectionMap = new Map(); // `${classId}_${sectionName.toLowerCase()}` -> sectionDoc
  allSections.forEach(s => {
    sectionMap.set(`${s.classId.toString()}_${s.name.toString().trim().toLowerCase()}`, s);
  });

  // Fetch existing Registration Numbers from Student and User collections
  const existingStudents = await Student.find({}, 'registrationNumber fullName dateOfBirth fatherContact').lean();
  const existingUsers = await User.find({ registrationNumber: { $exists: true, $ne: null } }, 'registrationNumber').lean();

  const existingRegNumbers = new Set();
  existingStudents.forEach(s => {
    if (s.registrationNumber) existingRegNumbers.add(s.registrationNumber.trim().toLowerCase());
  });
  existingUsers.forEach(u => {
    if (u.registrationNumber) existingRegNumbers.add(u.registrationNumber.trim().toLowerCase());
  });

  // Create fingerprint set for existing student duplicate detection:
  // "fullname_dob(yyyy-mm-dd)_contactDigits"
  const existingStudentFingerprints = new Set();
  existingStudents.forEach(s => {
    if (s.fullName && s.dateOfBirth && s.fatherContact) {
      const dobStr = new Date(s.dateOfBirth).toISOString().split('T')[0];
      const contactClean = s.fatherContact.toString().replace(/\D/g, '');
      const key = `${s.fullName.trim().toLowerCase()}_${dobStr}_${contactClean}`;
      existingStudentFingerprints.add(key);
    }
  });

  // Track within-file duplicates
  const fileRegNumbers = new Set();
  const fileFingerprints = new Set();

  const validRows = [];
  const invalidRows = [];

  // Iterate over data rows (index 1 to rawRows.length - 1)
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNumber = i + 1; // 1-based Excel row number (Row 1 is header)

    // Check if entire row is empty
    const isRowEmpty = row.every(val => val === '' || val === null || val === undefined);
    if (isRowEmpty) {
      continue;
    }

    // Extract row data object using header map
    const rawData = {};
    Object.keys(headerMap).forEach(colIndex => {
      const fieldName = headerMap[colIndex];
      const cellVal = row[colIndex];
      rawData[fieldName] = cellVal !== undefined && cellVal !== null ? cellVal.toString().trim() : '';
    });

    const errors = [];

    // Parse and sanitize raw fields
    const registrationNumber = rawData.registrationNumber ? rawData.registrationNumber.trim() : '';
    const fullName = rawData.fullName ? rawData.fullName.trim() : '';
    const fatherName = rawData.fatherName ? rawData.fatherName.trim() : '';
    const genderRaw = rawData.gender ? rawData.gender.toLowerCase().trim() : '';
    const fatherContact = rawData.fatherContact ? rawData.fatherContact.trim() : '';
    const classNameRaw = rawData.className ? rawData.className.trim() : '';
    const sectionNameRaw = rawData.sectionName ? rawData.sectionName.trim() : '';
    const address = rawData.address ? rawData.address.trim() : '';
    const statusRaw = rawData.status ? rawData.status.toLowerCase().trim() : 'active';
    const monthlyFeeRaw = rawData.monthlyFeeAmount !== '' && rawData.monthlyFeeAmount !== undefined ? rawData.monthlyFeeAmount : '0';

    // Parse Date of Birth
    const dobRaw = rawData.dateOfBirth;
    const parsedDob = parseDateValue(dobRaw);

    let monthlyFeeNumber = 0;
    if (monthlyFeeRaw !== '' && monthlyFeeRaw !== undefined) {
      const parsedFee = Number(monthlyFeeRaw);
      if (isNaN(parsedFee) || parsedFee < 0) {
        errors.push('Monthly fee must be a valid non-negative number');
      } else {
        monthlyFeeNumber = parsedFee;
      }
    }

    // Zod schema structural validation
    const zodResult = rowZodSchema.safeParse({
      registrationNumber,
      fullName,
      fatherName,
      gender: genderRaw,
      fatherContact,
      className: classNameRaw,
      sectionName: sectionNameRaw,
      monthlyFeeAmount: monthlyFeeNumber,
      address,
      status: statusRaw || 'active',
    });

    if (!zodResult.success) {
      const issues = zodResult.error?.issues || zodResult.error?.errors || [];
      issues.forEach(err => {
        errors.push(err.message);
      });
    }

    // Date validation
    if (!parsedDob) {
      errors.push('Invalid Date of Birth format. Please use YYYY-MM-DD or DD/MM/YYYY.');
    } else {
      // Basic sanity check: DOB should be in the past and reasonable
      const now = new Date();
      if (parsedDob >= now) {
        errors.push('Date of Birth must be in the past');
      }
    }

    // Registration number uniqueness check
    if (registrationNumber) {
      const regKey = registrationNumber.toLowerCase();
      if (fileRegNumbers.has(regKey)) {
        errors.push(`Duplicate Registration Number "${registrationNumber}" found in this upload file.`);
      } else {
        fileRegNumbers.add(regKey);
      }

      if (existingRegNumbers.has(regKey)) {
        errors.push(`A student or user with Registration Number "${registrationNumber}" already exists in the system.`);
      }
    }

    // Class & Section DB validation
    let resolvedClassId = null;
    let resolvedSectionId = null;

    if (classNameRaw) {
      const classDoc = classMap.get(classNameRaw.toLowerCase());
      if (!classDoc) {
        // Suggest available classes
        const availableClasses = Array.from(classMap.values()).map(c => c.name).join(', ');
        errors.push(`Class "${classNameRaw}" not found in database. Available classes: [${availableClasses || 'None'}]`);
      } else {
        resolvedClassId = classDoc._id.toString();

        if (sectionNameRaw) {
          const sectionKey = `${resolvedClassId}_${sectionNameRaw.toLowerCase()}`;
          const sectionDoc = sectionMap.get(sectionKey);
          if (!sectionDoc) {
            // Find sections available for this specific class
            const validSectionsForClass = allSections
              .filter(s => s.classId && s.classId.toString() === resolvedClassId)
              .map(s => s.name)
              .join(', ');
            errors.push(`Section "${sectionNameRaw}" not found under Class "${classDoc.name}". Available sections: [${validSectionsForClass || 'None'}]`);
          } else {
            resolvedSectionId = sectionDoc._id.toString();
          }
        }
      }
    }

    // Duplicate student check (Full Name + DOB + Father Contact)
    if (fullName && parsedDob && fatherContact) {
      const dobIsoStr = parsedDob.toISOString().split('T')[0];
      const contactDigits = fatherContact.replace(/\D/g, '');
      const studentFingerprint = `${fullName.toLowerCase()}_${dobIsoStr}_${contactDigits}`;

      if (fileFingerprints.has(studentFingerprint)) {
        errors.push(`Duplicate student "${fullName}" (same DOB and contact) appears multiple times in this file.`);
      } else {
        fileFingerprints.add(studentFingerprint);
      }

      if (existingStudentFingerprints.has(studentFingerprint)) {
        errors.push(`Student "${fullName}" with matching Date of Birth and Father Contact already exists in the database.`);
      }
    }

    const rowPayload = {
      rowNumber,
      registrationNumber,
      fullName,
      fatherName,
      gender: genderRaw || 'male',
      dateOfBirth: parsedDob ? parsedDob.toISOString() : null,
      fatherContact,
      className: classNameRaw,
      sectionName: sectionNameRaw,
      classId: resolvedClassId,
      sectionId: resolvedSectionId,
      monthlyFeeAmount: monthlyFeeNumber,
      address,
      status: statusRaw || 'active',
    };

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber,
        data: rowPayload,
        errors,
      });
    } else {
      validRows.push(rowPayload);
    }
  }

  const totalRows = validRows.length + invalidRows.length;

  return {
    validRows,
    invalidRows,
    totalRows,
    validCount: validRows.length,
    invalidCount: invalidRows.length,
  };
};

/**
 * Commits an array of validated student records into the database in batches.
 * Includes complete TOCTOU re-validation inside a MongoDB transaction session.
 * 
 * @param {Array} rows - Array of validated student row objects
 * @returns {Promise<{ successCount: number, failedCount: number, failedRows: Array }>}
 */
const commitImport = async (rows) => {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    const error = new Error('No valid student rows provided for import');
    error.statusCode = 400;
    throw error;
  }

  // 1. Pre-hash default password once outside loop for student User accounts
  const defaultPassword = 'student123';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(defaultPassword, salt);

  // 2. Fetch fresh DB state for TOCTOU Re-Validation via bulk $in queries before transaction opens
  const incomingClassIds = [...new Set(rows.map(r => r.classId).filter(Boolean))];
  const incomingSectionIds = [...new Set(rows.map(r => r.sectionId).filter(Boolean))];
  const incomingRegNumbers = [...new Set(rows.map(r => (r.registrationNumber || '').trim().toLowerCase()).filter(Boolean))];
  const incomingFullNames = [...new Set(rows.map(r => (r.fullName || '').trim()).filter(Boolean))];

  const [classes, sections, existingStudents, existingUsers] = await Promise.all([
    Class.find({ _id: { $in: incomingClassIds } }).lean(),
    Section.find({ _id: { $in: incomingSectionIds } }).lean(),
    Student.find({
      $or: [
        { registrationNumber: { $in: incomingRegNumbers } },
        { fullName: { $in: incomingFullNames.map(name => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } },
      ],
    }, 'registrationNumber fullName dateOfBirth fatherContact').lean(),
    User.find({ registrationNumber: { $in: incomingRegNumbers } }, 'registrationNumber').lean(),
  ]);

  const classMap = new Map();
  classes.forEach(c => classMap.set(c._id.toString(), c));

  const sectionMap = new Map();
  sections.forEach(s => sectionMap.set(s._id.toString(), s));

  const existingRegNumbers = new Set();
  existingStudents.forEach(s => {
    if (s.registrationNumber) existingRegNumbers.add(s.registrationNumber.trim().toLowerCase());
  });
  existingUsers.forEach(u => {
    if (u.registrationNumber) existingRegNumbers.add(u.registrationNumber.trim().toLowerCase());
  });

  const existingFingerprints = new Set();
  existingStudents.forEach(s => {
    if (s.fullName && s.dateOfBirth && s.fatherContact) {
      const dobStr = new Date(s.dateOfBirth).toISOString().split('T')[0];
      const contactClean = s.fatherContact.toString().replace(/\D/g, '');
      existingFingerprints.add(`${s.fullName.trim().toLowerCase()}_${dobStr}_${contactClean}`);
    }
  });

  // Track within-batch items to prevent intra-payload collisions
  const batchRegNumbers = new Set();
  const batchFingerprints = new Set();

  const rowsToInsert = [];
  const failedRows = [];

  // TOCTOU Validation pass
  for (const row of rows) {
    const errors = [];
    const regKey = (row.registrationNumber || '').trim().toLowerCase();

    if (!regKey) {
      errors.push('Registration number is missing');
    } else {
      if (batchRegNumbers.has(regKey) || existingRegNumbers.has(regKey)) {
        errors.push(`Registration number "${row.registrationNumber}" already exists in the system (detected at commit time).`);
      } else {
        batchRegNumbers.add(regKey);
      }
    }

    if (!row.classId || !classMap.has(row.classId.toString())) {
      errors.push(`Assigned Class is no longer available in the database.`);
    }

    if (!row.sectionId || !sectionMap.has(row.sectionId.toString())) {
      errors.push(`Assigned Section is no longer available in the database.`);
    }

    if (row.fullName && row.dateOfBirth && row.fatherContact) {
      const dobStr = new Date(row.dateOfBirth).toISOString().split('T')[0];
      const contactClean = row.fatherContact.toString().replace(/\D/g, '');
      const fingerprint = `${row.fullName.trim().toLowerCase()}_${dobStr}_${contactClean}`;

      if (batchFingerprints.has(fingerprint) || existingFingerprints.has(fingerprint)) {
        errors.push(`Student "${row.fullName}" already exists in the system (duplicate name, DOB, and contact).`);
      } else {
        batchFingerprints.add(fingerprint);
      }
    }

    if (errors.length > 0) {
      failedRows.push({
        rowNumber: row.rowNumber || 0,
        registrationNumber: row.registrationNumber,
        fullName: row.fullName,
        errors,
      });
    } else {
      rowsToInsert.push(row);
    }
  }

  if (rowsToInsert.length === 0) {
    return {
      successCount: 0,
      failedCount: failedRows.length,
      failedRows,
    };
  }

  // 3. Batch commit inside MongoDB transaction session
  let session = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch (err) {
    // MongoDB standalone without replica set might not support transactions
    session = null;
    useTransaction = false;
  }

  const BATCH_SIZE = 200;
  let successCount = 0;

  try {
    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const chunk = rowsToInsert.slice(i, i + BATCH_SIZE);

      // Prepare Student records
      const studentDocs = chunk.map(r => ({
        registrationNumber: r.registrationNumber.trim().toLowerCase(),
        fullName: r.fullName.trim(),
        fatherName: r.fatherName.trim(),
        gender: r.gender,
        dateOfBirth: new Date(r.dateOfBirth),
        fatherContact: r.fatherContact.trim(),
        address: r.address ? r.address.trim() : '',
        classId: r.classId,
        sectionId: r.sectionId,
        monthlyFeeAmount: Number(r.monthlyFeeAmount) || 0,
        status: r.status || 'active',
        photoUrl: '',
        admissionFee: 0,
        books: [],
        admissionTotal: 0,
        admissionAmountPaid: 0,
        admissionPaymentStatus: null,
      }));

      // Prepare User accounts
      const userDocs = chunk.map(r => ({
        name: r.fullName.trim(),
        registrationNumber: r.registrationNumber.trim().toLowerCase(),
        password: hashedPassword,
        role: 'student',
        phone: r.fatherContact.trim(),
        isActivated: true,
        isActive: true,
      }));

      if (useTransaction && session) {
        await Student.insertMany(studentDocs, { session });
        await User.insertMany(userDocs, { session });
      } else {
        await Student.insertMany(studentDocs);
        await User.insertMany(userDocs);
      }

      successCount += chunk.length;
    }

    if (useTransaction && session) {
      await session.commitTransaction();
    }
  } catch (err) {
    if (useTransaction && session) {
      await session.abortTransaction();
    }
    const error = new Error(`Import commit failed: ${err.message}`);
    error.statusCode = 500;
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }

  return {
    successCount,
    failedCount: failedRows.length,
    failedRows,
  };
};

module.exports = {
  generateImportTemplate,
  validateImportFile,
  commitImport,
};
