import React from 'react';

export default function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`animate-pulse bg-white rounded-lg shadow p-6 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded mb-3" style={{ width: `${80 - i * 10}%` }} />
      ))}
    </div>
  );
}
