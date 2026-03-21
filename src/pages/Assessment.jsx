import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/input';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assessment-chat`;

const Assessment = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const { completeAssessment, userName } = useApp();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!started) {
      setStarted(true);
      streamFromAI([{ role: 'user', content: `Hi, my name is ${userName}. I'm ready for the assessment.` }]);
    }
  }, []);

  const streamFromAI = async (allMessages) => {
    setIsLoading(true);
    let assistantText = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error('Failed to connect to AI');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
                }
                return [...prev, { role: 'assistant', content: assistantText }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Check if assessment is complete
      const match = assistantText.match(/<assessment_complete>([\s\S]*?)<\/assessment_complete>/);
      if (match) {
        try {
          const answers = JSON.parse(match[1]);
          const cleanText = assistantText.replace(/<assessment_complete>[\s\S]*?<\/assessment_complete>/, '').trim();
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: cleanText };
            return updated;
          });
          setTimeout(() => {
            completeAssessment(answers);
            navigate('/dashboard');
          }, 3000);
        } catch (e) {
          console.error('Failed to parse assessment:', e);
        }
      }
    } catch (e) {
      console.error('Stream error:', e);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMsg = { role: 'user', content: input };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    streamFromAI(allMessages);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm text-center">
        <h1 className="font-heading text-lg font-semibold text-foreground">Getting to Know You</h1>
        <p className="text-[10px] text-muted-foreground font-body">This stays private and helps your AI companion respond thoughtfully.</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-body leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-card text-card-foreground border border-border rounded-bl-sm shadow-soft'
              }`}
            >
              {msg.role === 'assistant' && (
                <span className="text-xs font-medium text-muted-foreground block mb-1">AI Companion</span>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </motion.div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-soft">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your answer..."
            className="rounded-[12px] text-sm flex-1"
            disabled={isLoading}
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSend}
            disabled={isLoading}
            className="rounded-pill bg-primary px-5 text-sm text-primary-foreground font-medium shadow-soft hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Send
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Assessment;
