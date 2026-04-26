import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
}

export default function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const colors = ['#d9ff42', '#ffffff', '#a1a1aa', '#3f3f46'];
    const particles: Particle[] = [];

    // Create initial explosion
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: width / 2,
        y: height / 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 20 - 5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }

    // Also some from corners
    const addFromCorners = () => {
      for (let i = 0; i < 50; i++) {
        // Left
        particles.push({
          x: 0,
          y: height,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          vx: Math.random() * 15,
          vy: Math.random() * -20 - 10,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2
        });
        // Right
        particles.push({
          x: width,
          y: height,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          vx: Math.random() * -15,
          vy: Math.random() * -20 - 10,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2
        });
      }
    };

    addFromCorners();

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravity
        p.vx *= 0.98; // friction
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        if (p.y > height + 20) {
          particles.splice(i, 1);
        }
      }

      if (particles.length > 0) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[40]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
