import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Loader2, Copy, Check, X, Heart, Users, UserPlus } from 'lucide-react';

const PartnerLinking = () => {
  const { generateCoupleId, linkPartner, coupleId, user } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState('choose'); // choose | first | partner | linked
  const [partnerCode, setPartnerCode] = useState('');
  const [partnerNameInput, setPartnerNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const displayCode = coupleId || user?.couple_code;

  const handleFirst = async () => {
    if (displayCode) {
      setView('first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await generateCoupleId();
      setView('first');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLinkPartner = async () => {
    if (!partnerCode || partnerCode.length < 5) {
      setError('Please enter a valid code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await linkPartner(partnerCode, partnerNameInput || 'Partner');
      setView('linked');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to link partner');
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
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-destructive mb-4 font-body"
            >
              {error}
            </motion.p>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Choose */}
            {view === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"
                >
                  <Heart className="h-8 w-8 text-primary" />
                </motion.div>

                <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
                  Connect with your partner
                </h1>
                <p className="text-sm text-muted-foreground mb-8 font-body">
                  Link your accounts to start your journey together
                </p>

                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleFirst}
                    disabled={loading}
                    className="w-full rounded-lg border-2 border-border bg-card p-5 text-left hover:border-primary/50 transition-all flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-foreground">
                        I'm the first to register
                      </h3>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                        Generate a code for your partner
                      </p>
                    </div>
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setView('partner'); setError(''); }}
                    className="w-full rounded-lg border-2 border-border bg-card p-5 text-left hover:border-primary/50 transition-all flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-foreground">
                        I have a registered partner
                      </h3>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                        Enter the code your partner shared
                      </p>
                    </div>
                  </motion.button>
                </div>

                <button
                  onClick={() => navigate('/dashboard')}
                  className="mt-6 text-xs text-muted-foreground hover:text-foreground font-body transition-colors"
                >
                  Skip for now →
                </button>
              </motion.div>
            )}

            {/* Step 2a: First to register – show generated code */}
            {view === 'first' && (
              <motion.div
                key="first"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Copy className="h-7 w-7 text-primary" />
                </div>

                <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                  Your Couple Code
                </h2>
                <p className="text-sm text-muted-foreground mb-6 font-body">
                  Share this code with your partner to connect
                </p>

                <div className="inline-block rounded-xl bg-primary/10 px-8 py-4 mb-6">
                  <span className="font-heading text-3xl font-bold text-primary tracking-widest">
                    {displayCode}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setView('choose'); setError(''); }}
                    className="flex-1 rounded-pill bg-muted py-3 text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors font-body"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex-1 rounded-pill bg-primary py-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90 transition-colors font-body inline-flex items-center justify-center gap-2"
                  >
                    {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Code</>}
                  </button>
                </div>

                <button
                  onClick={() => navigate('/dashboard')}
                  className="mt-4 text-xs text-muted-foreground hover:text-foreground font-body transition-colors block mx-auto"
                >
                  Continue to dashboard →
                </button>
              </motion.div>
            )}

            {/* Step 2b: Enter partner code */}
            {view === 'partner' && (
              <motion.div
                key="partner"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <UserPlus className="h-7 w-7 text-primary" />
                </div>

                <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                  Enter Partner's Code
                </h2>
                <p className="text-sm text-muted-foreground mb-6 font-body">
                  Paste the code your partner shared with you
                </p>

                <div className="space-y-3 mb-6">
                  <Input
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                    placeholder="Enter couple code"
                    className="rounded-[12px] text-center text-lg font-heading"
                  />
                  <Input
                    value={partnerNameInput}
                    onChange={(e) => setPartnerNameInput(e.target.value)}
                    placeholder="Partner's name"
                    className="rounded-[12px]"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setView('choose'); setError(''); }}
                    className="flex-1 rounded-pill bg-muted py-3 text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors font-body"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleLinkPartner}
                    disabled={loading}
                    className="flex-1 rounded-pill bg-primary py-3 text-sm font-medium text-primary-foreground shadow-soft hover:bg-primary/90 transition-colors font-body inline-flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Link Accounts
                  </button>
                </div>
              </motion.div>
            )}

            {/* Linked success */}
            {view === 'linked' && (
              <motion.div
                key="linked"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-8"
              >
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  className="text-5xl mb-4"
                >
                  🧡
                </motion.div>
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  You're now connected!
                </h2>
                <p className="text-sm text-muted-foreground mt-2 font-body">
                  Taking you to your dashboard...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default PartnerLinking;
