import { useEffect, useRef } from 'react';

export default function ProcessingImage({ src }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !src) return;

        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Set canvas size to match image
            const maxSize = 480;
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            // Get color image data
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const colorData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Create grayscale version
            const grayData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const grayPixels = grayData.data;
            for (let i = 0; i < grayPixels.length; i += 4) {
                const avg = (grayPixels[i] + grayPixels[i + 1] + grayPixels[i + 2]) / 3;
                grayPixels[i] = avg;
                grayPixels[i + 1] = avg;
                grayPixels[i + 2] = avg;
            }

            let startTime = null;
            const duration = 3000; // 3 second full cycle (1.5s each direction)

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const cycleProgress = (elapsed % duration) / duration;

                // Ping-pong: 0→1 for first half, 1→0 for second half
                let progress;
                if (cycleProgress < 0.5) {
                    // Color to grayscale (left to right)
                    progress = cycleProgress * 2;
                } else {
                    // Grayscale to color (right to left)
                    progress = 1 - (cycleProgress - 0.5) * 2;
                }

                // Sweep position
                const sweepX = progress * 1.2 - 0.1;
                const sweepWidth = 0.12;

                // Create output combining color and grayscale
                const outputData = ctx.createImageData(canvas.width, canvas.height);
                const output = outputData.data;
                const color = colorData.data;
                const gray = grayData.data;

                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const idx = (y * canvas.width + x) * 4;
                        const normalizedX = x / canvas.width;

                        // Calculate blend factor based on sweep position
                        let blend;
                        if (normalizedX < sweepX - sweepWidth) {
                            blend = 1; // Fully grayscale
                        } else if (normalizedX > sweepX + sweepWidth) {
                            blend = 0; // Fully color
                        } else {
                            blend = (sweepX + sweepWidth - normalizedX) / (sweepWidth * 2);
                            blend = blend * blend * (3 - 2 * blend); // Smoothstep
                        }

                        output[idx] = color[idx] * (1 - blend) + gray[idx] * blend;
                        output[idx + 1] = color[idx + 1] * (1 - blend) + gray[idx + 1] * blend;
                        output[idx + 2] = color[idx + 2] * (1 - blend) + gray[idx + 2] * blend;
                        output[idx + 3] = 255;
                    }
                }

                ctx.putImageData(outputData, 0, 0);

                // Draw subtle highlight at sweep position
                const highlightX = sweepX * canvas.width;
                const gradient = ctx.createLinearGradient(
                    highlightX - 20, 0,
                    highlightX + 20, 0
                );
                gradient.addColorStop(0, 'rgba(255,255,255,0)');
                gradient.addColorStop(0.5, 'rgba(255,255,255,0.06)');
                gradient.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(highlightX - 20, 0, 40, canvas.height);

                animationRef.current = requestAnimationFrame(animate);
            };

            animationRef.current = requestAnimationFrame(animate);
        };

        img.src = src;

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [src]);

    return (
        <canvas
            ref={canvasRef}
            className="processing-canvas"
        />
    );
}
