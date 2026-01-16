import GIF from 'gif.js';

// Export wiggle animation as GIF
export function exportGif(canvas, duration = 2, fps = 15) {
    return new Promise((resolve, reject) => {
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: canvas.width,
            height: canvas.height,
            workerScript: '/gif.worker.js',
        });

        const totalFrames = Math.floor(duration * fps);
        const frameDelay = 1000 / fps;

        // Create frames synchronously from provided frame data
        for (let i = 0; i < totalFrames; i++) {
            const progress = i / totalFrames;
            const event = new CustomEvent('captureFrame', { detail: { progress } });
            canvas.dispatchEvent(event);

            // Capture current canvas state
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Create temp canvas with this frame
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(imageData, 0, 0);

            gif.addFrame(tempCanvas, { delay: frameDelay, copy: true });
        }

        gif.on('finished', (blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wiggle.gif';
            a.click();
            URL.revokeObjectURL(url);
            resolve();
        });

        gif.on('error', reject);
        gif.render();
    });
}

// Export wiggle animation as MP4 using WebCodecs
export async function exportMp4(canvas, duration = 2, fps = 30) {
    // Check if WebCodecs is supported
    if (typeof VideoEncoder === 'undefined') {
        throw new Error('MP4 export requires a browser that supports WebCodecs API');
    }

    const width = canvas.width;
    const height = canvas.height;
    const totalFrames = Math.floor(duration * fps);

    // Simple fallback: use canvas.captureStream and MediaRecorder
    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
    });

    const chunks = [];

    return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wiggle.webm';
            a.click();
            URL.revokeObjectURL(url);
            resolve();
        };

        mediaRecorder.onerror = reject;

        // Start recording
        mediaRecorder.start();

        // Animate for the duration
        let startTime = null;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = (timestamp - startTime) / 1000;

            if (elapsed < duration) {
                const progress = elapsed / duration;
                const event = new CustomEvent('captureFrame', { detail: { progress } });
                canvas.dispatchEvent(event);
                requestAnimationFrame(animate);
            } else {
                mediaRecorder.stop();
            }
        };

        requestAnimationFrame(animate);
    });
}
