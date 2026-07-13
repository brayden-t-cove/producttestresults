import { useEffect, useRef } from 'react';

const IMG_URL = 'https://lh3.googleusercontent.com/d/1gp3c55_xy2LLlmeSg0A8owuEKlz_wWVG';
const SIZE = 120;
const REPEL_RADIUS = 150;
const REPEL_FORCE = 0.7;
const DAMPING = 0.9992;
const OFFSCREEN_PAD = SIZE + 40;

function randomEdgeSpawn() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0: return { x: Math.random() * w, y: -OFFSCREEN_PAD,     vx: (Math.random() - 0.5) * 1.2, vy:  1.4 + Math.random() * 0.8 };
    case 1: return { x: w + OFFSCREEN_PAD,  y: Math.random() * h,  vx: -(1.4 + Math.random() * 0.8), vy: (Math.random() - 0.5) * 1.2 };
    case 2: return { x: Math.random() * w, y: h + OFFSCREEN_PAD,   vx: (Math.random() - 0.5) * 1.2, vy: -(1.4 + Math.random() * 0.8) };
    default: return { x: -OFFSCREEN_PAD,   y: Math.random() * h,   vx:  1.4 + Math.random() * 0.8,  vy: (Math.random() - 0.5) * 1.2 };
  }
}

export default function AstronautPhysics() {
  const imgRef = useRef(null);
  const stateRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef(null);

  useEffect(() => {
    const spawnTimer = setTimeout(() => {
      const s = randomEdgeSpawn();
      stateRef.current = { ...s, angle: Math.random() * 360, spin: (Math.random() - 0.5) * 0.4 };
    }, 2500);

    const onMouseMove = e => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMouseMove);

    function tick() {
      const s = stateRef.current;
      const el = imgRef.current;
      if (s && el) {
        const cx = s.x + SIZE / 2;
        const cy = s.y + SIZE / 2;
        const dx = cx - mouseRef.current.x;
        const dy = cy - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS && dist > 0) {
          const strength = REPEL_FORCE * (1 - dist / REPEL_RADIUS);
          s.vx += (dx / dist) * strength;
          s.vy += (dy / dist) * strength;
          s.spin += (Math.random() - 0.5) * 0.2;
        }

        s.vx *= DAMPING;
        s.vy *= DAMPING;
        s.spin *= 0.99;
        s.x += s.vx;
        s.y += s.vy;
        s.angle += s.spin;

        // Direct DOM update — no React re-render overhead
        el.style.left = s.x + 'px';
        el.style.top  = s.y + 'px';
        el.style.transform = `rotate(${s.angle}deg)`;

        const w = window.innerWidth;
        const h = window.innerHeight;
        if (s.x > w + OFFSCREEN_PAD || s.x < -OFFSCREEN_PAD * 2 ||
            s.y > h + OFFSCREEN_PAD || s.y < -OFFSCREEN_PAD * 2) {
          const next = randomEdgeSpawn();
          s.x = next.x; s.y = next.y;
          s.vx = next.vx; s.vy = next.vy;
          s.angle = Math.random() * 360;
          s.spin = (Math.random() - 0.5) * 0.4;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      clearTimeout(spawnTimer);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <img
      ref={imgRef}
      src={IMG_URL}
      alt=""
      aria-hidden="true"
      style={{
        position: 'fixed',
        width: SIZE,
        height: SIZE,
        objectFit: 'contain',
        left: -OFFSCREEN_PAD,
        top: -OFFSCREEN_PAD,
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.45,
        filter: 'drop-shadow(0 0 6px rgba(56,168,245,0.25))',
        willChange: 'transform, left, top',
      }}
    />
  );
}
