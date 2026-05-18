import React from 'react';
import { useAnalysisStore } from '@/lib/store';

export default function PersistentHeader() {
  const { targetRole, targetRolePercentage } = useAnalysisStore();

  if (!targetRole) {
    return null;
  }

  // Calculate weeks to go based on match percentage
  const weeksToGo = Math.max(1, Math.ceil((100 - targetRolePercentage) / 15));

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 shadow-lg sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div>
            <p className="text-sm font-medium text-blue-100">Your Target Role</p>
            <p className="text-lg font-bold">{targetRole.title}</p>
          </div>
          <div className="border-l border-blue-400 pl-6">
            <p className="text-sm font-medium text-blue-100">Match Percentage</p>
            <p className="text-lg font-bold">{targetRolePercentage}% Ready</p>
          </div>
          <div className="border-l border-blue-400 pl-6">
            <p className="text-sm font-medium text-blue-100">Timeline</p>
            <p className="text-lg font-bold">~{weeksToGo} weeks to go</p>
          </div>
        </div>
        <button
          className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
          onClick={() => {
            // Open role selector modal
            window.dispatchEvent(new CustomEvent('openRoleSelector'));
          }}
        >
          Change Role
        </button>
      </div>
    </div>
  );
}
