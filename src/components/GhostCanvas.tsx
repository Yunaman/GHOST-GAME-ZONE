'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function GhostCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.5);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x10b981, 3, 10);
    cyanLight.position.set(-2, 2, 2);
    scene.add(cyanLight);

    const blueLight = new THREE.PointLight(0x3b82f6, 2, 10);
    blueLight.position.set(2, -2, 2);
    scene.add(blueLight);

    // Ghost Body - Smooth procedural geometry
    const ghostGroup = new THREE.Group();

    // Head Sphere
    const headGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const ghostMat = new THREE.MeshPhongMaterial({
      color: 0x064e3b,
      emissive: 0x022c22,
      specular: 0x34d399,
      shininess: 100,
      transparent: true,
      opacity: 0.35,
      wireframe: false,
    });

    const headMesh = new THREE.Mesh(headGeo, ghostMat);
    ghostGroup.add(headMesh);

    // Eyes Glow
    const eyeGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.4, 0.2, 1.05);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.4, 0.2, 1.05);

    ghostGroup.add(leftEye);
    ghostGroup.add(rightEye);

    // Ghost Cloak / Flowing Base
    const cloakGeo = new THREE.ConeGeometry(1.5, 2.5, 32, 16, true);
    const cloakMesh = new THREE.Mesh(cloakGeo, ghostMat);
    cloakMesh.rotation.x = Math.PI;
    cloakMesh.position.y = -0.8;
    ghostGroup.add(cloakMesh);

    scene.add(ghostGroup);

    // Floating Fog Particles
    const particlesCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 12;
      positions[i + 1] = (Math.random() - 0.5) * 12;
      positions[i + 2] = (Math.random() - 0.5) * 10;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x10b981,
      size: 0.08,
      transparent: true,
      opacity: 0.4,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Floating bobbing motion
      ghostGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.25;
      ghostGroup.rotation.y = Math.sin(elapsedTime * 0.5) * 0.2;

      // Particles slow drift
      particles.rotation.y = elapsedTime * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full opacity-40 md:opacity-60" />

      {/* Atmospheric Radial Dark Gradient */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#0e1015]/80 to-[#0e1015]" />
    </div>
  );
}
