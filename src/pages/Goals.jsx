import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { GoalCard } from '@/components/GoalCard';
import { Plus, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const TAGS = ['Growth', 'Us', 'Personal'];

const Goals = () => {
  const { goals, partnerName, userRole, fetchGoals, addGoal } = useApp();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [selectedTag, setSelectedTag] = useState('Growth');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleSubmit = async () => {
    if (!goalText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addGoal(goalText, selectedTag);
      toast.success('Goal added! 🎯');
      setGoalText('');
      setSelectedTag('Growth');
      setShowModal(false);
    } catch {
      toast.error('Failed to add goal');
    } finally {
      setSubmitting(false);
    }
  };

  const myGoals = goals.filter((g) => g.setBy === userRole);
  const partnerGoals = goals.filter((g) => g.setBy !== userRole);

  return (
    <div className="h-[100dvh] bg-background overflow-y-auto flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 mt-[55px] border-b border-border">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer active:opacity-70 -ml-1"
          >
            <ArrowLeft size={22} strokeWidth={1.8} />
          </button>
          <h1 className="font-heading text-lg font-bold text-foreground">Goals</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-xs bg-primary text-primary-foreground font-medium font-body px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Goal
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
            {partnerName || 'Partner'}'s Goals for You
          </h2>
          {partnerGoals.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground font-body">
                No goals from {partnerName || 'partner'} yet 💛
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {partnerGoals.map((goal, i) => (
                <motion.div key={goal.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <GoalCard goal={goal} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Goals You Set</h2>
          {myGoals.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center">
              <span className="text-2xl block mb-2">🎯</span>
              <p className="text-sm text-muted-foreground font-body">No goals yet — tap "Add Goal" to create one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myGoals.map((goal, i) => (
                <motion.div key={goal.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <GoalCard goal={goal} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </main>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-card border border-border rounded-2xl w-full max-w-sm p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-base font-semibold text-foreground">New Goal</h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <textarea
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                placeholder="What goal would you like to set for your partner?"
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                autoFocus
              />

              <div className="flex gap-2 mt-3 mb-4">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-body font-medium transition-colors ${
                      selectedTag === tag
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!goalText.trim() || submitting}
                className="w-full bg-primary text-primary-foreground font-body font-medium text-sm py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding…' : 'Add Goal'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Goals;
