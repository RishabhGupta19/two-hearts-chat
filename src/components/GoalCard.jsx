import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

const tagConfig = {
  growth: { emoji: '💪', label: 'Growth', color: 'bg-primary/10 text-primary' },
  us: { emoji: '❤️', label: 'Us', color: 'bg-destructive/10 text-destructive' },
  personal: { emoji: '🌱', label: 'Personal', color: 'bg-accent text-accent-foreground' }
};

const tagOptions = ['Growth', 'Us', 'Personal'];

export const GoalCard = ({ goal }) => {
  const { toggleGoalComplete, editGoal, deleteGoal, userRole } = useApp();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(goal.text);
  const [editTag, setEditTag] = useState(goal.tag);

  const tag = tagConfig[goal.tag?.toLowerCase()] || { emoji: '🎯', label: goal.tag || 'Goal', color: 'bg-muted text-muted-foreground' };
  const isOwner = goal.setBy === userRole;

  const handleEdit = async (e) => {
    e.stopPropagation();
    if (!editText.trim()) return;
    try {
      await editGoal(goal.id, editText.trim(), editTag);
      setEditing(false);
      toast.success('Goal updated');
    } catch {
      toast.error('Failed to update goal');
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      await deleteGoal(goal.id);
      toast.success('Goal deleted');
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  if (editing) {
    return (
      <div className="rounded-lg border bg-card p-5 shadow-soft space-y-3">
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={2}
          autoFocus
        />
        <div className="flex gap-2">
          {tagOptions.map((t) => (
            <button
              key={t}
              onClick={() => setEditTag(t)}
              className={`rounded-pill px-3 py-1 text-xs font-medium transition-colors ${
                editTag === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
            <X size={14} /> Cancel
          </button>
          <button onClick={handleEdit} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Check size={14} /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border bg-card p-5 shadow-soft cursor-pointer group"
      onClick={() => toggleGoalComplete(goal.id)}>

      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium ${tag.color}`}>
          {tag.emoji} {tag.label}
        </span>
        <div className="flex items-center gap-2">
          {isOwner && (
            <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Edit goal"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete goal"
              >
                <Trash2 size={14} />
              </button>
            </span>
          )}
          <span className="text-xs text-muted-foreground">{goal.date ? format(parseISO(goal.date), 'MMM d, yyyy') : ''}</span>
        </div>
      </div>
      <p className={`font-body text-sm leading-relaxed ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
        {goal.text}
      </p>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-sm border ${
          goal.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
          {goal.completed && '✓'}
        </span>
        <span>{goal.completed ? 'Done' : 'Pending'}</span>
        <span className="ml-auto">Set by {goal.setBy === 'gf' ? '💜 GF' : '💙 BF'}</span>
      </div>
    </motion.div>
  );
};
