import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { friendlyError } from '@/utils/errorMessages';

const Login = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isSignup && !name)) return;
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/role-selection');
    } catch (err) {
      setError(friendlyError(err));
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
        className="w-full max-w-sm"
      >
        <div className="rounded-lg border bg-card p-8 shadow-soft">
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">UsTwo</h1>
            <p className="text-sm text-muted-foreground font-body">
              A space just for the two of you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-1"
              >
                <label className="text-xs font-medium text-foreground font-body">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-[12px]"
                />
              </motion.div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground font-body">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@example.com"
                className="rounded-[12px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground font-body">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-[12px]"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive text-center font-body">{error}</p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-pill bg-primary py-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90 transition-colors mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignup ? 'Create Account' : 'Sign In'}
            </motion.button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6 font-body">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignup(!isSignup); setError(''); }}
              className="text-primary font-medium hover:underline"
            >
              {isSignup ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
