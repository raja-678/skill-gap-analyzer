import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiX, FiPlus, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function SkillVerification({ skills, onConfirm }) {
  const [verifiedSkills, setVerifiedSkills] = useState([]);
  const [removedSkillIds, setRemovedSkillIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize with extracted skills
    setVerifiedSkills(skills.map(skill => ({
      ...skill,
      proficiencyLevel: skill.proficiency || skill.computedProficiency || 5,
      yearsOfExperience: skill.yearsOfExperience || skill.years_experience || 0,
      confirmed: true
    })));
  }, [skills]);

  const handleProficiencyChange = (skillId, proficiency) => {
    setVerifiedSkills(prev =>
      prev.map(skill =>
        skill.id === skillId ? { ...skill, proficiencyLevel: proficiency } : skill
      )
    );
  };

  const handleExperienceChange = (skillId, years) => {
    setVerifiedSkills(prev =>
      prev.map(skill =>
        skill.id === skillId ? { ...skill, yearsOfExperience: years } : skill
      )
    );
  };

  const removeSkill = (skillId) => {
    setVerifiedSkills(prev => prev.filter(skill => skill.id !== skillId));
    setRemovedSkillIds(prev => [...prev, skillId]);
  };

  const searchSkills = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/skills/search/${encodeURIComponent(query)}`);
      setSearchResults(response.data.skills || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const addSkill = (skill) => {
    // Check if skill already exists
    if (verifiedSkills.some(s => s.id === skill.id)) {
      toast.error('Skill already added');
      return;
    }

    setVerifiedSkills(prev => [...prev, {
      ...skill,
      proficiencyLevel: 5,
      yearsOfExperience: 0,
      confirmed: true
    }]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
    toast.success('Skill added');
  };

  const router = useRouter();

  const handleConfirm = async () => {
    try {
      setLoading(true);

      const response = await api.put('/users/skills/bulk-update', {
        skills: verifiedSkills.map(skill => ({
          skillId: skill.id,
          proficiencyLevel: skill.proficiencyLevel,
          yearsOfExperience: skill.yearsOfExperience
        })),
        removedSkillIds
      });

      toast.success(`Skills updated: ${response.data.updated} added, ${response.data.removed} removed`);

      try {
        await api.get('/career/snapshot');
        toast.success("Your skills are saved! Here's your career analysis.");
      } catch (snapshotError) {
        toast.success('Skills saved! Your analysis will appear shortly.');
      }

      if (onConfirm) {
        onConfirm(verifiedSkills);
      }

      router.push('/dashboard?tab=overview');
    } catch (error) {
      toast.error('Failed to update skills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSkills(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Analyzing your career readiness...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Verify Your Skills</h2>
        <p className="text-gray-600">Review and adjust the skills extracted from your resume</p>
      </div>

      {/* Skills List */}
      <div className="space-y-4">
        {verifiedSkills.map((skill) => (
          <div key={skill.id} className={`border rounded-lg p-6 ${skill.confidence < 0.6 ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold">{skill.name}</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {skill.category}
                  </span>
                  {skill.confidence < 0.6 && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      ⚠️ Low Confidence
                    </span>
                  )}
                </div>
                {skill.evidence && (
                  <div className="bg-gray-50 rounded p-3 mb-4">
                    <p className="text-sm text-gray-700 italic">
                      "{skill.evidence}"
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => removeSkill(skill.id)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proficiency Level (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={skill.proficiencyLevel}
                  onChange={(e) => handleProficiencyChange(skill.id, parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Beginner</span>
                  <span className="font-semibold text-lg">{skill.proficiencyLevel}</span>
                  <span>Expert</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <select
                  value={skill.yearsOfExperience}
                  onChange={(e) => handleExperienceChange(skill.id, parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Less than 1 year</option>
                  <option value={1}>1 year</option>
                  <option value={2}>2 years</option>
                  <option value={3}>3 years</option>
                  <option value={4}>4 years</option>
                  <option value={5}>5+ years</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Skill Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        {!showSearch ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">Missing a skill? Add it manually</p>
            <button
              onClick={() => setShowSearch(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center space-x-2 mx-auto"
            >
              <FiPlus className="w-5 h-5" />
              <span>Add Skill</span>
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <FiSearch className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for a skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => addSkill(skill)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <div className="font-medium">{skill.name}</div>
                    <div className="text-sm text-gray-500">{skill.category}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Button */}
      <div className="text-center">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
        >
          {loading ? 'Updating Skills...' : `Confirm Skills (${verifiedSkills.length})`}
        </button>
      </div>
    </div>
  );
}
