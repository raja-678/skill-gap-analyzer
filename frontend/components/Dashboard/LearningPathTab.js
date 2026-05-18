import React, { useState, useEffect } from 'react';

export default function LearningPathTab() {
  const [learningPath, setLearningPath] = useState([
    {
      id: 1,
      skill: 'TypeScript Basics',
      duration: '2 weeks',
      status: 'not-started',
      resources: 3,
      difficulty: 'Medium',
    },
    {
      id: 2,
      skill: 'Advanced TypeScript',
      duration: '3 weeks',
      status: 'not-started',
      resources: 5,
      difficulty: 'Hard',
      prerequisite: 1,
    },
    {
      id: 3,
      skill: 'React Hooks Deep Dive',
      duration: '2 weeks',
      status: 'not-started',
      resources: 4,
      difficulty: 'Medium',
      prerequisite: 1,
    },
    {
      id: 4,
      skill: 'Node.js Advanced Patterns',
      duration: '3 weeks',
      status: 'not-started',
      resources: 6,
      difficulty: 'Hard',
      prerequisite: 1,
    },
    {
      id: 5,
      skill: 'Docker & DevOps',
      duration: '4 weeks',
      status: 'not-started',
      resources: 8,
      difficulty: 'Hard',
      prerequisite: 4,
    },
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'not-started':
        return 'bg-gray-300';
      default:
        return 'bg-gray-300';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-700';
      case 'Medium':
        return 'bg-orange-100 text-orange-700';
      case 'Hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const startLearning = (id) => {
    setLearningPath(learningPath.map(item =>
      item.id === id ? { ...item, status: 'in-progress' } : item
    ));
  };

  const completeLearning = (id) => {
    setLearningPath(learningPath.map(item =>
      item.id === id ? { ...item, status: 'completed' } : item
    ));
  };

  return (
    <div className="space-y-8">
      {/* Timeline Overview */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">Your Learning Timeline</h2>
        <p className="text-gray-600 mb-8">
          Recommended skill acquisition path (~{learningPath.reduce((acc, p) => acc + parseInt(p.duration), 0)} weeks total)
        </p>

        {/* Horizontal Timeline */}
        <div className="overflow-x-auto pb-8">
          <div className="flex space-x-4 min-w-max">
            {learningPath.map((item, idx) => (
              <div key={item.id} className="flex flex-col items-center">
                {/* Timeline Node */}
                <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-white mb-4 ${getStatusColor(item.status)} cursor-pointer hover:shadow-lg transition`}>
                  {item.status === 'completed' && '✓'}
                  {item.status === 'in-progress' && '▶'}
                  {item.status === 'not-started' && idx + 1}
                </div>

                {/* Node Details */}
                <div className="bg-gray-50 rounded-lg p-4 w-48 text-center">
                  <p className="font-bold text-gray-800 mb-2">{item.skill}</p>
                  <p className="text-xs text-gray-600 mb-3">{item.duration}</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-3 ${getDifficultyColor(item.difficulty)}`}>
                    {item.difficulty}
                  </span>
                  <p className="text-xs text-gray-500 mb-3">{item.resources} resources</p>

                  {/* Action Buttons */}
                  {item.status === 'not-started' && (
                    <button
                      onClick={() => startLearning(item.id)}
                      className="w-full px-2 py-1 bg-blue-500 text-white rounded text-xs font-semibold hover:bg-blue-600 transition"
                    >
                      Start
                    </button>
                  )}
                  {item.status === 'in-progress' && (
                    <button
                      onClick={() => completeLearning(item.id)}
                      className="w-full px-2 py-1 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600 transition"
                    >
                      Complete
                    </button>
                  )}
                  {item.status === 'completed' && (
                    <span className="text-xs text-green-600 font-semibold">✓ Completed</span>
                  )}
                </div>

                {/* Connection Line (not last item) */}
                {idx < learningPath.length - 1 && (
                  <div className="absolute left-1/2 transform translate-x-1/2 w-0.5 h-12 bg-gray-300 -mb-12 -mr-2"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Skill List */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">Learning Details</h2>
        <div className="space-y-4">
          {learningPath.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{item.skill}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(item.difficulty)}`}>
                      {item.difficulty}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'completed' ? 'bg-green-100 text-green-700' :
                      item.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.status === 'completed' ? '✓ Completed' :
                       item.status === 'in-progress' ? 'In Progress' :
                       'Not Started'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span>⏱️ {item.duration}</span>
                    <span>📚 {item.resources} resources</span>
                    {item.prerequisite && (
                      <span>🔗 Requires: Skill #{item.prerequisite}</span>
                    )}
                  </div>
                </div>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition">
                  View Resources
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
