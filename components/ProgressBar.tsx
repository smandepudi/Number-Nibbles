import React from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  // Scale from a small speck (0.1) to a full cookie (1.0) as progress goes from 0 to 100
  const scale = 0.1 + (clampedProgress / 100) * 0.9;

  return (
    <div className="flex flex-col items-center justify-center h-28" aria-live="polite">
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        aria-label={`Download progress: ${clampedProgress}%`}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <g
          transform={`translate(50 50) scale(${scale}) translate(-50 -50)`}
          className="transition-transform duration-300 ease-out"
        >
          <circle cx="50" cy="50" r="48" fill="#D2A679" stroke="#A07E5C" strokeWidth="2" />
          {/* Chocolate Chips */}
          <circle cx="35" cy="35" r="5" fill="#4F2E2B" />
          <circle cx="65" cy="60" r="7" fill="#4F2E2B" />
          <circle cx="40" cy="70" r="4" fill="#4F2E2B" />
          <circle cx="70" cy="30" r="6" fill="#4F2E2B" />
          <circle cx="25" cy="55" r="4" fill="#4F2E2B" />
        </g>
      </svg>
    </div>
  );
};

export default ProgressBar;