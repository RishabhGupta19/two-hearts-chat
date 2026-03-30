import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/context/AppContext';
import { Loader2, Sparkles } from 'lucide-react';
import api from '@/api';

const NicknameSetup = () => {
  const { userName, setNickname } = useApp();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();
  const nick = value.trim();
  if (!nick) return;
  setSaving(true);
  setError('');
  try {
    await api.put('/auth/profile', { nickname: nick });
    setNickname(nick);
    localStorage.setItem('onboarding_complete', 'true'); // ← add this
    navigate('/partner-linking');
  } catch (err) {
    setError('Could not save — please try again.');
  } finally {
    setSaving(false);
  }
};

const handleSkip = async () => {
  const fallback = userName || 'Friend';
  setSaving(true);
  try {
    await api.put('/auth/profile', { nickname: fallback });
    setNickname(fallback);
    localStorage.setItem('onboarding_complete', 'true'); // ← add this
    navigate('/partner-linking');
  } catch {
    setNickname(fallback);
    localStorage.setItem('onboarding_complete', 'true'); // ← add this
    navigate('/partner-linking');
  } finally {
    setSaving(false);
  }
};


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm text-center space-y-6"
      >
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="font-heading text-2xl font-bold text-foreground">
            One more thing…
          </h1>
        </div>

        <p className="text-muted-foreground font-body text-sm leading-relaxed">
          What should <span className="font-semibold text-primary">Luna</span> call you?
          This can be your name, a nickname, or whatever feels right.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={userName || 'e.g. Sunshine, Babe, Alex'}
            className="text-center text-lg h-12 rounded-xl"
            maxLength={30}
            autoFocus
          />

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={!value.trim() || saving}
            className="w-full rounded-xl h-11"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</>
            ) : (
              'Continue'
            )}
          </Button>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-body"
          >
            Skip — just use my name
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default NicknameSetup;
