import { useState } from 'react';
import { FiFileText, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function JobDescriptionAnalyzer() {
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (jobDescription.trim().length < 40) {
      toast.error('Paste a fuller job description');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/career/job-description/analyze', { jobDescription });
      setAnalysis(response.data.analysis);
      toast.success('Job description analyzed');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to analyze job description');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4 flex items-center gap-3">
        <FiFileText className="text-2xl text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Job Description Analyzer</h2>
          <p className="text-sm text-gray-500">Paste a real job post and compare it against your profile.</p>
        </div>
      </div>

      <textarea
        value={jobDescription}
        onChange={(event) => setJobDescription(event.target.value)}
        className="input-field min-h-[160px] resize-y"
        placeholder="Paste the job description here..."
      />

      <button
        onClick={analyze}
        disabled={loading}
        className="btn-primary mt-4 flex items-center gap-2 disabled:opacity-60"
      >
        <FiSearch />
        {loading ? 'Analyzing...' : 'Analyze Job Fit'}
      </button>

      {analysis && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg bg-gray-900 p-4 text-white">
            <p className="text-sm opacity-80">Resume Match</p>
            <p className="text-4xl font-bold">{analysis.matchPercentage}%</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-700">ATS Score</p>
            <p className="text-4xl font-bold text-blue-900">{analysis.atsScore}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-700">Missing Skills</p>
            <p className="text-4xl font-bold text-red-900">{analysis.missingSkills.length}</p>
          </div>

          <div className="lg:col-span-3 grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-2 font-bold">Matched Skills</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.matchedSkills.length ? analysis.matchedSkills.map((skill) => (
                  <span key={skill.name} className="rounded-lg bg-green-100 px-3 py-1 text-sm text-green-800">
                    {skill.name}
                  </span>
                )) : <p className="text-sm text-gray-500">No direct matches found.</p>}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-2 font-bold">Missing Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.missingSkills.length ? analysis.missingSkills.slice(0, 12).map((skill) => (
                  <span key={skill.name} className="rounded-lg bg-red-100 px-3 py-1 text-sm text-red-800">
                    {skill.name}
                  </span>
                )) : <p className="text-sm text-gray-500">No missing keywords detected.</p>}
              </div>
            </section>
          </div>

          <div className="lg:col-span-3 rounded-lg border border-gray-200 p-4">
            <h3 className="mb-2 font-bold">Next Actions</h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
              {analysis.nextActions.map((action) => <li key={action}>{action}</li>)}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
