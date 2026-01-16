import { useEffect, useRef, useState, useCallback } from 'react';

export default function WiggleCanvas({
    originalImage,
    depthMap,
    intensity = 20,
    onCanvasReady
}) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [isAnimating, setIsAnimating] = useState(true);

    // Store image data
    const originalImageData = useRef(null);
    const depthImageData = useRef(null);
    const imagesLoaded = useRef({ original: false, depth: false });

    // Load images and extract pixel data
    useEffect(() => {
        if (!originalImage || !depthMap) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Load original image
        const origImg = new Image();
        origImg.onload = () => {
            canvas.width = origImg.width;
            canvas.height = origImg.height;

            ctx.drawImage(origImg, 0, 0);
            originalImageData.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
            imagesLoaded.current.original = true;

            if (imagesLoaded.current.depth) {
                startAnimation();
            }
        };
        origImg.src = originalImage;

        // Load depth map
        const depthImg = new Image();
        depthImg.onload = () => {
            // Create temp canvas to read depth data
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = depthImg.width;
            tempCanvas.height = depthImg.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(depthImg, 0, 0);
            depthImageData.current = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            imagesLoaded.current.depth = true;

            if (imagesLoaded.current.original) {
                startAnimation();
            }
        };
        depthImg.src = depthMap;

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [originalImage, depthMap]);

    const renderFrame = useCallback((progress) => {
        const canvas = canvasRef.current;
        if (!canvas || !originalImageData.current || !depthImageData.current) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const origData = originalImageData.current.data;
        const depthData = depthImageData.current.data;
        const outputData = ctx.createImageData(width, height);
        const output = outputData.data;

        // 3D orbital parallax effect
        // Simulate camera orbiting around the scene
        const angle = progress * Math.PI * 2;
        const maxShift = intensity * 0.4;

        // Orbital motion - camera moves in a circle
        const cameraX = Math.sin(angle) * maxShift;
        const cameraY = Math.cos(angle * 0.5) * maxShift * 0.3; // Subtle vertical

        const centerX = width / 2;
        const centerY = height / 2;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // Get depth value (0-255, light = close, dark = far)
                const depth = depthData[idx] / 255;

                // Parallax: nearby objects (high depth) shift more
                // Objects shift based on their position relative to center
                const relX = (x - centerX) / centerX;
                const relY = (y - centerY) / centerY;

                // Calculate displacement based on depth and camera position
                // Closer objects (higher depth) move more in the opposite direction of camera
                const shiftX = cameraX * depth;
                const shiftY = cameraY * depth;

                // Add subtle perspective distortion
                const perspectiveX = relX * cameraX * depth * 0.2;
                const perspectiveY = relY * cameraY * depth * 0.2;

                // Source position
                let srcX = Math.round(x - shiftX - perspectiveX);
                let srcY = Math.round(y - shiftY - perspectiveY);

                // Clamp to bounds
                srcX = Math.max(0, Math.min(width - 1, srcX));
                srcY = Math.max(0, Math.min(height - 1, srcY));

                const srcIdx = (srcY * width + srcX) * 4;

                output[idx] = origData[srcIdx];
                output[idx + 1] = origData[srcIdx + 1];
                output[idx + 2] = origData[srcIdx + 2];
                output[idx + 3] = origData[srcIdx + 3];
            }
        }

        ctx.putImageData(outputData, 0, 0);
    }, [intensity]);

    const startAnimation = useCallback(() => {
        const canvas = canvasRef.current;
        if (onCanvasReady) {
            onCanvasReady(canvas);
        }

        let startTime = null;
        const duration = 3000; // 3 second loop for smoother orbit

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = (elapsed % duration) / duration;

            renderFrame(progress);

            if (isAnimating) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        if (isAnimating) {
            animationRef.current = requestAnimationFrame(animate);
        }
    }, [isAnimating, renderFrame, onCanvasReady]);

    // Listen for capture frame events (for export)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleCaptureFrame = (e) => {
            renderFrame(e.detail.progress);
        };

        canvas.addEventListener('captureFrame', handleCaptureFrame);
        return () => canvas.removeEventListener('captureFrame', handleCaptureFrame);
    }, [renderFrame]);

    // Restart animation when intensity changes
    useEffect(() => {
        if (imagesLoaded.current.original && imagesLoaded.current.depth && isAnimating) {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            startAnimation();
        }
    }, [intensity, startAnimation, isAnimating]);

    return (
        <div className="wiggle-container">
            <canvas ref={canvasRef} className="wiggle-canvas" />
        </div>
    );
}
