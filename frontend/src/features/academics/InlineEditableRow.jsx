import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';

const InlineEditableRow = ({
  label,
  onSave,
  onDelete,
  isSelected,
  onClick,
  draggable = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragLeave,
  onDrop,
  dragOver = false
}) => {
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
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-navy-900/30 bg-navy-50/80 dark:bg-sky-950/40 dark:border-sky-500/50 border-l-4 border-l-navy-900 dark:border-l-sky-400 shadow-xs font-bold text-navy-950 dark:text-sky-300'
          : 'border-gray-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200'
      } ${
        dragOver ? 'border-t-2 border-t-navy-900 dark:border-t-sky-400 border-dashed pt-2.5' : ''
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
            className="flex-grow px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-900/50 dark:focus:ring-sky-400/50 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            placeholder="Enter name..."
          />
          <button
            onClick={handleSave}
            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
            title="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1.5 text-gray-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center flex-grow truncate pr-2">
            {draggable && (
              <GripVertical className="h-4 w-4 text-gray-400 dark:text-slate-500 mr-2 cursor-grab active:cursor-grabbing flex-shrink-0" />
            )}
            <span className="text-sm truncate flex-grow font-medium">{label}</span>
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={startEditing}
              className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-navy-900 dark:hover:text-sky-300 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-rose-400 hover:bg-red-100/80 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
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
