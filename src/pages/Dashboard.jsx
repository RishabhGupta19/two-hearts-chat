import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';

const Dashboard = () => {
  const { userName, partnerName, isLinked, logout } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="font-heading text-xl font-bold text-foreground">UsTwo</h1>
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
          ) : state.user?.couple_code && (
            <div className="inline-flex items-center gap-2 mt-1 px-3 py-1.5 rounded-md bg-muted text-sm font-body text-muted-foreground">
              <span>Your couple code: <strong className="text-foreground">{state.user.couple_code}</strong></span>
              <button
                onClick={() => { navigator.clipboard.writeText(state.user.couple_code); }}
                className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Copy
              </button>
            </div>
          )}
        </motion.div>

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
            <p className="text-xs text-muted-foreground font-body">Talk with your AI companion</p>
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