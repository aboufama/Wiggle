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

    // Check for supported mime types
    const mimeTypes = [
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm'
    ];

    let selectedMimeType = '';
    for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            break;
        }
    }

    if (!selectedMimeType) {
        throw new Error('No supported video mime type found');
    }

    // Simple fallback: use canvas.captureStream and MediaRecorder
    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 8000000, // Higher bitrate for better quality
    });

    const chunks = [];

    return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: selectedMimeType });
            const file = new File([blob], 'wiggle.mp4', { type: selectedMimeType });

            // Try native sharing first (best for iOS "Save to Files/Photos")
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Wiggle 3D',
                        text: 'Check out my 3D wiggle!'
                    });
                    resolve();
                    return;
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.warn('Share failed, falling back to download', err);
                    } else {
                        // User cancelled share, consider it done
                        resolve();
                        return;
                    }
                }
            }

            // Fallback to direct download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ext = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
            a.download = `wiggle.${ext}`;
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
