'use client';
import React, { useEffect, useRef } from 'react';

interface TokenCursorProps {
  tokenImages?: string[];
  colors?: string[];
  tokenSize?: number;
  particleLifespan?: number;
  particleSpeed?: number;
  wrapperElement?: HTMLElement;
}

const TokenCursor: React.FC<TokenCursorProps> = ({
  tokenImages = ['/tokens/eth.svg', '/tokens/usdc.svg', '/tokens/usdt.svg'],
  colors = ['#6622CC', '#A755C2', '#B07C9E'],
  tokenSize = 24,
  particleLifespan = 80,
  particleSpeed = 3,
  wrapperElement,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const tokenCanvasesRef = useRef<HTMLCanvasElement[]>([]);

  useEffect(() => {
    // Skip animation if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let canvas = canvasRef.current;
    if (!canvas) return;

    let context = canvas.getContext('2d');
    if (!context) return;

    // Set up canvas
    canvas.style.position = wrapperElement ? 'absolute' : 'fixed';
    canvas.style.top = '0px';
    canvas.style.left = '0px';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';

    const container = wrapperElement || document.body;
    container.appendChild(canvas);
    
    const updateCanvasSize = () => {
      const width = wrapperElement ? wrapperElement.clientWidth : window.innerWidth;
      const height = wrapperElement ? wrapperElement.clientHeight : window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;
    };
    
    updateCanvasSize();

    // Create a particle
    const createParticle = (x: number, y: number, tokenCanvas: HTMLCanvasElement) => {
      return {
        x,
        y,
        age: 0,
        lifespan: particleLifespan + Math.random() * 20,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() < 0.5 ? -1 : 1) * Math.random() * 2,
        velocity: {
          x: (Math.random() < 0.5 ? -1 : 1) * Math.random() * particleSpeed,
          y: (Math.random() < 0.5 ? -1 : 1) * Math.random() * particleSpeed,
        },
        tokenCanvas,
      };
    };

    // Load token images
    const loadImages = async () => {
      try {
        const loadedImages = await Promise.all(
          tokenImages.map((src) => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = src;
            });
          })
        );

        // Create canvas for each token
        loadedImages.forEach((img) => {
          const tokenCanvas = document.createElement('canvas');
          const tokenContext = tokenCanvas.getContext('2d');
          if (!tokenContext) return;

          tokenCanvas.width = tokenSize;
          tokenCanvas.height = tokenSize;
          
          // Draw the token
          tokenContext.drawImage(img, 0, 0, tokenSize, tokenSize);
          
          // Apply color tint (optional)
          const color = colors[Math.floor(Math.random() * colors.length)];
          tokenContext.globalCompositeOperation = 'source-atop';
          tokenContext.globalAlpha = 0.3;
          tokenContext.fillStyle = color;
          tokenContext.fillRect(0, 0, tokenSize, tokenSize);
          tokenContext.globalCompositeOperation = 'source-over';
          tokenContext.globalAlpha = 1;
          
          tokenCanvasesRef.current.push(tokenCanvas);
        });

        // Start animation
        bindEvents();
        animate();
      } catch (error) {
        console.error('Failed to load token images:', error);
      }
    };

    // Add a particle on mouse move
    const onMouseMove = (e: MouseEvent) => {
      if (tokenCanvasesRef.current.length === 0) return;
      
      const x = wrapperElement 
        ? e.clientX - wrapperElement.getBoundingClientRect().left 
        : e.clientX;
      const y = wrapperElement 
        ? e.clientY - wrapperElement.getBoundingClientRect().top 
        : e.clientY;
      
      const randomTokenCanvas = tokenCanvasesRef.current[
        Math.floor(Math.random() * tokenCanvasesRef.current.length)
      ];
      
      particlesRef.current.push(createParticle(x, y, randomTokenCanvas));
    };

    // Handle touch events
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0 && tokenCanvasesRef.current.length > 0) {
        for (let i = 0; i < e.touches.length; i++) {
          const x = wrapperElement 
            ? e.touches[i].clientX - wrapperElement.getBoundingClientRect().left 
            : e.touches[i].clientX;
          const y = wrapperElement 
            ? e.touches[i].clientY - wrapperElement.getBoundingClientRect().top 
            : e.touches[i].clientY;
          
          const randomTokenCanvas = tokenCanvasesRef.current[
            Math.floor(Math.random() * tokenCanvasesRef.current.length)
          ];
          
          particlesRef.current.push(createParticle(x, y, randomTokenCanvas));
        }
      }
    };

    // Bind event listeners
    const bindEvents = () => {
      container.addEventListener('mousemove', onMouseMove);
      container.addEventListener('touchmove', onTouchMove, { passive: true });
      container.addEventListener('touchstart', onTouchMove, { passive: true });
      window.addEventListener('resize', updateCanvasSize);
    };

    // Animation loop
    const animate = () => {
      if (!canvas || !context) return;
      
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        p.age++;
        p.x += p.velocity.x;
        p.y += p.velocity.y;
        p.rotation += p.rotationSpeed;
        
        // Calculate opacity and scale based on age
        const lifeRatio = 1 - p.age / p.lifespan;
        const opacity = lifeRatio;
        const scale = Math.max(lifeRatio * 1.5, 0);
        
        // Draw the token
        context.save();
        context.translate(p.x, p.y);
        context.rotate(p.rotation * Math.PI / 180);
        context.globalAlpha = opacity;
        context.drawImage(
          p.tokenCanvas,
          -tokenSize * scale / 2,
          -tokenSize * scale / 2,
          tokenSize * scale,
          tokenSize * scale
        );
        context.restore();
      }
      
      // Remove dead particles
      particlesRef.current = particlesRef.current.filter(p => p.age < p.lifespan);
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    loadImages();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchstart', onTouchMove);
      window.removeEventListener('resize', updateCanvasSize);
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [tokenImages, colors, tokenSize, particleLifespan, particleSpeed, wrapperElement]);

  return <canvas ref={canvasRef} />;
};

export default TokenCursor;