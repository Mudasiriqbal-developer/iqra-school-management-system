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

export const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

