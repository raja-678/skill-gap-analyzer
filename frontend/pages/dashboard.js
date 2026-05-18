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
import ErrorBoundary from '@/components/common/ErrorBoundary';
import SkeletonCard from '@/components/common/SkeletonCard';
import toast, { Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore((state) => ({
    user: state.user,
    isLoading: state.isLoading
  }));
  const { setTargetRole, setTargetRolePercentage } = useAnalysisStore();
  const [resumes, setResumes] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [careerSnapshot, setCareerSnapshot] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [targetRole, setLocalTargetRole] = useState(null);
  const [welcomeBanner, setWelcomeBanner] = useState(false);
  const [queryRefreshRequested, setQueryRefreshRequested] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    const { tab, welcome } = router.query;
    if (typeof tab === 'string') {
      setActiveTab(tab);
      if (tab === 'overview') {
        setQueryRefreshRequested(true);
      }
    }

    if (welcome === 'true') {
      setWelcomeBanner(true);
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (!isLoading && user) {
      fetchData();
      loadTargetRole();
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!isLoading && user && queryRefreshRequested) {
      fetchData();
      setQueryRefreshRequested(false);
    }
  }, [isLoading, user, queryRefreshRequested]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Dashboard - Skill Gap Analyzer</title>
      </Head>
      <Toaster />

      {welcomeBanner && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5 text-green-900">
          <p className="text-lg font-semibold">Your resume has been analyzed! Here's your career readiness snapshot.</p>
        </div>
      )}

      <PersistentHeader />

      <div className="flex min-h-screen bg-gray-50" style={{ marginTop: '80px' }}>
        <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-8" style={{ marginLeft: '256px' }}>
          {loading ? (
            <div className="grid grid-cols-1 gap-6">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <ErrorBoundary>
                  <OverviewTab careerSnapshot={careerSnapshot} resumes={resumes} analyses={analyses} user={user} loading={loading} />
                </ErrorBoundary>
              )}

              {/* My Skills Tab */}
              {activeTab === 'skills' && (
                <ErrorBoundary>
                  <MySkillsTab loading={loading} />
                </ErrorBoundary>
              )}

              {/* Role Analysis Tab */}
              {activeTab === 'role-analysis' && (
                <ErrorBoundary>
                  <RoleAnalysisTab analyses={analyses} loading={loading} />
                </ErrorBoundary>
              )}

              {/* Learning Path Tab */}
              {activeTab === 'learning-path' && (
                <ErrorBoundary>
                  <LearningPathTab loading={loading} />
                </ErrorBoundary>
              )}

              {/* Job Fit Tab */}
              {activeTab === 'job-fit' && (
                <ErrorBoundary>
                  <JobFitTab jobs={jobs} onCompare={fetchData} loading={loading} />
                </ErrorBoundary>
              )}

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <ErrorBoundary>
                  <CareerChat />
                </ErrorBoundary>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <ErrorBoundary>
                  <ProfileTab />
                </ErrorBoundary>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
