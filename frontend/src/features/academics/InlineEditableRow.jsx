import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Check, X, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

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
  dragOver = false,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      setEditValue(label);
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
            className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
            title="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 text-gray-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center flex-grow truncate pr-2">
            {draggable && (
              <GripVertical className="h-4 w-4 text-gray-500 dark:text-slate-500 mr-1 cursor-grab active:cursor-grabbing flex-shrink-0 hidden sm:block" />
            )}
            {(onMoveUp || onMoveDown) && (
              <div className="flex items-center space-x-1 mr-2">
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={onMoveUp}
                  className="p-1 min-w-[32px] min-h-[32px] text-gray-500 hover:text-navy-950 dark:text-slate-400 dark:hover:text-sky-300 disabled:opacity-30 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                  title="Move Up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  onClick={onMoveDown}
                  className="p-1 min-w-[32px] min-h-[32px] text-gray-500 hover:text-navy-950 dark:text-slate-400 dark:hover:text-sky-300 disabled:opacity-30 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                  title="Move Down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <span className="text-sm truncate flex-grow font-medium text-gray-800 dark:text-slate-100">{label}</span>
          </div>
          <div className="flex items-center space-x-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={startEditing}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-gray-500 dark:text-slate-400 hover:text-navy-900 dark:hover:text-sky-300 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-xl transition-colors"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-rose-400 hover:bg-red-100/80 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default InlineEditableRow;

