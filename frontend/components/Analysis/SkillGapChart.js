import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function SkillGapChart({ analyses }) {
  if (!analyses || analyses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No analysis data available. Upload a resume and analyze a job role to see charts.</p>
      </div>
    );
  }

  const latestAnalysis = analyses[0];
  const chartData = [
    {
      name: latestAnalysis.job_role_title,
      possessed: latestAnalysis.skills_possessed,
      missing: latestAnalysis.skills_missing,
      strong: latestAnalysis.skills_strong,
    },
  ];

  const matchData = [
    { role: latestAnalysis.job_role_title, match: latestAnalysis.match_percentage },
  ];

  return (
    <div className="space-y-8">
      {/* Match Percentage */}
      <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-lg p-6">
        <h3 className="text-2xl font-bold mb-2">Match Percentage</h3>
        <p className="text-5xl font-bold">{latestAnalysis.match_percentage}%</p>
        <p className="mt-2 opacity-90">for {latestAnalysis.job_role_title}</p>
      </div>

      {/* Skills Chart */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h3 className="text-xl font-bold mb-4">Skill Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="possessed" fill="#10B981" name="Skills Possessed" />
            <Bar dataKey="strong" fill="#4F46E5" name="Strong Skills" />
            <Bar dataKey="missing" fill="#EF4444" name="Skills Missing" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Analysis Details */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-gray-600 font-semibold">Skills Possessed</p>
          <p className="text-3xl font-bold text-green-600">{latestAnalysis.skills_possessed}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-gray-600 font-semibold">Strong Skills</p>
          <p className="text-3xl font-bold text-blue-600">{latestAnalysis.skills_strong}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-gray-600 font-semibold">Skills Missing</p>
          <p className="text-3xl font-bold text-red-600">{latestAnalysis.skills_missing}</p>
        </div>
      </div>

      {/* Learning Time Estimate */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-2">Estimated Learning Time</h3>
        <p className="text-3xl font-bold text-yellow-700">
          {Math.ceil(latestAnalysis.estimated_learning_time_days / 7)} weeks
        </p>
        <p className="text-gray-600 mt-2">
          {latestAnalysis.estimated_learning_time_days} days to acquire missing skills
        </p>
      </div>
    </div>
  );
}
