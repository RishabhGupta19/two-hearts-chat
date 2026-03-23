import { useState } from 'react';
import PullToRefresh from '@/components/PullToRefresh';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Copy, Check, X, Heart, Users, UserPlus, Loader2, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';

const Dashboard = () => {
  const state = useApp();
  const { userName, partnerName, isLinked, logout, generateCoupleId, linkPartner } = state;
  const navigate = useNavigate();
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Partner linking modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkView, setLinkView] = useState('choose');
  const [partnerCode, setPartnerCode] = useState('');
  const [partnerNameInput, setPartnerNameInput] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const displayCode = state.coupleId || state.user?.couple_code;

  const handleCopy = () => {
    navigator.clipboard.writeText(state.user.couple_code);
    setCopied(true);
    setTimeout(() => setShowCodeModal(false), 800);
  };

  const openLinkModal = () => {
    setShowLinkModal(true);
    setLinkView('choose');
    setPartnerCode('');
    setPartnerNameInput('');
    setLinkError('');
    setLinkCopied(false);
  };

  const handleFirst = async () => {
    if (displayCode) {
      setLinkView('first');
      return;
    }
    setLinkLoading(true);
    setLinkError('');
    try {
      await generateCoupleId();
      setLinkView('first');
    } catch (err) {
      setLinkError(err.response?.data?.error || 'Failed to generate code');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleLinkCopy = () => {
    navigator.clipboard.writeText(displayCode);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  const handleLinkPartner = async () => {
    if (!partnerCode || partnerCode.length < 5) {
      setLinkError('Please enter a valid code');
      return;
    }
    setLinkLoading(true);
    setLinkError('');
    try {
      await linkPartner(partnerCode, partnerNameInput || 'Partner');
      setLinkView('linked');
      setTimeout(() => setShowLinkModal(false), 2000);
    } catch (err) {
      setLinkError(err.response?.data?.error || 'Failed to link partner');
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="font-heading text-xl font-bold text-foreground">Solace</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-body text-foreground hidden sm:block">{userName}</span>
            <div className="h-2 w-2 rounded-full bg-primary" title="Online" />
          </div>
          <button onClick={logout} className="text-xs text-muted-foreground hover:text-foreground font-body">
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Connection status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12">
          
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-2">
            Welcome back, {userName}
          </h2>
          {isLinked ? (
            <p className="text-sm text-muted-foreground font-body">
              Connected with {partnerName} 🧡
            </p>
          ) : (
            <div className="flex items-center justify-center gap-2 mt-2">
              
              <button
                onClick={openLinkModal}
                className="text-xs px-3 py-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/80 transition-colors font-body inline-flex items-center gap-1"
              >
                <Link className="h-3 w-3" /> Link Partner
              </button>
            </div>
          )}
        </motion.div>

      {/* Couple Code Modal */}
      <AnimatePresence>
        {showCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowCodeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-6 shadow-lg w-72 text-center relative"
            >
              <button onClick={() => setShowCodeModal(false)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm text-muted-foreground font-body mb-3">Share this code with your partner</p>
              <p className="text-2xl font-heading font-bold text-foreground tracking-widest mb-4">{state.user.couple_code}</p>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-body hover:bg-primary/90 transition-colors"
              >
                {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy Code</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partner Linking Modal */}
      <AnimatePresence>
        {showLinkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowLinkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl p-5 shadow-lg w-72 relative"
            >
              <button onClick={() => setShowLinkModal(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>

              {linkError && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive mb-3 font-body text-center"
                >
                  {linkError}
                </motion.p>
              )}

              <AnimatePresence mode="wait">
                {linkView === 'choose' && (
                  <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Heart className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-heading text-base font-semibold text-foreground mb-0.5">Connect with your partner</h3>
                    <p className="text-xs text-muted-foreground mb-4 font-body">Link your accounts together</p>

                    <div className="space-y-2">
                      <button
                        onClick={handleFirst}
                        disabled={linkLoading}
                        className="w-full rounded-lg border border-border bg-card p-3 text-left hover:border-primary/50 transition-all flex items-center gap-2.5 group"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-heading text-xs font-semibold text-foreground">I'm the first to register</p>
                          <p className="text-[11px] text-muted-foreground font-body">Generate a code for your partner</p>
                        </div>
                        {linkLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-auto" />}
                      </button>

                      <button
                        onClick={() => { setLinkView('partner'); setLinkError(''); }}
                        className="w-full rounded-lg border border-border bg-card p-3 text-left hover:border-primary/50 transition-all flex items-center gap-2.5 group"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <UserPlus className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-heading text-xs font-semibold text-foreground">I have a registered partner</p>
                          <p className="text-[11px] text-muted-foreground font-body">Enter your partner's code</p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}

                {linkView === 'first' && (
                  <motion.div key="first" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Copy className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-heading text-base font-semibold text-foreground mb-0.5">Your Couple Code</h3>
                    <p className="text-xs text-muted-foreground mb-3 font-body">Share this code with your partner</p>

                    <div className="inline-block rounded-xl bg-primary/10 px-5 py-2.5 mb-3">
                      <span className="font-heading text-xl font-bold text-primary tracking-widest">{displayCode}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setLinkView('choose'); setLinkError(''); }}
                        className="flex-1 rounded-md bg-muted py-2 text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors font-body"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleLinkCopy}
                        className="flex-1 rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors font-body inline-flex items-center justify-center gap-1.5"
                      >
                        {linkCopied ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy Code</>}
                      </button>
                    </div>
                  </motion.div>
                )}

                {linkView === 'partner' && (
                  <motion.div key="partner" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <UserPlus className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-heading text-base font-semibold text-foreground mb-0.5">Enter Partner's Code</h3>
                    <p className="text-xs text-muted-foreground mb-3 font-body">Paste the code your partner shared</p>

                    <div className="space-y-2 mb-3">
                      <Input
                        value={partnerCode}
                        onChange={(e) => setPartnerCode(e.target.value)}
                        placeholder="Enter couple code"
                        className="text-center text-base font-heading h-9"
                      />
                      <Input
                        value={partnerNameInput}
                        onChange={(e) => setPartnerNameInput(e.target.value)}
                        placeholder="Partner's name"
                        className="h-9"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setLinkView('choose'); setLinkError(''); }}
                        className="flex-1 rounded-md bg-muted py-2 text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors font-body"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleLinkPartner}
                        disabled={linkLoading}
                        className="flex-1 rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors font-body inline-flex items-center justify-center gap-1.5"
                      >
                        {linkLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        Link Accounts
                      </button>
                    </div>
                  </motion.div>
                )}

                {linkView === 'linked' && (
                  <motion.div key="linked" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6 }} className="text-4xl mb-3">🧡</motion.div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">You're now connected!</h3>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* CTA Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/chat')}
            className="rounded-lg border bg-card p-8 shadow-soft text-center hover:shadow-warm transition-shadow">
            
            <span className="text-4xl block mb-3">💬</span>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Start Chatting</h3>
           
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/goals')}
            className="rounded-lg border bg-card p-8 shadow-soft text-center hover:shadow-warm transition-shadow">
            
            <span className="text-4xl block mb-3">🎯</span>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">View Goals</h3>
            <p className="text-xs text-muted-foreground font-body">Track your relationship goals</p>
          </motion.button>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground font-body mt-12">
          
          Your conversations are private and safe. 🔒
        </motion.p>
      </main>
    </div>);

};

export default Dashboard;
