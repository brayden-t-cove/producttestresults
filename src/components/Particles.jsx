import { useEffect, useRef } from 'react';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export default function Particles({
  particleCount = 300,
  particleSpread = 8,
  speed = 0.12,
  particleColors = ['#1c1ccb', '#00b6ff', '#8c13c2'],
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 60,
  sizeRandomness = 0.7,
  cameraDistance = 20,
  disableRotation = false,
  style = {},
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const colors = particleColors.map(hexToRgb);

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
    };
    if (moveParticlesOnHover) canvas.addEventListener('mousemove', onMouseMove);

    // Generate particles in 3D space
    const particles = Array.from({ length: particleCount }, () => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.5) * particleSpread;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const sizeMult = 1 - sizeRandomness * Math.random();
      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        color,
        size: sizeMult,
        // small individual drift
        vx: (Math.random() - 0.5) * 0.002 * speed,
        vy: (Math.random() - 0.5) * 0.002 * speed,
        vz: (Math.random() - 0.5) * 0.002 * speed,
      };
    });

    let rotY = 0;
    let rotX = 0;

    function project(x, y, z, w, h) {
      const fov = cameraDistance;
      const scale = fov / (fov + z);
      return {
        sx: x * scale * (w / 2) + w / 2,
        sy: y * scale * (h / 2) + h / 2,
        scale,
      };
    }

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      if (!w || !h) { animRef.current = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, w, h);

      // Rotation increments
      if (!disableRotation) {
        rotY += speed * 0.003;
        rotX += speed * 0.001;
      }

      // Mouse influence
      const mx = moveParticlesOnHover ? mouseRef.current.x * particleHoverFactor * 0.02 : 0;
      const my = moveParticlesOnHover ? mouseRef.current.y * particleHoverFactor * 0.02 : 0;
      const ry = rotY + mx;
      const rx = rotX + my;

      const cosY = Math.cos(ry), sinY = Math.sin(ry);
      const cosX = Math.cos(rx), sinX = Math.sin(rx);

      // Project all particles
      const projected = particles.map(p => {
        // Apply individual drift
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        // Soft boundary — nudge back toward center
        const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        if (dist > particleSpread * 1.1) {
          p.vx -= p.x * 0.0001;
          p.vy -= p.y * 0.0001;
          p.vz -= p.z * 0.0001;
        }

        // Rotate Y
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        // Rotate X
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const { sx, sy, scale } = project(x1, y2, z2, w, h);
        const pixelSize = Math.max(0.5, particleBaseSize * scale * p.size * 0.012);
        const alpha = alphaParticles ? Math.min(1, scale * 1.5) : 0.75 + scale * 0.25;
        return { sx, sy, pixelSize, scale, alpha, color: p.color, z: z2 };
      });

      // Painter's algorithm — back to front
      projected.sort((a, b) => a.scale - b.scale);

      for (const p of projected) {
        const [r, g, b2] = p.color;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.pixelSize, 0, Math.PI * 2);

        // Glow
        const grd = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, p.pixelSize * 2.5);
        grd.addColorStop(0, `rgba(${r},${g},${b2},${p.alpha})`);
        grd.addColorStop(0.4, `rgba(${r},${g},${b2},${p.alpha * 0.4})`);
        grd.addColorStop(1, `rgba(${r},${g},${b2},0)`);

        ctx.fillStyle = grd;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
      if (moveParticlesOnHover) canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [particleCount, particleSpread, speed, particleColors, moveParticlesOnHover,
      particleHoverFactor, alphaParticles, particleBaseSize, sizeRandomness,
      cameraDistance, disableRotation]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        ...style,
      }}
    />
  );
}
