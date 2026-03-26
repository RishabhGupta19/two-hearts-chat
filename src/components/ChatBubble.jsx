import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';

export const ChatBubble = ({ message, index, seen }) => {
  const { user, mode, partnerName } = useApp();

  const isAI = message.sender === 'ai';
  const isCalm = mode === 'calm';  // ← add this

  const isMine = isAI
    ? false
    : typeof message.isMine === 'boolean'
      ? message.isMine
      : user?.id && message.sender_id
        ? String(message.sender_id) === String(user.id)
        : message.sender === 'user';

  const senderLabel = isAI
    ? 'Luna'
    : !isMine && mode === 'calm'
      ? (partnerName || 'Partner')
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`mb-3 flex w-full ${isMine ? 'justify-end pr-1' : 'justify-start pl-1'}`}
    >
      <div
        className={`max-w-[72%] rounded-2xl px-3 py-2 text-[13px] font-body break-words ${
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : isAI
              ? 'bg-card text-card-foreground border border-border rounded-bl-sm shadow-soft'
              : 'bg-secondary text-secondary-foreground rounded-bl-sm'
        }`}
      >
        {senderLabel && (
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{senderLabel}</span>
        )}
        <p className="leading-relaxed">{message.text}</p>
        <span className="mt-0.5 flex items-center justify-end gap-1 text-[9px] opacity-60">
          {new Date(message.timestamp + (message.timestamp.endsWith('Z') || message.timestamp.includes('+') ? '' : 'Z')).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })}
          
          {isMine && isCalm && (
            <span className={`text-[11px] font-bold transition-colors duration-300 ${
              seen ? 'text-sky-300' : 'text-white/50'
            }`}>
              {seen ? '✓✓' : '✓'}
            </span>
          )}
        </span>
      </div>
    </motion.div>
  );
};
