import { useState, useCallback, forwardRef } from 'react';

const DropZone = forwardRef(function DropZone({ onImageSelect, previewImage }, ref) {
    const [isDragging, setIsDragging] = useState(false);
    const [localPreview, setLocalPreview] = useState(null);

    const preview = previewImage || localPreview;

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragIn = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragOut = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                processFile(file);
            }
        }
    }, []);

    const handleFileInput = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    }, []);

    const processFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setLocalPreview(e.target.result);
        };
        reader.readAsDataURL(file);
        onImageSelect(file);
    };

    const handleClear = () => {
        setLocalPreview(null);
        onImageSelect(null);
    };

    // Check if on mobile
    const isMobile = typeof window !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    return (
        <div
            ref={ref}
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {preview ? (
                <div className="preview-container">
                    <img src={preview} alt="Preview" className="preview-image" />
                    <button
                        className="clear-button"
                        onClick={handleClear}
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <div className="drop-content">
                    <div className="drop-icon">{isMobile ? '📷' : '↓'}</div>
                    <p>{isMobile ? 'tap to take photo' : 'drop image here'}</p>
                    <span className="drop-hint">{isMobile ? 'or choose from library' : 'or click to select'}</span>
                    <input
                        type="file"
                        accept="image/*"
                        capture={isMobile ? "environment" : undefined}
                        onChange={handleFileInput}
                        className="file-input"
                    />
                </div>
            )}
        </div>
    );
});

export default DropZone;
