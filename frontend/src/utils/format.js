export const formatClassName = (name) => {
  if (!name) return '';
  const isNumeric = /^\d+$/.test(name);
  return isNumeric ? `Class ${name}` : name;
};

export const formatClassNameWithGender = (name, gender) => {
  const formattedName = formatClassName(name);
  if (!gender || gender === 'mixed') {
    return `${formattedName} — Mixed`;
  }
  return `${formattedName} — ${gender.charAt(0).toUpperCase() + gender.slice(1)}`;
};
