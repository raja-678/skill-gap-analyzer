import Link from 'next/link';
import { FiUpload, FiBarChart2, FiTarget, FiUser, FiLogOut, FiMessageCircle } from 'react-icons/fi';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/router';
import api from '@/lib/api';

export default function Sidebar({ activeTab, setActiveTab }) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Local logout should still proceed if the server session is already gone.
    }
    logout();
    router.push('/');
  };

  const menuItems = [
    { id: 'resumes', label: 'Resumes', icon: FiUpload },
    { id: 'analysis', label: 'Analysis', icon: FiBarChart2 },
    { id: 'jobs', label: 'Jobs', icon: FiTarget },
    { id: 'chat', label: 'Career Agent', icon: FiMessageCircle },
    { id: 'profile', label: 'Profile', icon: FiUser },
  ];

  return (
    <aside className="w-64 bg-dark text-white p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">SkillGap</h1>
      </div>

      <nav className="space-y-2 mb-8">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                activeTab === item.id
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Icon className="text-xl" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-2 text-gray-300 hover:text-white rounded-lg transition"
      >
        <FiLogOut className="text-xl" />
        <span>Logout</span>
      </button>
    </aside>
  );
}
