import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';

const normalizeRole = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const ChatBubble = ({ message, index }) => {
  const { user } = useApp();

  const hasExplicitOwnership = typeof message.isMine === 'boolean';
  const isMine = hasExplicitOwnership
    ? message.isMine
    : user?.id && message.sender_id
      ? String(message.sender_id) === String(user.id)
      : message.sender === 'user';
  const isAI = message.sender === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`mb-3 flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}
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
          <span className="mb-1 block text-xs font-medium text-muted-foreground">AI Companion</span>
        )}
        <p className="leading-relaxed">{message.text}</p>
        <span className="mt-0.5 block text-[9px] opacity-60">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  );
};
