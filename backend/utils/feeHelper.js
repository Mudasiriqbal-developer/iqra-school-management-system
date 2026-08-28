const resolveStudentMonthlyFee = (student, classDoc = null) => {
  if (!student) return 0;
  if (student.customFee !== null && student.customFee !== undefined) {
    const custom = Number(student.customFee);
    if (!isNaN(custom) && custom >= 0) return custom;
  }
  const cls = classDoc || (student.classId && typeof student.classId === 'object' ? student.classId : null);
  if (cls && cls.defaultFee !== null && cls.defaultFee !== undefined) {
    const defaultFee = Number(cls.defaultFee);
    if (!isNaN(defaultFee) && defaultFee >= 0) return defaultFee;
  }
  return 0;
};

module.exports = {
  resolveStudentMonthlyFee,
};
