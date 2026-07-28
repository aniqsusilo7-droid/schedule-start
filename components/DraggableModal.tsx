import React, { useState, useRef, useEffect } from 'react';

interface DraggableModalProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const DraggableModal: React.FC<DraggableModalProps> = ({
  children,
  className = '',
  style = {}
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });

  const startDrag = (clientX: number, clientY: number, target: HTMLElement) => {
    // Avoid dragging when clicking on inputs, buttons, scrollbars or links inside modal
    if (target.closest('button, input, select, textarea, a, .no-drag, [role="button"]')) return;
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    posStartRef.current = { ...position };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary mouse button
    startDrag(e.clientX, e.clientY, e.target as HTMLElement);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({
        x: posStartRef.current.x + dx,
        y: posStartRef.current.y + dy
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPosition({
        x: posStartRef.current.x + dx,
        y: posStartRef.current.y + dy
      });
    };

    const stopDrag = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopDrag);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', stopDrag);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [isDragging]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        ...style,
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
      className={`pointer-events-auto transition-shadow ${
        isDragging ? 'cursor-grabbing shadow-2xl select-none ring-2 ring-indigo-500/50' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
