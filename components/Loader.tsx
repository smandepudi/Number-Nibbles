import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex justify-center items-center p-8">
      <svg
        className="animate-spin h-16 w-16"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Loading problems..."
        role="status"
      >
        <circle cx="50" cy="50" r="48" fill="#D2A679" stroke="#A07E5C" strokeWidth="2" />
        {/* Chocolate Chips */}
        <circle cx="35" cy="35" r="5" fill="#4F2E2B" />
        <circle cx="65" cy="60" r="7" fill="#4F2E2B" />
        <circle cx="40" cy="70" r="4" fill="#4F2E2B" />
        <circle cx="70" cy="30" r="6" fill="#4F2E2B" />
        <circle cx="25" cy="55" r="4" fill="#4F2E2B" />
      </svg>
    </div>
  );
};

export default Loader;
