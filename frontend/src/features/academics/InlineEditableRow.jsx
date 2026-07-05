import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';

const InlineEditableRow = ({ label, onSave, onDelete, isSelected, onClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      setEditValue(label);
      // Wait for DOM to render the input before focusing
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isEditing, label]);

  const handleSave = (e) => {
    if (e) e.stopPropagation();
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      onSave(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = (e) => {
    if (e) e.stopPropagation();
    setIsEditing(false);
    setEditValue(label);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave(e);
    } else if (e.key === 'Escape') {
      handleCancel(e);
    }
  };

  const startEditing = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-navy-900/20 bg-navy-900/5 border-l-4 border-l-navy-900 shadow-sm font-semibold text-navy-900'
          : 'border-gray-200/50 hover:bg-slate-50 text-gray-700'
      }`}
    >
      {isEditing ? (
        <div className="flex items-center space-x-2 w-full" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 focus:border-navy-900 bg-white"
            placeholder="Enter name..."
          />
          <button
            onClick={handleSave}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <span className="text-sm truncate pr-2 flex-grow">{label}</span>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={startEditing}
              className="p-1.5 text-gray-500 hover:text-navy-900 hover:bg-gray-200/50 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default InlineEditableRow;
