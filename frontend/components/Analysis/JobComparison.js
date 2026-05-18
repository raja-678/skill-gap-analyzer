import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function JobComparison({ jobs, onCompare }) {
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [comparing, setComparing] = useState(false);
  const [results, setResults] = useState(null);

  const handleJobSelect = (jobId) => {
    setSelectedJobs((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleCompare = async () => {
    if (selectedJobs.length === 0) {
      toast.error('Please select at least one job role');
      return;
    }

    try {
      setComparing(true);
      const response = await api.post('/analysis/compare-roles', {
        jobRoleIds: selectedJobs,
      });

      setResults(response.data.comparisons);
      toast.success('Comparison completed!');
    } catch (error) {
      toast.error('Failed to compare roles');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Selection */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Compare Job Roles</h2>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`p-4 border rounded-lg cursor-pointer transition ${
                selectedJobs.includes(job.id)
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-200 hover:border-primary'
              }`}
              onClick={() => handleJobSelect(job.id)}
            >
              <input
                type="checkbox"
                checked={selectedJobs.includes(job.id)}
                onChange={() => handleJobSelect(job.id)}
                className="mr-3"
              />
              <span className="font-semibold">{job.title}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleCompare}
          disabled={comparing}
          className="btn-primary disabled:opacity-50"
        >
          {comparing ? 'Comparing...' : 'Compare Selected Roles'}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">Comparison Results</h2>

          <div className="space-y-4">
            {results
              .sort((a, b) => b.matchPercentage - a.matchPercentage)
              .map((result, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{result.jobRoleId}</h3>
                      <p className="text-gray-600">{result.matchPercentage}% match</p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl">
                      {result.matchPercentage}%
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Possessed</p>
                      <p className="font-bold text-lg">{result.skillsPossessed}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Missing</p>
                      <p className="font-bold text-lg text-red-600">{result.skillsMissing}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Learning Time</p>
                      <p className="font-bold text-lg">
                        {Math.ceil(result.estimatedLearningTimeDays / 7)}w
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
