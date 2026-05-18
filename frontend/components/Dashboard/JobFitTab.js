import React from 'react';
import JobComparison from '@/components/Analysis/JobComparison';

export default function JobFitTab({ jobs, onCompare }) {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">Job Fit Analysis</h2>
        <p className="text-gray-600 mb-6">See how well you match different job opportunities</p>
      </div>
      <JobComparison jobs={jobs} onCompare={onCompare} />
    </div>
  );
}
