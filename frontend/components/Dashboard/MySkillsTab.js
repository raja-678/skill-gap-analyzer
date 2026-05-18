import React from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { FaGithub } from 'react-icons/fa';

export default function MySkillsTab() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const response = await api.get('/users/profile');
      const fetchedSkills = response.data.user?.skills || response.data.skills || [];
      setSkills(fetchedSkills);
    } catch (error) {
      console.error('Failed to fetch skills:', error);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSkill = (skillId) => {
    setSkills((prev) => prev.filter((skill) => skill.id !== skillId));
    toast.success('Skill removed');
  };

  const handleEditSkill = (skillName) => {
    toast('Editing skills is coming soon!', { icon: '✏️' });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading skills...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold mb-6">My Skills</h2>
      <p className="text-gray-600 mb-6">Manage and update your skill profile</p>
      
      {skills.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Upload your resume or add skills manually to get started.</p>
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            Add Skills Manually
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {skills.map((skill, idx) => (
            <div key={idx} className="flex flex-col md:flex-row items-start md:items-center justify-between border rounded-lg p-4 gap-4">
              <div>
                <p className="font-bold text-gray-900">{skill.name} {skill.source === 'github' && <FaGithub className="inline ml-2 text-gray-600" />}</p>
                <p className="text-sm text-gray-500">{skill.category || 'General skill'}</p>
                {skill.proficiencyLevel != null && (
                  <p className="text-sm text-gray-600 mt-1">Proficiency: {skill.proficiencyLevel}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEditSkill(skill.name)}
                  className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-medium hover:bg-yellow-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleRemoveSkill(skill.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
