import { motion, useMotionValue, useAnimation } from 'framer-motion';
import { useApp } from '@/context/AppContext';

/** Threshold (px) the user must drag before reply triggers */
const SWIPE_THRESHOLD = 60;

export const ChatBubble = ({ message, index, seen, onReply }) => {
  const { user, mode, partnerName } = useApp();
  const controls = useAnimation();
  const dragX = useMotionValue(0);

  const isAI = message.sender === 'ai';
  const isCalm = mode === 'calm';

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

  const canReply = !!onReply && mode === 'calm' && !isAI;

  // For sent messages: drag left (negative x) → reply
  // For received messages: drag right (positive x) → reply
  const dragConstraints = isMine
    ? { left: -SWIPE_THRESHOLD * 1.5, right: 0 }
    : { left: 0, right: SWIPE_THRESHOLD * 1.5 };



  const handleDragEnd = async (_e, info) => {
    const offset = info.offset.x;
    const triggered = isMine ? offset < -SWIPE_THRESHOLD : offset > SWIPE_THRESHOLD;

    // Snap back regardless
    await controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });

    if (triggered) {
      onReply?.(message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 4) * 0.02 }}
      className={`mb-3 flex w-full ${isMine ? 'justify-end pr-1' : 'justify-start pl-1'}`}
    >

      {/* Swipeable bubble */}
      <motion.div
        drag={canReply ? 'x' : false}
        dragConstraints={dragConstraints}
        dragElastic={0.25}
        style={{ x: dragX }}
        animate={controls}
        onDragEnd={canReply ? handleDragEnd : undefined}
        className={`max-w-[72%] rounded-2xl px-3 py-2 text-[13px] font-body break-words cursor-grab active:cursor-grabbing touch-pan-y ${
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : isAI
              ? 'bg-card text-card-foreground border border-border rounded-bl-sm shadow-soft'
              : 'bg-secondary text-secondary-foreground rounded-bl-sm'
        }`}
      >
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
      </motion.div>
    </motion.div>
  );
};
