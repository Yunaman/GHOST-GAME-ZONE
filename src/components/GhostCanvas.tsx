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
    const ambientLight = new THREE.AmbientLight(0x1e1b4b, 1.8);
    scene.add(ambientLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 3, 12);
    purpleLight.position.set(-2, 2, 2);
    scene.add(purpleLight);

    const fuchsiaLight = new THREE.PointLight(0xd946ef, 2.5, 12);
    fuchsiaLight.position.set(2, -2, 2);
    scene.add(fuchsiaLight);

    // Ghost Body - Smooth procedural geometry
    const ghostGroup = new THREE.Group();

    // Head Sphere
    const headGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const ghostMat = new THREE.MeshPhongMaterial({
      color: 0x3b0764,
      emissive: 0x1e1b4b,
      specular: 0xc084fc,
      shininess: 90,
      transparent: true,
      opacity: 0.35,
      wireframe: false,
    });

    const headMesh = new THREE.Mesh(headGeo, ghostMat);
    ghostGroup.add(headMesh);

    // Eyes Glow
    const eyeGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe9d5ff });

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

    // Floating Fog / Ember Particles
    const particlesCount = 70;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 14;
      positions[i + 1] = (Math.random() - 0.5) * 14;
      positions[i + 2] = (Math.random() - 0.5) * 10;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xc084fc,
      size: 0.09,
      transparent: true,
      opacity: 0.45,
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
      <div ref={containerRef} className="w-full h-full opacity-40 md:opacity-60 pointer-events-none" />

      {/* Atmospheric Radial Dark Gradient */}
      <div className="absolute inset-0 bg-radial from-transparent via-[var(--bg-primary)]/80 to-[var(--bg-primary)] pointer-events-none" />
    </div>
  );
}
