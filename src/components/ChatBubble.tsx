import { motion } from 'framer-motion';
import { ChatMessage } from '@/context/AppContext';

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
}

export const ChatBubble = ({ message, index }: ChatBubbleProps) => {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-body ${
          isUser
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
        <span className="text-[10px] opacity-60 mt-1 block">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};
