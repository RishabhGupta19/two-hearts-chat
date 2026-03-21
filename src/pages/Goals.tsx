import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { GoalCard } from '@/components/GoalCard';

const Goals = () => {
  const { goals, partnerName, userRole, userName } = useApp();
  const navigate = useNavigate();

  const myGoals = goals.filter(g => g.setBy === userRole);
  const partnerGoals = goals.filter(g => g.setBy !== userRole);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground text-sm">
            ←
          </button>
          <h1 className="font-heading text-lg font-bold text-foreground">Goals</h1>
        </div>
        <button
          onClick={() => navigate('/chat')}
          className="text-xs text-primary font-medium font-body hover:underline"
        >
          + Add from Chat
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Partner's goals for you */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
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
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <GoalCard goal={goal} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Goals you set */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
            Goals You Set
          </h2>
          {myGoals.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center">
              <span className="text-2xl block mb-2">💬</span>
              <p className="text-sm text-muted-foreground font-body">
                No goals yet — add one from the chat!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myGoals.map((goal, i) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <GoalCard goal={goal} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
};

export default Goals;
