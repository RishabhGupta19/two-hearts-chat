import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

const RoleSelection = () => {
  const { setRole, generateCoupleId, linkPartner, coupleId, isLinked, userName } = useApp();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [step, setStep] = useState('role');
  const [partnerCode, setPartnerCode] = useState('');
  const [partnerNameInput, setPartnerNameInput] = useState('');
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
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    setLoading(true);
    setError('');
    try {
      await generateCoupleId();
      setStep('code-generated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterCode = () => {
    setStep('enter-code');
  };

  const handleLinkPartner = async () => {
    if (!partnerCode || partnerCode.length < 5) return;
    setLoading(true);
    setError('');
    try {
      await linkPartner(partnerCode, partnerNameInput || 'Partner');
      setStep('linked');
      setTimeout(() => navigate('/assessment'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to link partner');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithCode = () => {
    navigate('/assessment');
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
          <AnimatePresence mode="wait">
            {step === 'role' && (
              <motion.div key="role" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
                  Who are you in this relationship?
                </h1>
                <p className="text-sm text-muted-foreground mb-8 font-body">Welcome, {userName}!</p>

                <div className="flex gap-4 justify-center mb-8">
                  {[['gf', '💜', 'I am the GF'], ['bf', '💙', 'I am the BF']].map(([role, emoji, label]) => (
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
                    </motion.button>
                  ))}
                </div>

                {selectedRole && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleGenerateCode}
                      disabled={loading}
                      className="w-full rounded-pill bg-primary py-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      I'm starting — generate a code
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleEnterCode}
                      className="w-full rounded-pill bg-muted py-3 text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                      I have a partner code
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 'code-generated' && (
              <motion.div key="generated" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Your Couple Code</h2>
                <p className="text-sm text-muted-foreground mb-6 font-body">Share this with your partner</p>
                <div className="inline-block rounded-pill bg-primary/10 px-8 py-4 mb-6">
                  <span className="font-heading text-2xl font-bold text-primary tracking-wider">{coupleId}</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleContinueWithCode}
                  className="w-full rounded-pill bg-primary py-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90 transition-colors"
                >
                  Continue to Assessment →
                </motion.button>
              </motion.div>
            )}

            {step === 'enter-code' && (
              <motion.div key="enter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Enter Partner's Code</h2>
                <p className="text-sm text-muted-foreground mb-6 font-body">Paste the code your partner shared</p>
                <div className="space-y-3 mb-6">
                  <Input
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                    placeholder="#XXXXXX"
                    className="rounded-[12px] text-center text-lg font-heading"
                  />
                  <Input
                    value={partnerNameInput}
                    onChange={(e) => setPartnerNameInput(e.target.value)}
                    placeholder="Partner's name"
                    className="rounded-[12px]"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLinkPartner}
                  disabled={loading}
                  className="w-full rounded-pill bg-primary py-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Link Accounts
                </motion.button>
              </motion.div>
            )}

            {step === 'linked' && (
              <motion.div key="linked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  className="text-5xl mb-4"
                >
                  🧡
                </motion.div>
                <h2 className="font-heading text-xl font-semibold text-foreground">You're now connected!</h2>
                <p className="text-sm text-muted-foreground mt-2 font-body">Taking you to your assessment...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
