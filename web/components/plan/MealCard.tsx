'use client';

import { useState, useRef } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import type { Meal } from '@/lib/api';

const MEAL_TYPE_LABELS: Record<Meal['mealType'], string> = {
  BREAKFAST: 'Colazione',
  LUNCH: 'Pranzo',
  DINNER: 'Cena',
  SNACK: 'Spuntino',
};

const MEAL_TYPE_ICONS: Record<Meal['mealType'], string> = {
  BREAKFAST: '☀️',
  LUNCH: '🍽️',
  DINNER: '🌙',
  SNACK: '🥜',
};

interface MealCardProps {
  meal: Meal;
  onUpdate?: (mealId: string, data: { targetKcal?: number; description?: string }) => Promise<void>;
  readOnly?: boolean;
}

export function MealCard({ meal, onUpdate, readOnly = false }: MealCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editKcal, setEditKcal] = useState(String(meal.targetKcal));
  const [editDesc, setEditDesc] = useState(meal.description);
  const [isSaving, setIsSaving] = useState(false);
  const kcalInputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = () => {
    setEditKcal(String(meal.targetKcal));
    setEditDesc(meal.description);
    setIsEditing(true);
    setTimeout(() => kcalInputRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!onUpdate) return;

    const newKcal = parseInt(editKcal, 10);
    if (isNaN(newKcal) || newKcal < 0) return;

    setIsSaving(true);
    try {
      await onUpdate(meal.id, {
        targetKcal: newKcal,
        description: editDesc.trim() || meal.description,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className="group flex items-start gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700 transition-colors hover:border-slate-600">
      {/* Icon tipo pasto */}
      <span className="text-lg mt-0.5 select-none" aria-hidden="true">
        {MEAL_TYPE_ICONS[meal.mealType]}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            {MEAL_TYPE_LABELS[meal.mealType]}
          </p>

          {/* Kcal */}
          {isEditing ? (
            <input
              ref={kcalInputRef}
              type="number"
              value={editKcal}
              onChange={(e) => setEditKcal(e.target.value)}
              onKeyDown={handleKeyDown}
              min="0"
              className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-right text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-compliance-partial"
              aria-label="Target kcal"
            />
          ) : (
            <span className="text-sm font-mono text-slate-300">{meal.targetKcal} kcal</span>
          )}
        </div>

        {/* Description */}
        {isEditing ? (
          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-compliance-partial"
            aria-label="Descrizione pasto"
          />
        ) : (
          <p className="text-sm text-white mt-0.5 truncate">{meal.description}</p>
        )}

        {/* Details */}
        {meal.details && !isEditing && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{meal.details}</p>
        )}
      </div>

      {/* Azioni */}
      {!readOnly && !isEditing && (
        <button
          onClick={handleStartEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-500 hover:text-white focus:opacity-100"
          aria-label={`Modifica ${MEAL_TYPE_LABELS[meal.mealType]}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {isEditing && (
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 rounded text-compliance-full hover:bg-compliance-full/10 disabled:opacity-50"
            aria-label="Salva modifiche"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 rounded text-slate-500 hover:text-white"
            aria-label="Annulla modifiche"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
