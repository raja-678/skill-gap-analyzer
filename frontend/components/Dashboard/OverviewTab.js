import React, { useState, useEffect } from 'react';
import { useAnalysisStore } from '@/lib/store';
import ResumeUpload from '@/components/Resume/ResumeUpload';

export default function OverviewTab({ careerSnapshot, resumes, analyses }) {
  const { targetRolePercentage } = useAnalysisStore();
  const [journeySteps, setJourneySteps] = useState([
    { id: 1, label: 'Resume uploaded', completed: !!resumes?.length },
    { id: 2, label: 'Skills extracted', completed: !!resumes?.length },
    { id: 3, label: 'Target set', completed: !!analyses?.length },
    { id: 4, label: 'Gap analyzed', completed: !!analyses?.length },
    { id: 5, label: 'Ready', completed: targetRolePercentage >= 80 },
  ]);

  const completedSteps = journeySteps.filter(s => s.completed).length;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (targetRolePercentage / 100) * circumference;
  const hasResumes = resumes?.length > 0;
  const hasAnalyses = analyses?.length > 0;

  // Mock this week's focus skills (top 2)
  const thisWeekSkills = [
    { name: 'React Hooks', priority: 'high', days: 3 },
    { name: 'TypeScript', priority: 'high', days: 5 },
  ];

  if (!hasAnalyses) {
    return (
      <div className="space-y-8">
        {!hasResumes && (
          <div className="mb-8 p-6 border-2 border-dashed border-blue-300 rounded-lg text-center bg-blue-50">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              Start by uploading your resume
            </h3>
            <p className="text-blue-600 mb-4">
              We'll extract your skills and analyze your career readiness
            </p>
            <ResumeUpload onUploadSuccess={() => window.location.reload()} />
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Upload your resume to see your career readiness</h2>
          <p className="text-gray-600 mb-6">
            Once we extract your skills, your career snapshot and readiness score will appear here.
          </p>
          <ResumeUpload onUploadSuccess={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {resumes.length === 0 && (
        <div className="mb-8 p-6 border-2 border-dashed border-blue-300 rounded-lg text-center bg-blue-50">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Start by uploading your resume
          </h3>
          <p className="text-blue-600 mb-4">
            We'll extract your skills and analyze your career readiness
          </p>
          <ResumeUpload onUploadSuccess={() => window.location.reload()} />
        </div>
      )}

      {/* Progress Ring */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-8 text-center">Your Readiness</h2>
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32">
            <svg width="140" height="140" className="transform -rotate-90">
              <circle
                cx="70"
                cy="70"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="70"
                cy="70"
                r="45"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{targetRolePercentage}%</p>
                <p className="text-xs text-gray-500">Ready</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-gray-600">
          {completedSteps} of {journeySteps.length} journey steps completed
        </p>
      </div>

      {/* Journey Checklist */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">Your Journey</h2>
        <div className="space-y-4">
          {journeySteps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                step.completed ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                {step.completed ? '✓' : index + 1}
              </div>
              <p className={`text-lg ${step.completed ? 'text-gray-600 line-through' : 'text-gray-700 font-medium'}`}>
                {step.label}
              </p>
              {step.completed && <span className="text-xs text-green-600 font-semibold ml-auto">Done</span>}
            </div>
          ))}
        </div>
      </div>

      {/* This Week's Focus */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">This Week's Focus</h2>
        <p className="text-gray-600 mb-6">Top 2 skills to work on this week</p>
        <div className="grid md:grid-cols-2 gap-6">
          {thisWeekSkills.map((skill, idx) => (
            <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="font-bold text-lg text-gray-800">{skill.name}</p>
              <p className={`text-sm font-medium ${skill.priority === 'high' ? 'text-red-600' : 'text-orange-600'}`}>
                {skill.priority === 'high' ? '🔴 High Priority' : '🟡 Medium Priority'}
              </p>
              <p className="text-xs text-gray-500 mt-2">Estimated: {skill.days} days</p>
            </div>
          ))}
        </div>
      </div>

      {/* Career Snapshot Cards */}
      {careerSnapshot && (
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-6">Career Snapshot</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {careerSnapshot.topRoles?.slice(0, 2).map((role, idx) => (
              <div key={idx} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <p className="text-lg font-bold text-blue-900">{role.title}</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Match</span>
                    <span className="text-lg font-bold text-blue-600">{role.matchPercentage}%</span>
                  </div>
                  {role.salaryRange && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Salary Range</span>
                      <span className="text-sm font-semibold text-green-600">
                        ${(role.salaryRange.min / 1000).toFixed(0)}K - ${(role.salaryRange.max / 1000).toFixed(0)}K
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
