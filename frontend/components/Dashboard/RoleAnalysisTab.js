import React, { useState, useEffect } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import ProgressChart from '@/components/Analysis/ProgressChart';

export default function RoleAnalysisTab({ analyses }) {
  const [radarData, setRadarData] = useState([]);
  const [skillBreakdown, setSkillBreakdown] = useState([]);
  const [trendingSkills, setTrendingSkills] = useState([]);
  const [progressSnapshots, setProgressSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);
  const [jobRoles, setJobRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [activeTargetRoleId, setActiveTargetRoleId] = useState(analyses?.[0]?.job_role_id || '');
  const [savingTargetRole, setSavingTargetRole] = useState(false);

  useEffect(() => {
    fetchJobRoles();
  }, []);

  useEffect(() => {
    const initialTargetRoleId = analyses?.[0]?.job_role_id;
    if (initialTargetRoleId) {
      setActiveTargetRoleId(initialTargetRoleId);
    }
  }, [analyses]);

  useEffect(() => {
    if (activeTargetRoleId) {
      fetchRoleAnalysis();
      fetchProgress(activeTargetRoleId);
    }
  }, [activeTargetRoleId]);

  const fetchJobRoles = async () => {
    try {
      const response = await api.get('/jobs?limit=50');
      setJobRoles(response.data.jobs || []);
    } catch (error) {
      console.error('Failed to load available job roles:', error);
    }
  };

  const handleSetTargetRole = async () => {
    if (!selectedRoleId) {
      toast.error('Select a role before saving');
      return;
    }

    try {
      setSavingTargetRole(true);
      await api.put('/users/profile', { target_role_id: selectedRoleId });
      setActiveTargetRoleId(selectedRoleId);
      toast.success('Target role saved. Your gap analysis is loading.');
      fetchRoleAnalysis();
      fetchProgress(selectedRoleId);
    } catch (error) {
      toast.error('Failed to save target role');
    } finally {
      setSavingTargetRole(false);
    }
  };

  const fetchRoleAnalysis = async () => {
    try {
      setLoading(true);
      // Mock data for radar chart - in production this would come from API
      const mockRadarData = [
        { skill: 'Frontend', possess: 4, required: 5 },
        { skill: 'Backend', possess: 3, required: 5 },
        { skill: 'DevOps', possess: 2, required: 4 },
        { skill: 'Database', possess: 3, required: 4 },
        { skill: 'Testing', possess: 2, required: 4 },
      ];
      setRadarData(mockRadarData);

      // Mock skill breakdown
      const mockBreakdown = [
        { skill: 'React', category: 'Frontend', possessed: 5, required: 5, match: '100%', status: '✅ Ready' },
        { skill: 'Node.js', category: 'Backend', possessed: 4, required: 5, match: '80%', status: '⚠️ Learning' },
        { skill: 'TypeScript', category: 'Frontend', possessed: 2, required: 5, match: '40%', status: '🔴 Priority' },
        { skill: 'Docker', category: 'DevOps', possessed: 1, required: 4, match: '25%', status: '🔴 Priority' },
        { skill: 'PostgreSQL', category: 'Database', possessed: 3, required: 4, match: '75%', status: '⚠️ Learning' },
      ];
      setSkillBreakdown(mockBreakdown);

      // Mock trending skills
      const mockTrending = [
        { name: 'TypeScript', trend: 'rising', mentions: '+45%', color: 'bg-red-100' },
        { name: 'React Hooks', trend: 'rising', mentions: '+32%', color: 'bg-orange-100' },
        { name: 'GraphQL', trend: 'stable', mentions: '+8%', color: 'bg-blue-100' },
      ];
      setTrendingSkills(mockTrending);
    } catch (error) {
      console.error('Failed to fetch role analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async (jobRoleId) => {
    try {
      setProgressLoading(true);
      const response = await api.get(`/analysis/progress/${jobRoleId}`);
      setProgressSnapshots(response.data.progress || []);
    } catch (error) {
      console.error('Failed to fetch readiness progress:', error);
      setProgressSnapshots([]);
    } finally {
      setProgressLoading(false);
    }
  };

  if (loading && !activeTargetRoleId) {
    return <div className="text-center py-8 text-gray-500">Loading analysis...</div>;
  }

  if (!activeTargetRoleId) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-4">Set a target role to see your skill gap analysis</h2>
        <p className="text-gray-600 mb-6">
          Choose the job role you'd like to benchmark your skills against.
        </p>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a role</option>
            {jobRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.title}
              </option>
            ))}
          </select>
          <button
            onClick={handleSetTargetRole}
            disabled={!selectedRoleId || savingTargetRole}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300"
          >
            {savingTargetRole ? 'Saving...' : 'Save target role'}
          </button>
        </div>

        {!jobRoles.length && (
          <p className="mt-4 text-gray-500">Loading roles... Please wait.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Chart */}
      <div className="bg-white rounded-lg shadow p-8">
        {progressLoading ? (
          <div className="text-center py-10 text-gray-500">Loading progress chart...</div>
        ) : (
          <ProgressChart snapshots={progressSnapshots} />
        )}
      </div>

      {/* Radar Chart */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">Skill Level Comparison</h2>
        <p className="text-gray-600 mb-6">Your proficiency vs. role requirements</p>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="skill" />
            <PolarRadiusAxis angle={90} domain={[0, 5]} />
            <Radar name="Your Level" dataKey="possess" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            <Radar name="Required Level" dataKey="required" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Skill Breakdown Table */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">Skill-by-Skill Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-6 py-3 font-bold text-gray-700">Skill</th>
                <th className="px-6 py-3 font-bold text-gray-700">Category</th>
                <th className="px-6 py-3 font-bold text-gray-700">Your Level</th>
                <th className="px-6 py-3 font-bold text-gray-700">Required</th>
                <th className="px-6 py-3 font-bold text-gray-700">Match</th>
                <th className="px-6 py-3 font-bold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {skillBreakdown.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-gray-800">{item.skill}</td>
                  <td className="px-6 py-4 text-gray-600">{item.category}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < item.possessed ? '⭐' : '☆'} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < item.required ? '⭐' : '☆'} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${
                      parseInt(item.match) >= 80 ? 'text-green-600' :
                      parseInt(item.match) >= 50 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {item.match}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trending Badges */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">Trending in {new Date().getFullYear()}</h2>
        <p className="text-gray-600 mb-6">Skills growing in demand for this role</p>
        <div className="flex flex-wrap gap-4">
          {trendingSkills.map((skill, idx) => (
            <div key={idx} className={`${skill.color} rounded-full px-6 py-3 font-medium text-gray-800 flex items-center space-x-2`}>
              <span>{skill.name}</span>
              <span className="text-sm font-bold text-green-600">{skill.mentions}</span>
              {skill.trend === 'rising' && <span className="text-lg">📈</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
