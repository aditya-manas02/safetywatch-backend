import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface YetiAnimationProps {
    isEmailFocused: boolean;
    isPasswordFocused: boolean;
    showPassword: boolean;
    emailValue: string;
}

export const YetiAnimation = ({
    isEmailFocused,
    isPasswordFocused,
    showPassword,
    emailValue,
}: YetiAnimationProps) => {
    const [isBlinking, setIsBlinking] = useState(false);
    const [caretX, setCaretX] = useState(0);
    const measureRef = useRef<HTMLDivElement>(null);

    // Constants mapping to the original JS
    const svgSize = 200;
    const screenCenter = 100; // svgCoords.x + (mySVG.offsetWidth / 2) -> in SVG space
    const eyeLCoords = { x: 84, y: 76 };
    const eyeRCoords = { x: 113, y: 76 };
    const noseCoords = { x: 97, y: 81 };
    const mouthCoords = { x: 100, y: 100 };

    // Helper functions from source
    const getAngle = (x1: number, y1: number, x2: number, y2: number) => {
        return Math.atan2(y2 - y1, x2 - x1);
    };

    // Measure caret position
    useEffect(() => {
        if (measureRef.current) {
            setCaretX(measureRef.current.offsetWidth);
        }
    }, [emailValue]);

    // Idle blinking
    useEffect(() => {
        const blink = () => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), 100);
            setTimeout(blink, 4000 + Math.random() * 8000);
        };
        const timer = setTimeout(blink, 4000);
        return () => clearTimeout(timer);
    }, []);

    // Calculate face movements
    const movement = useMemo(() => {
        if (!isEmailFocused && emailValue.length === 0) {
            return {
                eyeLX: 0, eyeLY: 0, eyeRX: 0, eyeRY: 0,
                noseX: 0, noseY: 0, mouthX: 0, mouthY: 0, mouthR: 0,
                faceX: 0, faceY: 0, faceSkew: 0, eyebrowSkew: 0,
                outerEarX: 0, outerEarY: 0, hairX: 0, hairS: 1, chinS: 1, chinX: 0, chinY: 0
            };
        }

        // Map caret position to SVG space (0-200)
        const parentWidth = measureRef.current?.parentElement?.offsetWidth || 300;
        let targetX = Math.max(0, Math.min(200, (caretX / parentWidth) * 200));
        let targetY = isEmailFocused ? 135 : 100;

        if (isPasswordFocused) {
            targetX = 100;
            targetY = 100;
        }

        // Linear offsets from center (100)
        const offsetX = targetX - 100;
        const offsetY = targetY - 100;

        // Pupils still use some "gaze" logic to hit socket edges
        const eyeLX = offsetX * 0.15;
        const eyeLY = offsetY * 0.2;
        const eyeRX = offsetX * 0.15;
        const eyeRY = offsetY * 0.2;

        // Features move linearly with typing
        const noseX = offsetX * 0.18;
        const noseY = offsetY * 0.15;
        const mouthX = offsetX * 0.18;
        const mouthY = offsetY * 0.15;
        const mouthR = offsetX * 0.05;

        // Scaling and parallax
        const chinX = mouthX * 0.8;
        const chinY = mouthY * 0.5;
        let chinS = 1 - ((offsetX * 0.1) / 100);
        chinS = Math.max(0.7, Math.min(1.3, chinS));

        const faceX = offsetX * 0.08;
        const faceY = offsetY * 0.1;
        const faceSkew = offsetX * 0.04;
        const eyebrowSkew = offsetX * 0.15;
        const outerEarX = offsetX * 0.02;
        const outerEarY = offsetX * 0.03;
        const hairX = offsetX * 0.05;
        const hairS = 1.15;

        return {
            eyeLX, eyeLY, eyeRX, eyeRY, noseX, noseY, mouthX, mouthY, mouthR,
            faceX, faceY, faceSkew, eyebrowSkew, outerEarX, outerEarY, hairX, hairS,
            chinS, chinX, chinY
        };
    }, [isEmailFocused, emailValue, caretX, isPasswordFocused]);

    // Mouth morphing paths
    const mouthPaths = {
        small: "M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8 c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2 c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z",
        medium: "M95,104.2c-4.5,0-8.2-3.7-8.2-8.2v-2c0-1.2,1-2.2,2.2-2.2h22c1.2,0,2.2,1,2.2,2.2v2 c0,4.5-3.7,8.2-8.2,8.2H95z",
        large: "M100 110.2c-9 0-16.2-7.3-16.2-16.2 0-2.3 1.9-4.2 4.2-4.2h24c2.3 0 4.2 1.9 4.2 4.2 0 9-7.2 16.2-16.2 16.2z"
    };

    const getMouthState = () => {
        if (emailValue.length === 0) return { d: mouthPaths.small, eyeScale: 1, toothY: 0, tongueY: 0 };
        if (emailValue.includes("@")) return { d: mouthPaths.large, eyeScale: 0.65, toothY: -2, tongueY: 2 };
        return { d: mouthPaths.medium, eyeScale: 0.85, toothY: 0, tongueY: 1 };
    };

    const mouthState = getMouthState();
    const isCovering = isPasswordFocused && !showPassword;
    const isPeeking = isPasswordFocused && showPassword;

    const expoOut = [0.16, 1, 0.3, 1] as const;
    const quadOut = [0.25, 0.46, 0.45, 0.94] as const;

    return (
        <div className="flex justify-center mb-[-24px] sm:mb-[-32px] relative z-20 pointer-events-none select-none">
            <div ref={measureRef} className="absolute opacity-0 pointer-events-none font-sans text-[1.55em] font-semibold whitespace-pre">
                {emailValue}
            </div>

            <div className="w-44 h-44 sm:w-56 sm:h-56 relative overflow-hidden rounded-full transition-all duration-300">
                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-sm">
                    <defs>
                        <circle id="armMaskPath" cx="100" cy="100" r="100" />
                        <motion.path
                            id="mouthMaskPath"
                            animate={{
                                d: mouthState.d,
                                x: movement.mouthX,
                                y: movement.mouthY,
                                rotate: movement.mouthR
                            }}
                            style={{ transformOrigin: "100px 100px" }}
                            transition={{ duration: 0.45, ease: expoOut }}
                        />
                    </defs>
                    <clipPath id="armMask"><circle cx="100" cy="100" r="100" /></clipPath>
                    <clipPath id="mouthMask"><use href="#mouthMaskPath" overflow="visible" /></clipPath>

                    <circle cx="100" cy="100" r="100" fill="#a9ddf3" />

                    {/* Ears */}
                    <motion.g
                        animate={{ x: movement.faceX * 0.1, y: movement.faceY * 0.1 }}
                        transition={{ duration: 1, ease: expoOut }}
                    >
                        <g className="earL">
                            <motion.g animate={{ x: movement.outerEarX, y: -movement.outerEarY }} transition={{ duration: 1, ease: expoOut }}>
                                <circle cx="47" cy="83" r="11.5" fill="#ddf1fa" stroke="#3a5e77" strokeWidth="2.5" />
                                <path d="M46.3 78.9c-2.3 0-4.1 1.9-4.1 4.1 0 2.3 1.9 4.1 4.1 4.1" fill="none" stroke="#3a5e77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </motion.g>
                            <motion.g animate={{ x: -movement.outerEarX, y: -movement.outerEarY }} transition={{ duration: 1, ease: expoOut }}>
                                <rect x="51" y="64" fill="#FFFFFF" width="15" height="35" />
                                <path d="M53.4 62.8C48.5 67.4 45 72.2 42.8 77c3.4-.1 6.8-.1 10.1.1-4 3.7-6.8 7.6-8.2 11.6 2.1 0 4.2 0 6.3.2-2.6 4.1-3.8 8.3-3.7 12.5 1.2-.7 3.4-1.4 5.2-1.9" fill="#fff" stroke="#3a5e77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </motion.g>
                        </g>
                        <g className="earR">
                            <motion.g animate={{ x: movement.outerEarX, y: movement.outerEarY }} transition={{ duration: 1, ease: expoOut }}>
                                <circle cx="153" cy="83" r="11.5" fill="#ddf1fa" stroke="#3a5e77" strokeWidth="2.5" />
                                <path d="M153.7,78.9 c2.3,0,4.1,1.9,4.1,4.1c0,2.3-1.9,4.1-4.1,4.1" fill="none" stroke="#3a5e77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </motion.g>
                            <motion.g animate={{ x: -movement.outerEarX, y: -movement.outerEarY }} transition={{ duration: 1, ease: expoOut }}>
                                <rect x="134" y="64" fill="#FFFFFF" width="15" height="35" />
                                <path d="M146.6,62.8 c4.9,4.6,8.4,9.4,10.6,14.2c-3.4-0.1-6.8-0.1-10.1,0.1c4,3.7,6.8,7.6,8.2,11.6c-2.1,0-4.2,0-6.3,0.2c2.6,4.1,3.8,8.3,3.7,12.5 c-1.2-0.7-3.4-1.4-5.2-1.9" fill="#fff" stroke="#3a5e77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </motion.g>
                        </g>
                    </motion.g>

                    {/* Body - subtle tilt for "body responding" effect */}
                    <motion.g
                        className="body"
                        animate={{ x: movement.faceX * 0.4, y: movement.faceY * 0.4 }}
                        transition={{ duration: 0.45, ease: quadOut }}
                    >
                        <motion.path
                            animate={{
                                d: isCovering
                                    ? "M200,122 c0,0-35,0-35,0 L150.1,122 V72 c0-27.6-22.4-50-50-50 c-27.6,0-50,22.4-50,50 v50 L35,122 c0,0-35,0-35,0 L0,213 h200 L200,122 z"
                                    : "M200,158.5 c0-20.2-14.8-36.5-35-36.5 h-14.9 V72.8 c0-27.4-21.7-50.4-49.1-50.8 c-28-0.5-50.9,22.1-50.9,50 v50 L35,122 C16,122,0,138,0,157.8 L0,213 h200 L200,158.5 z"
                            }}
                            transition={{ duration: 0.45, ease: quadOut }}
                            stroke="#3A5E77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="#FFFFFF"
                        />
                        <path fill="#DDF1FA" d="M100,156.4c-22.9,0-43,11.1-54.1,27.7c15.6,10,34.2,15.9,54.1,15.9s38.5-5.8,54.1-15.9 C143,167.5,122.9,156.4,100,156.4z" />
                    </motion.g>

                    {/* Chin */}
                    <motion.path
                        className="chin"
                        animate={{ x: movement.chinX, y: movement.chinY, scaleY: movement.chinS }}
                        style={{ transformOrigin: "100px 100px" }}
                        d="M84.1 121.6c2.7 2.9 6.1 5.4 9.8 7.5l.9-4.5c2.9 2.5 6.3 4.8 10.2 6.5 0-1.9-.1-3.9-.2-5.8 3 1.2 6.2 2 9.7 2.5-.3-2.1-.7-4.1-1.2-6.1"
                        fill="none" stroke="#3a5e77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        transition={{ duration: 1, ease: expoOut }}
                    />

                    {/* Blue Face Shape */}
                    <motion.path
                        className="face"
                        animate={{
                            x: movement.faceX,
                            y: movement.faceY,
                            skewX: movement.faceSkew
                        }}
                        style={{ transformOrigin: "100px 100px" }}
                        fill="#DDF1FA"
                        d="M134.5,46v35.5c0,21.815-15.446,39.5-34.5,39.5s-34.5-17.685-34.5-39.5V46"
                        transition={{ duration: 1, ease: expoOut }}
                    />

                    {/* Hair */}
                    <motion.path
                        className="hair"
                        animate={{
                            x: movement.hairX,
                            y: movement.faceY * 0.5,
                            scaleY: movement.hairS
                        }}
                        style={{ transformOrigin: "100px 100px" }}
                        fill="#FFFFFF" stroke="#3A5E77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        d="M81.457,27.929 c1.755-4.084,5.51-8.262,11.253-11.77c0.979,2.565,1.883,5.14,2.712,7.723c3.162-4.265,8.626-8.27,16.272-11.235 c-0.737,3.293-1.588,6.573-2.554,9.837c4.857-2.116,11.049-3.64,18.428-4.156c-2.403,3.23-5.021,6.391-7.852,9.474"
                        transition={{ duration: 1, ease: expoOut }}
                    />

                    {/* Eyebrows */}
                    <motion.g
                        animate={{
                            x: movement.faceX,
                            y: movement.faceY,
                            skewX: movement.eyebrowSkew
                        }}
                        style={{ transformOrigin: "100px 100px" }}
                        transition={{ duration: 1, ease: expoOut }}
                    >
                        <path fill="#FFFFFF" d="M138.142,55.064c-4.93,1.259-9.874,2.118-14.787,2.599c-0.336,3.341-0.776,6.689-1.322,10.037 c-4.569-1.465-8.909-3.222-12.996-5.226c-0.98,3.075-2.07,6.137-3.267,9.179c-5.514-3.067-10.559-6.545-15.097-10.329 c-1.806,2.889-3.745,5.73-5.816,8.515c-7.916-4.124-15.053-9.114-21.296-14.738l1.107-11.768h73.475V55.064z" />
                        <path fill="#FFFFFF" stroke="#3A5E77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M63.56,55.102 c6.243,5.624,13.38,10.614,21.296,14.738c2.071-2.785,4.01-5.626,5.816-8.515c4.537,3.785,9.583,7.263,15.097,10.329 c1.197-3.043,2.287-6.104,3.267-9.179c4.087,2.004,8.427,3.761,12.996,5.226c0.545-3.348,0.986-6.696,1.322-10.037 c4.913-0.481,9.857-1.34,14.787-2.599" />
                    </motion.g>

                    {/* Eyes */}
                    <g className="eyes">
                        <motion.g
                            animate={{
                                x: movement.eyeLX, y: movement.eyeLY,
                                scale: mouthState.eyeScale,
                                scaleY: isBlinking ? 0 : mouthState.eyeScale
                            }}
                            style={{ transformOrigin: "85.5px 78.5px" }}
                            transition={{ scaleY: { duration: 0.1 }, default: { duration: 1, ease: expoOut } }}
                        >
                            <circle cx="85.5" cy="78.5" r="3.5" fill="#3a5e77" />
                            <circle cx="84" cy="76" r="1.1" fill="#fff" />
                        </motion.g>
                        <motion.g
                            animate={{
                                x: movement.eyeRX, y: movement.eyeRY,
                                scale: mouthState.eyeScale,
                                scaleY: isBlinking ? 0 : mouthState.eyeScale
                            }}
                            style={{ transformOrigin: "114.5px 78.5px" }}
                            transition={{ scaleY: { duration: 0.1 }, default: { duration: 1, ease: expoOut } }}
                        >
                            <circle cx="114.5" cy="78.5" r="3.5" fill="#3a5e77" />
                            <circle cx="113" cy="76" r="1.1" fill="#fff" />
                        </motion.g>
                    </g>
                    {/* Mouth */}
                    <g className="mouth">
                        <motion.path
                            animate={{
                                d: mouthState.d,
                                x: movement.mouthX,
                                y: movement.mouthY,
                                rotate: movement.mouthR
                            }}
                            style={{ transformOrigin: "100px 100px" }}
                            fill="#617E92"
                            transition={{ duration: 0.45, ease: expoOut }}
                        />
                        <g clipPath="url(#mouthMask)">
                            <motion.g
                                className="tongue"
                                animate={{ x: movement.mouthX, y: movement.mouthY + mouthState.tongueY }}
                                transition={{ duration: 1, ease: expoOut }}
                            >
                                <circle cx="100" cy="107" r="8" fill="#cc4a6c" />
                                <ellipse cx="100" cy="100.5" rx="3" ry="1.5" opacity=".1" fill="#fff" />
                            </motion.g>
                            <motion.path
                                animate={{ x: movement.mouthX, y: movement.mouthY + mouthState.toothY }}
                                fill="#FFFFFF" d="M106,97h-4c-1.1,0-2-0.9-2-2v-2h8v2C108,96.1,107.1,97,106,97z"
                                transition={{ duration: 1, ease: expoOut }}
                            />
                        </g>
                        <motion.path
                            className="mouthOutline"
                            animate={{
                                d: mouthState.d,
                                x: movement.mouthX,
                                y: movement.mouthY,
                                rotate: movement.mouthR
                            }}
                            style={{ transformOrigin: "100px 100px" }}
                            fill="none" stroke="#3A5E77" strokeWidth="2.5" strokeLinejoin="round"
                            transition={{ duration: 0.45, ease: expoOut }}
                        />
                    </g>

                    {/* Nose */}
                    <motion.path
                        className="nose"
                        animate={{ x: movement.noseX, y: movement.noseY, rotate: movement.mouthR }}
                        style={{ transformOrigin: "100px 100px" }}
                        d="M97.7 79.9h4.7c1.9 0 3 2.2 1.9 3.7l-2.3 3.3c-.9 1.3-2.9 1.3-3.8 0l-2.3-3.3c-1.3-1.6-.2-3.7 1.8-3.7z"
                        fill="#3a5e77"
                        transition={{ duration: 1, ease: expoOut }}
                    />

                    {/* Arms */}
                    <g className="arms" clipPath="url(#armMask)">
                        <AnimatePresence>
                            {isPasswordFocused && (
                                <>
                                    {/* Character's Right Arm (our Left) */}
                                    <motion.g
                                        className="armL"
                                        initial={{ opacity: 0, x: -93, y: 220, rotate: 105 }}
                                        animate={{
                                            opacity: 1,
                                            x: (isPeeking ? -98 : -93) + movement.faceX * 0.4,
                                            y: (isPeeking ? -6 : -2.5) + movement.faceY * 0.4,
                                            rotate: 0
                                        }}
                                        exit={{ opacity: 0, x: -93, y: 220, rotate: 105 }}
                                        style={{ transformOrigin: "top left" }}
                                        transition={{
                                            opacity: { duration: 0.2 },
                                            x: { duration: 0.4, ease: expoOut, delay: 0.05 },
                                            y: { duration: 0.4, ease: expoOut, delay: 0.05 },
                                            rotate: { duration: 0.4, ease: expoOut, delay: 0.05 }
                                        }}
                                    >
                                        <polygon fill="#FFFFFF" stroke="#3A5E77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points="121.3,98.4 111,59.7 149.8,49.3 169.8,85.4" />
                                        <path fill="#FFFFFF" stroke="#3A5E77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M134.4,53.5l19.3-5.2c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-10.3,2.8" />
                                        <path fill="#FFFFFF" stroke="#3A5E77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M150.9,59.4l26-7c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-21.3,5.7" />

                                        <motion.g
                                            className="twoFingers"
                                            animate={{ rotate: isPeeking ? 35 : 0, x: isPeeking ? -2 : 0, y: isPeeking ? -5 : 0 }}
                                            style={{ transformOrigin: "158.3px 67.8px" }}
                                            transition={{ duration: 0.35, ease: "easeInOut" }}
                                        >
                                            <path fill="#FFFFFF" stroke="#3A5E77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M158.3,67.8l23.1-6.2c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-23.1,6.2" />
                                            <path fill="#A9DDF3" d="M180.1,65l2.2-0.6c1.1-0.3,2.2,0.3,2.4,1.4v0c0.3,1.1-0.3,2.2-1.4,2.4l-2.2,0.6L180.1,65z" />
                                            <path fill="#FFFFFF" stroke="#3A5E77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M160.8,77.5l19.4-5.2c2.7-0.7,5.4,0.9,6.1,3.5v0c0.7,2.7-0.9,5.4-3.5,6.1l-18.3,4.9" />
                                            <path fill="#A9DDF3" d="M178.8,75.7l2.2-0.6c1.1-0.3,2.2,0.3,2.4,1.4v0c0.3,1.1-0.3,2.2-1.4,2.4l-2.2,0.6L178.8,75.7z" />
                                        </motion.g>
                                        <path fill="#A9DDF3" d="M175.5,55.9l2.2-0.6c1.1-0.3,2.2,0.3,2.4,1.4v0c0.3,1.1-0.3,2.2-1.4,2.4l-2.2,0.6L175.5,55.9z" />
                                        <path fill="#A9DDF3" d="M152.1,50.4l2.2-0.6c1.1-0.3,2.2,0.3,2.4,1.4v0c0.3,1.1-0.3,2.2-1.4,2.4l-2.2,0.6L152.1,50.4z" />
                                        <path fill="#FFFFFF" stroke="#3A5E77" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M123.5,97.8 c-41.4,14.9-84.1,30.7-108.2,35.5L1.2,81c33.5-9.9,71.9-16.5,111.9-21.8" />
                                        <path fill="#FFFFFF" stroke="#3A5E77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M108.5,60.4 c7.7-5.3,14.3-8.4,22.8-13.2c-2.4,5.3-4.7,10.3-6.7,15.1c4.3,0.3,8.4,0.7,12.3,1.3c-4.2,5-8.1,9.6-11.5,13.9 c3.1,1.1,6,2.4,8.7,3.8c-1.4,2.9-2.7,5.8-3.9,8.5c2.5,3.5,4.6,7.2,6.3,11c-4.9-0.8-9-0.7-16.2-2.7" />
                                        <path fill="#FFFFFF" stroke="#3A5E77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M94.5,103.8 c-0.6,4-3.8,8.9-9.4,14.7c-2.6-1.8-5-3.7-7.2-5.7c-2.5,4.1-6.6,8.8-12.2,14c-1.9-2.2-3.4-4.5-4.5-6.9c-4.4,3.3-9.5,6.9-15.4,10.8 c-0.2-3.4,0.1-7.1,1.1-10.9" />
                                        <path fill="#FFFFFF" stroke="#3A5E77" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M97.5,63.9 c-1.7-2.4-5.9-4.1-12.4-5.2c-0.9,2.2-1.8,4.3-2.5,6.5c-3.8-1.8-9.4-3.1-17-3.8c0.5,2.3,1.2,4.5,1.9,6.8c-5-0.6-11.2-0.9-18.4-1 c2,2.9,0.9,3.5,3.9,6.2" />
                                    </motion.g>

                                    {/* Character's Left Arm (our Right) */}
                                    <motion.g
                                        className="armR"
                                        initial={{ opacity: 0, x: -93, y: 220, rotate: -105 }}
                                        animate={{
                                            opacity: 1,
                                            x: (isPeeking ? -88 : -93) + movement.faceX * 0.4,
                                            y: (isPeeking ? -6 : -2.5) + movement.faceY * 0.4,
                                            rotate: 0
                                        }}
                                        exit={{ opacity: 0, x: -93, y: 220, rotate: -105 }}
                                        style={{ transformOrigin: "top right" }}
                                        transition={{
                                            opacity: { duration: 0.2 },
                                            x: { duration: 0.4, ease: expoOut, delay: 0.05 },
                                            y: { duration: 0.4, ease: expoOut, delay: 0.05 },
                                            rotate: { duration: 0.4, ease: expoOut, delay: 0.05 }
                                        }}
                                    >
                                        <path fill="#FFFFFF" stroke="#3a5e77" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M265.4 97.3l10.4-38.6-38.9-10.5-20 36.1z" />
                                        <path fill="#FFFFFF" stroke="#3a5e77" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M252.4 52.4L233 47.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l10.3 2.8" />
                                        <path fill="#FFFFFF" stroke="#3a5e77" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M226 76.4l-19.4-5.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l18.3 4.9" />

                                        <motion.g
                                            className="twoFingersR"
                                            animate={{ rotate: isPeeking ? -35 : 0, x: isPeeking ? 2 : 0, y: isPeeking ? -5 : 0 }}
                                            style={{ transformOrigin: "228.4px 66.7px" }}
                                            transition={{ duration: 0.35, ease: "easeInOut" }}
                                        >
                                            <path fill="#FFFFFF" stroke="#3a5e77" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M228.4 66.7l-23.1-6.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l23.1 6.2" />
                                            <path fill="#FFFFFF" stroke="#3a5e77" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M235.8 58.3l-26-7c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l21.3 5.7" />
                                        </motion.g>

                                        <path fill="#a9ddf3" d="M207.9 74.7l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM206.7 64l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM211.2 54.8l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM234.6 49.4l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8z" />
                                        <path fill="#FFFFFF" stroke="#3a5e77" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M263.3 96.7c41.4 14.9 84.1 30.7 108.2 35.5l14-52.3C352 70 313.6 63.5 273.6 58.1" />
                                        <path fill="#FFFFFF" stroke="#3a5e77" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M278.2 59.3l-18.6-10 2.5 11.9-10.7 6.5 9.9 8.7-13.9 6.4 9.1 5.9-13.2 9.2 23.1-.9" />
                                        <path fill="#FFFFFF" stroke="#3a5e77" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M284.5 100.1c-.4 4 1.8 8.9 6.7 14.8 3.5-1.8 6.7-3.6 9.7-5.5 1.8 4.2 5.1 8.9 10.1 14.1 2.7-2.1 5.1-4.4 7.1-6.8 4.1 3.4 9 7 14.7 11 1.2-3.4 1.8-7 1.7-10.9" />
                                        <path fill="#FFFFFF" stroke="#3a5e77" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M314 66.7s5.4-5.7 12.6-7.4c1.7 2.9 3.3 5.7 4.9 8.6 3.8-2.5 9.8-4.4 18.2-5.7.1 3.1.1 6.1 0 9.2 5.5-1 12.5-1.6 20.8-1.9-1.4 3.9-2.5 8.4-2.5 8.4" />
                                    </motion.g>
                                </>
                            )}
                        </AnimatePresence>
                    </g>
                </svg>

                {/* Circular Border Overlay from original CSS */}
                <div className="absolute inset-0 border-[2.5px] border-[#217093] rounded-full pointer-events-none z-10" />
            </div>
        </div>
    );
};
