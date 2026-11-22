import { useEffect, useRef } from 'react';

const COLORS = ['#ffd27a', '#ff9a3c', '#fff4d6', '#ff5d73', '#7ed0ff', '#ffe08a', '#ff7a45', '#ffffff'];

export default function Fireworks({ title, subtitle, onDone }) {
  const canvasRef = useRef(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => doneRef.current(), reduce ? 2600 : 6200);
    if (reduce) return () => clearTimeout(timer);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const particles = [];
    const rockets = [];
    let raf = 0;
    let launched = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const boom = (x, y, color) => {
      const count = 90 + Math.floor(Math.random() * 70);
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 1.1 + Math.random() * 4.8;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.006 + Math.random() * 0.01,
          color: Math.random() > 0.25 ? color : COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 1.5 + Math.random() * 2.2,
        });
      }
    };

    const spawn = () => {
      const x = window.innerWidth * (0.08 + Math.random() * 0.84);
      rockets.push({
        x,
        y: window.innerHeight + 10,
        tx: x + (Math.random() - 0.5) * 120,
        ty: window.innerHeight * (0.08 + Math.random() * 0.48),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speed: 8 + Math.random() * 5,
      });
    };

    const launchTimer = setInterval(() => {
      spawn();
      if (Math.random() > 0.25) spawn();
      if (Math.random() > 0.55) spawn();
      launched += 1;
      if (launched > 16) clearInterval(launchTimer);
    }, 220);
    spawn();
    spawn();
    spawn();
    spawn();

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = rockets.length - 1; i >= 0; i -= 1) {
        const rocket = rockets[i];
        rocket.y -= rocket.speed;
        rocket.x += (rocket.tx - rocket.x) * 0.05;
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = rocket.color;
        ctx.beginPath();
        ctx.arc(rocket.x, rocket.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        if (rocket.y <= rocket.ty) {
          boom(rocket.x, rocket.y, rocket.color);
          rockets.splice(i, 1);
        }
      }
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.028;
        particle.vx *= 0.99;
        particle.life -= particle.decay;
        if (particle.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(particle.life, 0);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      clearTimeout(timer);
      clearInterval(launchTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="fireworks-layer" role="dialog" aria-label="Chúc mừng đã bán xe">
      <canvas ref={canvasRef} />
      <div className="fireworks-card">
        <div className="eyebrow">CHÚC MỪNG</div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <button type="button" className="btn btn-primary" onClick={onDone}>Đóng</button>
      </div>
    </div>
  );
}
