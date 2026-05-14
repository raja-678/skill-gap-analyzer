import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuthStore, useAnalysisStore } from '@/lib/store';
import api from '@/lib/api';
import PersistentHeader from '@/components/Dashboard/PersistentHeader';
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar';
import OverviewTab from '@/components/Dashboard/OverviewTab';
import MySkillsTab from '@/components/Dashboard/MySkillsTab';
import RoleAnalysisTab from '@/components/Dashboard/RoleAnalysisTab';
import LearningPathTab from '@/components/Dashboard/LearningPathTab';
import JobFitTab from '@/components/Dashboard/JobFitTab';
import CareerChat from '@/components/Chat/CareerChat';
import ProfileTab from '@/components/Dashboard/ProfileTab';
import toast, { Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { setTargetRole, setTargetRolePercentage } = useAnalysisStore();
  const [resumes, setResumes] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [careerSnapshot, setCareerSnapshot] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [targetRole, setLocalTargetRole] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchData();
    loadTargetRole();
  }, [user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resumesRes, analysesRes, jobsRes, snapshotRes] = await Promise.all([
        api.get('/resumes'),
        api.get('/analysis/history'),
        api.get('/jobs?limit=10'),
        api.get('/career/snapshot'),
      ]);

      setResumes(resumesRes.data.resumes || []);
      setAnalyses(analysesRes.data.analyses || []);
      setJobs(jobsRes.data.jobs || []);
      setCareerSnapshot(snapshotRes.data.snapshot || null);

      // Calculate target role percentage from analyses
      if (analysesRes.data.analyses?.length > 0) {
        const avgMatch = analysesRes.data.analyses.reduce((sum, a) => sum + (a.match_percentage || 0), 0) / analysesRes.data.analyses.length;
        setTargetRolePercentage(Math.round(avgMatch));
      }
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadTargetRole = async () => {
    try {
      const response = await api.get('/users/profile');
      if (response.data.user?.target_role_id) {
        // Fetch the role details
        const rolesRes = await api.get(`/jobs/${response.data.user.target_role_id}`);
        if (rolesRes.data) {
          setLocalTargetRole(rolesRes.data);
          setTargetRole(rolesRes.data);
        }
      }
    } catch (error) {
      console.error('Failed to load target role:', error);
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <>
      <Head>
        <title>Dashboard - Skill Gap Analyzer</title>
      </Head>
      <Toaster />

      <PersistentHeader />

      <div className="flex min-h-screen bg-gray-50" style={{ marginTop: '80px' }}>
        <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8" style={{ marginLeft: '256px' }}>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <OverviewTab careerSnapshot={careerSnapshot} resumes={resumes} analyses={analyses} />
              )}

              {/* My Skills Tab */}
              {activeTab === 'skills' && (
                <MySkillsTab />
              )}

              {/* Role Analysis Tab */}
              {activeTab === 'role-analysis' && (
                <RoleAnalysisTab analyses={analyses} />
              )}

              {/* Learning Path Tab */}
              {activeTab === 'learning-path' && (
                <LearningPathTab />
              )}

              {/* Job Fit Tab */}
              {activeTab === 'job-fit' && (
                <JobFitTab jobs={jobs} onCompare={fetchData} />
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <CareerChat />
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <ProfileTab />
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
