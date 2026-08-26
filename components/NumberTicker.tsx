import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'framer-motion';

export interface NumberTickerProps {
  value: number;
  pad?: number;
  duration?: number;
  stagger?: number;
  startOnView?: boolean;
  prefix?: string;
  suffix?: string;
  blur?: boolean;
  className?: string;
  digitClassName?: string;
}

const DIGIT_HEIGHT_EM = 1.1;
const DIGITS = Array.from({ length: 10 }, (_, number) => number);
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const joinClasses = (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' ');

export const NumberTicker = memo(function NumberTicker({
  value,
  pad,
  duration = 0.42,
  stagger = 0.025,
  startOnView = true,
  prefix,
  suffix,
  blur = true,
  className,
  digitClassName,
}: NumberTickerProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(containerRef, { once: true, amount: 0.6 });
  const [armed, setArmed] = useState(!startOnView);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (startOnView && inView) setArmed(true);
  }, [inView, startOnView]);

  const text = useMemo(() => {
    const rounded = Math.max(0, Math.round(value));
    return pad ? rounded.toString().padStart(pad, '0') : rounded.toString();
  }, [pad, value]);

  const glyphs = useMemo(() => {
    const characters = text.split('');
    return characters.map((character, index) => ({
      character,
      id: `digit-${characters.length - 1 - index}`,
    }));
  }, [text]);

  useEffect(() => {
    if (!armed || entered) return;
    const timer = window.setTimeout(
      () => setEntered(true),
      (duration + glyphs.length * stagger) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [armed, duration, entered, glyphs.length, stagger]);

  return (
    <span ref={containerRef} className={joinClasses('inline-flex items-center self-center align-middle leading-none tabular-nums', className)}>
      <span className="sr-only">{`${prefix ?? ''}${text}${suffix ?? ''}`}</span>
      <span aria-hidden="true" className="inline-flex items-center">
        {prefix && <span>{prefix}</span>}
        {glyphs.map(({ character, id }, index) => (
          <TickerDigit
            key={id}
            digit={armed ? Number(character) : 0}
            delay={entered ? 0 : index * stagger}
            duration={duration}
            blur={blur}
            className={digitClassName}
          />
        ))}
        {suffix && <span>{suffix}</span>}
      </span>
    </span>
  );
});

interface TickerDigitProps {
  digit: number;
  delay: number;
  duration: number;
  blur: boolean;
  className?: string;
}

const TickerDigit = memo(function TickerDigit({
  digit,
  delay,
  duration,
  blur,
  className,
}: TickerDigitProps) {
  const reduceMotion = useReducedMotion();
  const columnRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduceMotion || !blur || !columnRef.current || !Number.isFinite(digit)) return;

    const node = columnRef.current;
    const controls = animate(
      node,
      { filter: ['blur(5px)', 'blur(0px)'] },
      {
        duration: Math.min(duration * 0.7, 0.26),
        delay,
        ease: EASE_OUT,
      },
    );

    return () => {
      controls.stop();
      node.style.filter = 'blur(0px)';
    };
  }, [blur, delay, digit, duration, reduceMotion]);

  return (
    <span
      className={joinClasses('relative inline-block overflow-hidden', className)}
      style={{ height: `${DIGIT_HEIGHT_EM}em`, width: '1ch' }}
    >
      <motion.span
        ref={columnRef}
        initial={{ y: 0 }}
        animate={{ y: `-${digit * DIGIT_HEIGHT_EM}em` }}
        transition={reduceMotion ? { duration: 0 } : { duration, delay, ease: EASE_OUT }}
        className="absolute inset-x-0 top-0 flex flex-col items-center will-change-[transform,filter]"
      >
        {DIGITS.map(number => (
          <span
            key={number}
            className="flex h-[1.1em] items-center justify-center leading-none"
          >
            {number}
          </span>
        ))}
      </motion.span>
    </span>
  );
});
