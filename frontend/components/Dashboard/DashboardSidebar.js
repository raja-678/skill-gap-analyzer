import React from 'react';
import { useRouter } from 'next/router';

export default function DashboardSidebar({ activeTab, setActiveTab }) {
  const router = useRouter();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'skills', label: 'My Skills', icon: '⭐' },
    { id: 'role-analysis', label: 'Role Analysis', icon: '🎯' },
    { id: 'learning-path', label: 'Learning Path', icon: '📚' },
    { id: 'job-fit', label: 'Job Fit', icon: '💼' },
    { id: 'chat', label: 'Career Chat', icon: '💬' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  const handleLogout = () => {
    router.push('/auth/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto fixed left-0 top-16 flex flex-col">
      <nav className="flex-1 p-4 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition flex items-center space-x-3 ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
