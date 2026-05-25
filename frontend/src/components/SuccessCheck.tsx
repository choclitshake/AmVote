// Animated SVG checkmark — used on post-register, post-vote success states
interface SuccessCheckProps {
  size?: number;
  className?: string;
}

export function SuccessCheck({ size = 56, className = '' }: SuccessCheckProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        aria-hidden="true"
      >
        {/* Outer ring */}
        <circle cx="28" cy="28" r="27" stroke="rgba(16,185,129,0.25)" strokeWidth="1.5" />
        {/* Inner fill */}
        <circle cx="28" cy="28" r="24" fill="rgba(16,185,129,0.12)" />
        {/* Animated check */}
        <path
          d="M18 28l7 7 13-14"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="40"
          strokeDashoffset="40"
          style={{
            animation: 'checkDraw 0.5s 0.1s ease-out forwards',
          }}
        />
      </svg>
      <style>{`
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
