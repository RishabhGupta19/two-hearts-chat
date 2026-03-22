import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Loader2 } from 'lucide-react';

const RoleSelection = () => {
  const { setRole, userName } = useApp();
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = async (role) => {
    setSelectedRole(role);
    setLoading(true);
    setError('');
    try {
      await setRole(role);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set role');
      setSelectedRole(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="rounded-lg border bg-card p-8 shadow-soft text-center">
          {error && (
            <p className="text-xs text-destructive mb-4 font-body">{error}</p>
          )}
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
            Who are you in this relationship?
          </h1>
          <p className="text-sm text-muted-foreground mb-8 font-body">Welcome, {userName}!</p>

          <div className="flex gap-4 justify-center">
            {[['gf','I am the GF'], ['bf','I am the BF']].map(([role, emoji, label]) => (
              <motion.button
                key={role}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleRoleSelect(role)}
                disabled={loading}
                className={`flex-1 rounded-pill py-4 px-6 text-sm font-medium font-body border-2 transition-all ${
                  selectedRole === role
                    ? 'border-primary bg-primary/10 text-foreground shadow-warm'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                }`}
              >
                <span className="text-2xl block mb-1">{emoji}</span>
                {label}
                {loading && selectedRole === role && (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mt-2" />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
