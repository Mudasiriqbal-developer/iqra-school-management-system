const Student = require('../models/Student');
const Class = require('../models/Class');
const Section = require('../models/Section');

/**
 * Normalizes section names for smart comparison.
 * e.g. "Section A" -> "a", "Sec - A" -> "a", "A" -> "a"
 */
const normalizeSectionName = (name) => {
  if (!name) return '';
  return name.toString().toLowerCase().replace(/section|sec|[-_\s]/g, '').trim();
};

/**
 * Intelligently resolves the target section ID for a student moving to a new class.
 */
const resolveTargetSection = async (studentSectionName, targetClassId, explicitTargetSectionId) => {
  let targetSections = await Section.find({ classId: targetClassId }).sort({ orderIndex: 1, name: 1 });

  // If target class has NO sections at all, guarantee default section "A"
  if (targetSections.length === 0) {
    try {
      const defaultSec = await Section.create({
        name: 'A',
        classId: targetClassId,
        orderIndex: 0,
      });
      targetSections = [defaultSec];
    } catch (err) {
      console.error('Error auto-creating default Section A for target class:', err);
    }
  }

  // 1. If explicit target section provided by admin and valid
  if (explicitTargetSectionId) {
    const explicitMatch = targetSections.find(s => s._id.toString() === explicitTargetSectionId.toString());
    if (explicitMatch) return explicitMatch._id;
  }

  // 2. Exact case-insensitive match (e.g. "A" === "A" or "Section A" === "Section A")
  if (studentSectionName) {
    const exactMatch = targetSections.find(
      s => s.name.trim().toLowerCase() === studentSectionName.trim().toLowerCase()
    );
    if (exactMatch) return exactMatch._id;

    // 3. Normalized match (e.g. "Section A" matches "A", "Sec B" matches "B")
    const normSource = normalizeSectionName(studentSectionName);
    if (normSource) {
      const normMatch = targetSections.find(s => normalizeSectionName(s.name) === normSource);
      if (normMatch) return normMatch._id;
    }
  }

  // 4. Default section "A" or "Section A" in target class
  const defaultA = targetSections.find(s => normalizeSectionName(s.name) === 'a');
  if (defaultA) return defaultA._id;

  // 5. Fallback to first available section in target class
  if (targetSections.length > 0) return targetSections[0]._id;

  // 6. Ultimate fallback: create section "A"
  const createdFallback = await Section.create({
    name: 'A',
    classId: targetClassId,
    orderIndex: 0,
  });
  return createdFallback._id;
};

/**
 * @desc    Get promotion preview for a class & section
 * @route   GET /api/admin/promotion/preview
 * @access  Private (Admin)
 */
const getPromotionPreview = async (req, res, next) => {
  try {
    const { classId, sectionId } = req.query;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId is required' });
    }

    const sourceClass = await Class.findById(classId);
    if (!sourceClass) {
      return res.status(404).json({ success: false, message: 'Source class not found' });
    }

    const filter = { classId, status: 'active' };
    if (sectionId) {
      filter.sectionId = sectionId;
    }

    const students = await Student.find(filter)
      .populate('classId', 'name gender')
      .populate('sectionId', 'name')
      .sort({ fullName: 1 });

    const targetClass = await Class.findOne({ orderIndex: { $gt: sourceClass.orderIndex } })
      .sort({ orderIndex: 1 });

    let targetSections = [];
    if (targetClass) {
      targetSections = await Section.find({ classId: targetClass._id }).sort({ orderIndex: 1, name: 1 });
      // Ensure target class has at least default section "A"
      if (targetSections.length === 0) {
        try {
          const defaultSec = await Section.create({
            name: 'A',
            classId: targetClass._id,
            orderIndex: 0,
          });
          targetSections = [defaultSec];
        } catch (secErr) {
          console.error('Error auto-creating default section for target class:', secErr);
        }
      }
    }

    const isGraduation = !targetClass;

    res.status(200).json({
      success: true,
      data: {
        sourceClass,
        targetClass: targetClass || null,
        targetSections,
        students,
        isGraduation,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Execute bulk promotion or graduation
 * @route   POST /api/admin/promotion/execute
 * @access  Private (Admin)
 */
const executePromotion = async (req, res, next) => {
  try {
    const { classId, sectionId, studentIds, action, targetSectionId } = req.body;

    if (!classId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !action) {
      return res.status(400).json({ success: false, message: 'Invalid input parameters' });
    }

    // 1. GRADUATION ACTION
    if (action === 'graduate') {
      const result = await Student.updateMany(
        { _id: { $in: studentIds } },
        { status: 'graduated' }
      );
      
      return res.status(200).json({
        success: true,
        data: { graduated: result.modifiedCount },
        message: `Successfully graduated ${result.modifiedCount} student(s).`,
      });
    }

    // 2. PROMOTION ACTION
    if (action === 'promote') {
      const sourceClass = await Class.findById(classId);
      if (!sourceClass) {
        return res.status(404).json({ success: false, message: 'Source class not found' });
      }

      const targetClass = await Class.findOne({ orderIndex: { $gt: sourceClass.orderIndex } })
        .sort({ orderIndex: 1 });
      if (!targetClass) {
        return res.status(400).json({ success: false, message: 'No target class found for promotion (highest grade reached)' });
      }

      const students = await Student.find({ _id: { $in: studentIds } }).populate('sectionId', 'name');
      
      let promotedCount = 0;
      for (const student of students) {
        const studentSectionName = student.sectionId ? student.sectionId.name : 'A';
        const finalSectionId = await resolveTargetSection(
          studentSectionName,
          targetClass._id,
          targetSectionId
        );

        await Student.findByIdAndUpdate(student._id, {
          classId: targetClass._id,
          sectionId: finalSectionId,
        });
        promotedCount++;
      }

      return res.status(200).json({
        success: true,
        data: { promoted: promotedCount, targetClass: targetClass.name },
        message: `Successfully promoted ${promotedCount} student(s) to ${targetClass.name}.`,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid action specified' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPromotionPreview,
  executePromotion,
};
