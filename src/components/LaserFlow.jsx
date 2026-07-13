import { useEffect, useRef } from 'react';

export default function LaserFlow({
  color = '#38a8f5',
  wispDensity = 1,
  flowSpeed = 0.35,
  verticalSizing = 2,
  horizontalSizing = 0.5,
  fogIntensity = 0.45,
  fogScale = 0.3,
  wispSpeed = 15,
  wispIntensity = 5,
  flowStrength = 0.25,
  decay = 1.1,
  horizontalBeamOffset = 0,
  verticalBeamOffset = -0.5,
  style = {},
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Parse hex color to rgb
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Wisps
    const wispCount = Math.floor(18 * wispDensity);
    const wisps = Array.from({ length: wispCount }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0004 * wispSpeed,
      vy: (Math.random() - 0.5) * 0.0004 * wispSpeed,
      size: (0.04 + Math.random() * 0.08) * (0.5 + wispIntensity * 0.1),
      alpha: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    }));

    // Beams
    const beamCount = Math.floor(4 + wispDensity * 3);
    const beams = Array.from({ length: beamCount }, (_, i) => ({
      progress: i / beamCount,
      speed: (0.0003 + Math.random() * 0.0004) * flowSpeed,
      width: (0.002 + Math.random() * 0.003) * horizontalSizing,
      length: (0.3 + Math.random() * 0.5) * verticalSizing * 0.3,
      alpha: 0.15 + Math.random() * 0.25 * flowStrength * 4,
      angle: (Math.random() - 0.5) * 0.6,
    }));

    let t = 0;

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      if (!w || !h) { animRef.current = requestAnimationFrame(draw); return; }

      // Fade trail
      ctx.fillStyle = `rgba(8, 14, 26, ${0.12 / decay})`;
      ctx.fillRect(0, 0, w, h);

      const cx = w * (0.5 + horizontalBeamOffset * 0.5);
      const cy = h * (0.5 + verticalBeamOffset * 0.5);

      // Draw fog layer
      if (fogIntensity > 0) {
        const fogR = Math.max(w, h) * (0.4 + fogScale * 0.8);
        const fog = ctx.createRadialGradient(cx, cy, 0, cx, cy, fogR);
        fog.addColorStop(0, `rgba(${r},${g},${b},${fogIntensity * 0.12})`);
        fog.addColorStop(0.4, `rgba(${r},${g},${b},${fogIntensity * 0.05})`);
        fog.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, w, h);
      }

      // Draw beams
      for (const beam of beams) {
        beam.progress = (beam.progress + beam.speed) % 1;
        const bx = cx + Math.cos(beam.angle) * (beam.progress - 0.5) * w * 2.5;
        const by = cy + Math.sin(beam.angle) * (beam.progress - 0.5) * h * 2;
        const bw = beam.width * w;
        const bl = beam.length * h;

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(beam.angle + Math.PI / 2);

        const grad = ctx.createLinearGradient(0, -bl / 2, 0, bl / 2);
        grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
        grad.addColorStop(0.3, `rgba(${r},${g},${b},${beam.alpha})`);
        grad.addColorStop(0.5, `rgba(255,255,255,${beam.alpha * 0.6})`);
        grad.addColorStop(0.7, `rgba(${r},${g},${b},${beam.alpha})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.fillStyle = grad;
        ctx.shadowColor = `rgba(${r},${g},${b},0.8)`;
        ctx.shadowBlur = bw * 8;
        ctx.fillRect(-bw / 2, -bl / 2, bw, bl);
        ctx.restore();
      }

      // Draw wisps
      t += 0.016;
      for (const wisp of wisps) {
        wisp.x += wisp.vx + Math.sin(t * 0.3 + wisp.phase) * 0.00015 * flowSpeed * 3;
        wisp.y += wisp.vy + Math.cos(t * 0.2 + wisp.phase) * 0.00012 * flowSpeed * 3;
        if (wisp.x < -0.1) wisp.x = 1.1;
        if (wisp.x > 1.1) wisp.x = -0.1;
        if (wisp.y < -0.1) wisp.y = 1.1;
        if (wisp.y > 1.1) wisp.y = -0.1;

        const wx = wisp.x * w;
        const wy = wisp.y * h;
        const wr = wisp.size * Math.min(w, h);
        const pulse = 1 + 0.15 * Math.sin(t * 2 + wisp.phase);

        const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr * pulse);
        wg.addColorStop(0, `rgba(${r},${g},${b},${wisp.alpha * 0.5})`);
        wg.addColorStop(0.4, `rgba(${r},${g},${b},${wisp.alpha * 0.15})`);
        wg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.arc(wx, wy, wr * pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [color, wispDensity, flowSpeed, verticalSizing, horizontalSizing,
      fogIntensity, fogScale, wispSpeed, wispIntensity, flowStrength,
      decay, horizontalBeamOffset, verticalBeamOffset]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
