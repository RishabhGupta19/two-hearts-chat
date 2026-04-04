import { useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';

const ChatBubbleComponent = ({ message, index, seen, onReply, onReplyPreviewClick, onLongPressDelete, canDelete, highlighted }) => {
  const { user, mode, partnerName, partnerProfilePic } = useApp();
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
  const replyText = message?.reply_to?.text || message?.replyTo?.text || '';
  const replyMessageId = message?.replyTo?.messageId || message?.reply_to?.id || '';
  const isDeleted = Boolean(message?.is_deleted);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 4) * 0.02 }}
      className={`mb-3 flex w-full ${isMine ? 'justify-end pr-1' : 'justify-start pl-1'}`}
      onContextMenu={(e) => {
        if (!onReply || mode !== 'calm' || isAI || isDeleted) return;
        e.preventDefault();
        onReply(message);
      }}
      onDoubleClick={() => {
        if (!onReply || mode !== 'calm' || isAI || isDeleted) return;
        onReply(message);
      }}
      onTouchStart={() => {
        if (mode !== 'calm' || isAI || isDeleted) return;
        if (canDelete && onLongPressDelete) {
          longPressTimerRef.current = setTimeout(() => onLongPressDelete(message), 420);
          return;
        }
        if (!onReply) return;
        longPressTimerRef.current = setTimeout(() => onReply(message), 360);
      }}
      onTouchEnd={() => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      }}
      onTouchCancel={() => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      }}
    >
      {!isMine && (
        <div className="mr-2 flex-shrink-0">
          {mode === 'calm' ? (
            partnerProfilePic ? (
              <img src={partnerProfilePic} alt={partnerName || 'Partner'} className="h-8 w-8 rounded-full object-contain object-center block p-0.5" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">{(partnerName || 'P').charAt(0).toUpperCase()}</span>
              </div>
            )
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted" />
          )}
        </div>
      )}

      <div
        className={`group relative max-w-[72%] rounded-2xl px-3 py-2 text-[12px] font-body break-words transition-all ${highlighted ? 'ring-2 ring-primary/70' : ''} ${
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : isAI
              ? 'bg-card text-card-foreground border border-border rounded-bl-sm shadow-soft'
              : 'bg-secondary text-secondary-foreground rounded-bl-sm'
        }`}
      >
        {replyText && (
          <button
            type="button"
            onClick={() => {
              if (mode !== 'calm') return;
              onReplyPreviewClick?.(replyMessageId);
            }}
            disabled={!replyMessageId || mode !== 'calm'}
            className={`mb-2 w-full text-left rounded-lg border-l-2 px-2 py-1 text-[10px] ${
            isMine ? 'bg-white/15 border-white/50' : 'bg-black/5 border-primary/60'
          } ${replyMessageId && mode === 'calm' ? 'cursor-pointer hover:opacity-90' : 'cursor-default opacity-80'}`}
          >
            <div className="font-semibold opacity-85">{replySender}</div>
            <div className="line-clamp-2 opacity-80">{replyText}</div>
          </button>
        )}

        {senderLabel && (
          <span className="mb-1 block text-xs font-medium text-muted-foreground">{senderLabel}</span>
        )}
        <p className={`leading-relaxed ${isDeleted ? 'italic opacity-80' : ''}`}>{message.text}</p>
        <span className="mt-0.5 flex items-center justify-end gap-1 text-[8px] opacity-60">
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

export const ChatBubble = memo(ChatBubbleComponent);
