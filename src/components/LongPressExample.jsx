import React, { useState } from 'react';
import useLongPress from '@/hooks/useLongPress';

export default function LongPressExample({ message, onAction }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleLongPress = (e) => {
    // position menu near the press point
    const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    setMenuPos({ x, y });
    setMenuOpen(true);
  };

  const handlers = useLongPress(handleLongPress, {
    delay: 500,
    threshold: 8,
    vibration: 30,
  });

  return (
    <div style={{ position: 'relative' }}>
      <div
        {...handlers}
        className="group relative max-w-[72%] rounded-2xl px-3 py-2 text-[12px] font-body break-words bg-secondary text-secondary-foreground"
      >
        <p className="leading-relaxed">{message.text}</p>
      </div>

      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            left: menuPos.x,
            top: menuPos.y,
            transform: 'translate(-50%, -110%)',
            zIndex: 9999,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          }}
        >
          <button onClick={() => { setMenuOpen(false); onAction?.('reply', message); }}>Reply</button>
          <button onClick={() => { setMenuOpen(false); onAction?.('forward', message); }}>Forward</button>
          <button onClick={() => { setMenuOpen(false); onAction?.('delete', message); }}>Delete</button>
        </div>
      )}
    </div>
  );
}
