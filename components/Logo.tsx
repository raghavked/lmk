import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 32 }) => {
  return (
    <div className={`relative flex items-center justify-center text-coral ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Phone Frame */}
        <rect
          x="20"
          y="10"
          width="60"
          height="80"
          rx="10"
          stroke="currentColor"
          strokeWidth="6"
          
        />
        {/* Phone Notch */}
        <path
          d="M40 10H60V14C60 16.2091 58.2091 18 56 18H44C41.7909 18 40 16.2091 40 14V10Z"
          fill="currentColor"
          
        />
        {/* Map Pin */}
        <path
          d="M50 70C50 70 30 52 30 38C30 26.9543 38.9543 18 50 18C61.0457 18 70 26.9543 70 38C70 52 50 70 50 70Z"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          
        />
        {/* Target Circle in Pin */}
        <circle
          cx="50"
          cy="38"
          r="8"
          stroke="currentColor"
          strokeWidth="3"
          
        />
        {/* Target Crosshair */}
        <line x1="50" y1="33" x2="50" y2="43" stroke="currentColor" strokeWidth="2" />
        <line x1="45" y1="38" x2="55" y2="38" stroke="currentColor" strokeWidth="2" />
        {/* Shadow/Base at bottom */}
        <ellipse
          cx="50"
          cy="78"
          rx="12"
          ry="4"
          stroke="currentColor"
          strokeWidth="3"
          
        />
      </svg>
    </div>
  );
};

export default Logo;
