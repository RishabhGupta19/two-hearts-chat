import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Reply } from 'lucide-react';

export const ChatBubble = ({ message, index, seen, onReply }) => {
  const { user, mode, partnerName } = useApp();
  const longPressTimerRef = useRef(null);

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

  const replySender = message?.reply_to?.sender_name || 'Message';
  const replyText = message?.reply_to?.text || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 4) * 0.02 }}
      className={`mb-3 flex w-full ${isMine ? 'justify-end pr-1' : 'justify-start pl-1'}`}
      onContextMenu={(e) => {
        if (!onReply || mode !== 'calm' || isAI) return;
        e.preventDefault();
        onReply(message);
      }}
      onDoubleClick={() => {
        if (!onReply || mode !== 'calm' || isAI) return;
        onReply(message);
      }}
      onTouchStart={() => {
        if (!onReply || mode !== 'calm' || isAI) return;
        longPressTimerRef.current = setTimeout(() => onReply(message), 360);
      }}
      onTouchEnd={() => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      }}
      onTouchCancel={() => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      }}
    >
      <div
        className={`group relative max-w-[72%] rounded-2xl px-3 py-2 text-[13px] font-body break-words ${
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : isAI
              ? 'bg-card text-card-foreground border border-border rounded-bl-sm shadow-soft'
              : 'bg-secondary text-secondary-foreground rounded-bl-sm'
        }`}
      >
        {onReply && mode === 'calm' && !isAI && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReply(message);
            }}
            className="absolute -left-8 top-1/2 -translate-y-1/2 rounded-full bg-card border border-border p-1 text-muted-foreground opacity-70 transition-opacity md:opacity-0 md:group-hover:opacity-100"
            aria-label="Reply to message"
            title="Reply"
          >
            <Reply size={12} />
          </button>
        )}

        {replyText && (
          <div className={`mb-2 rounded-lg border-l-2 px-2 py-1 text-[11px] ${
            isMine ? 'bg-white/15 border-white/50' : 'bg-black/5 border-primary/60'
          }`}>
            <div className="font-semibold opacity-85">{replySender}</div>
            <div className="line-clamp-2 opacity-80">{replyText}</div>
          </div>
        )}

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
