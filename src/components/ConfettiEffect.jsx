import { useEffect, useState } from 'react';

const COLORS = ['#C8956C', '#E8C5A0', '#EDE0D4', '#D4A574', '#B8845C'];

export const ConfettiEffect = () => {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    const newPieces = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 1.5,
      size: 6 + Math.random() * 8
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {pieces.map((p) =>
      <div
        key={p.id}
        className="confetti-piece"
        style={{
          left: `${p.left}%`,
          backgroundColor: p.color,
          width: p.size,
          height: p.size,
          animationDelay: `${p.delay}s`,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px'
        }} />

      )}
    </div>);

};