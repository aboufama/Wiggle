import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

function ParallaxPlane({
    colorUrl,
    depthUrl,
    strength = 0.035,
    speed = 1,
    onAspectRatio,
}) {
    const meshRef = useRef();
    const { viewport } = useThree();
    const mouseRef = useRef(new THREE.Vector2(0, 0));

    const [colorTex, setColorTex] = useState(null);
    const [depthTex, setDepthTex] = useState(null);
    const [imageAspect, setImageAspect] = useState(1);

    useEffect(() => {
        const loader = new THREE.TextureLoader();
        loader.load(colorUrl, (t) => {
            // Keep texture in sRGB for proper color display
            t.colorSpace = THREE.SRGBColorSpace;
            t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
            t.minFilter = THREE.LinearFilter;
            t.magFilter = THREE.LinearFilter;
            setColorTex(t);
            if (t.image) {
                const aspect = t.image.width / t.image.height;
                setImageAspect(aspect);
                if (onAspectRatio) onAspectRatio(aspect);
            }
        });
        loader.load(depthUrl, (t) => {
            t.colorSpace = THREE.NoColorSpace;
            t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
            setDepthTex(t);
        });
    }, [colorUrl, depthUrl, onAspectRatio]);

    const uniforms = useMemo(
        () => ({
            uColor: { value: null },
            uDepth: { value: null },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uStrength: { value: strength },
        }),
        [strength]
    );

    useEffect(() => {
        if (colorTex) uniforms.uColor.value = colorTex;
        if (depthTex) uniforms.uDepth.value = depthTex;
    }, [colorTex, depthTex, uniforms]);

    useEffect(() => {
        uniforms.uStrength.value = strength;
    }, [strength, uniforms]);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;

        const t = clock.getElapsedTime() * speed * 6;
        const x = Math.sin(t * 0.8) * 0.6;
        const y = Math.sin(t * 0.5) * 0.3;

        mouseRef.current.x += (x - mouseRef.current.x) * 0.12;
        mouseRef.current.y += (y - mouseRef.current.y) * 0.12;

        uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);
    });

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms,
            vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        varying vec2 vUv;

        uniform sampler2D uColor;
        uniform sampler2D uDepth;
        uniform vec2 uMouse;
        uniform float uStrength;

        // sRGB to Linear conversion
        vec3 sRGBToLinear(vec3 color) {
          return pow(color, vec3(2.2));
        }

        // Linear to sRGB conversion
        vec3 linearToSRGB(vec3 color) {
          return pow(color, vec3(1.0 / 2.2));
        }

        void main() {
          float d = texture2D(uDepth, vUv).r;
          float centered = (d - 0.5);
          vec2 offset = uMouse * uStrength * centered;
          vec2 uv = vUv + offset;
          uv = clamp(uv, 0.001, 0.999);
          
          vec4 col = texture2D(uColor, uv);
          
          // The texture is already in sRGB, but WebGL reads it as linear
          // We need to output it properly for sRGB display
          // Since we set outputColorSpace to sRGB, just pass through
          gl_FragColor = vec4(col.rgb, 1.0);
        }
      `,
        });
    }, [uniforms]);

    if (!colorTex || !depthTex) return null;

    const planeWidth = viewport.width;
    const planeHeight = viewport.width / imageAspect;

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[planeWidth, planeHeight, 1, 1]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
}

export default function DepthParallax({
    colorUrl,
    depthUrl,
    strength = 0.1,
    speed = 1,
    style,
    canvasRef,
}) {
    const containerRef = useRef(null);
    const [aspectRatio, setAspectRatio] = useState(1);

    useEffect(() => {
        if (canvasRef && containerRef.current) {
            const canvas = containerRef.current.querySelector('canvas');
            if (canvas && canvasRef.current !== canvas) {
                canvasRef(canvas);
            }
        }
    });

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                aspectRatio: String(aspectRatio),
                maxHeight: "400px",
                ...style
            }}
        >
            <Canvas
                orthographic
                camera={{ zoom: 100, position: [0, 0, 5] }}
                gl={{
                    antialias: true,
                    alpha: false,
                    preserveDrawingBuffer: true,
                }}
                onCreated={({ gl }) => {
                    // Disable all tone mapping and color management that could darken
                    gl.toneMapping = THREE.NoToneMapping;
                    gl.outputColorSpace = THREE.SRGBColorSpace;
                }}
                flat // Disables tone mapping in R3F
            >
                <ParallaxPlane
                    colorUrl={colorUrl}
                    depthUrl={depthUrl}
                    strength={strength}
                    speed={speed}
                    onAspectRatio={setAspectRatio}
                />
            </Canvas>
        </div>
    );
}
