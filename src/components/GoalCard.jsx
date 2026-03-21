import { motion } from 'framer-motion';

import { useApp } from '@/context/AppContext';

const tagConfig = {
  growth: { emoji: '💪', label: 'Growth', color: 'bg-primary/10 text-primary' },
  us: { emoji: '❤️', label: 'Us', color: 'bg-destructive/10 text-destructive' },
  personal: { emoji: '🌱', label: 'Personal', color: 'bg-accent text-accent-foreground' }
};

export const GoalCard = ({ goal }) => {
  const { toggleGoalComplete } = useApp();
  const tag = tagConfig[goal.tag?.toLowerCase()] || { emoji: '🎯', label: goal.tag || 'Goal', color: 'bg-muted text-muted-foreground' };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border bg-card p-5 shadow-soft cursor-pointer"
      onClick={() => toggleGoalComplete(goal.id)}>
      
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium ${tag.color}`}>
          {tag.emoji} {tag.label}
        </span>
        <span className="text-xs text-muted-foreground">{goal.date}</span>
      </div>
      <p className={`font-body text-sm leading-relaxed ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
        {goal.text}
      </p>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-sm border ${
        goal.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`
        }>
          {goal.completed && '✓'}
        </span>
        <span>{goal.completed ? 'Done' : 'Pending'}</span>
        <span className="ml-auto">Set by {goal.setBy === 'gf' ? '💜 GF' : '💙 BF'}</span>
      </div>
    </motion.div>);

};