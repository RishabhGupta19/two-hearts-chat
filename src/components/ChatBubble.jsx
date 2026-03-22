import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';

export const ChatBubble = ({ message, index }) => {
  const { userRole, mode } = useApp();

  // Calm mode: use sender_role to determine alignment
  // Vent mode: use sender field (user vs ai)
  const isMine = mode === 'calm'
    ? message.sender_role === userRole
    : message.sender === 'user';

  const isAI = message.sender === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-[13px] font-body ${
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : isAI
            ? 'bg-card text-card-foreground border border-border rounded-bl-sm shadow-soft'
            : 'bg-secondary text-secondary-foreground rounded-bl-sm'
        }`}
      >
        {isAI && (
          <span className="text-xs font-medium text-muted-foreground block mb-1">AI Companion</span>
        )}
        <p className="leading-relaxed">{message.text}</p>
        <span className="text-[9px] opacity-60 mt-0.5 block">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};
