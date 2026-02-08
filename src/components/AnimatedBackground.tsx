import { ReactNode } from "react";

interface Props {
    children: ReactNode;
}

export default function AnimatedBackground({ children }: Props) {
    return (
        <div className="relative w-full">
            {/* Moving mesh background */}
            <div className="w-full">
                {/* Dynamic Mesh Layer */}
                <div className="mesh-bg opacity-30 dark:opacity-60" />
                <div className="relative z-10">
                    {children}
                </div>
            </div>
        </div>
    );
}
