interface VigilLogoProps {
    /** Height of the logo text in px (default 22) */
    height?: number;
    /** Fill colour (default #E8EAED — near-white on dark bg) */
    color?: string;
    className?: string;
}

/**
 * Inline SVG wordmark using the JOST — ARCHITECTURAL ALT style
 * from the type-specimen: uppercase, weight 600, letter-spacing 0.15em.
 */
export default function VigilLogo({
    height = 22,
    color = '#E8EAED',
    className = '',
}: VigilLogoProps) {
    const fontSize = height * 1.4;
    const letterSpacing = fontSize * 0.15;
    const estimatedWidth = fontSize * 3.6;

    return (
        <svg
            viewBox={`0 0 ${estimatedWidth} ${height * 1.3}`}
            height={height}
            width={estimatedWidth}
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Vigil"
            role="img"
            className={className}
            style={{ overflow: 'visible' }}
        >
            <defs>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Jost:wght@600&display=swap');`}</style>
            </defs>
            <text
                x={estimatedWidth / 2}
                y={height}
                textAnchor="middle"
                fontFamily="'Jost', sans-serif"
                fontWeight={600}
                fontSize={fontSize}
                letterSpacing={letterSpacing}
                fill={color}
                style={{ textTransform: 'uppercase' }}
            >
                VIGIL<tspan fill="#f2a93b">.</tspan>
            </text>
        </svg>
    );
}
