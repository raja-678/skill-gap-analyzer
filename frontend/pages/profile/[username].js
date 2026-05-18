import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import api from '@/lib/api';

export default function PublicProfilePage({}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const username = window.location.pathname.split('/').pop();
    if (!username) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/${username}/public-profile`);
        if (!res.ok) {
          setProfile(null);
          setLoading(false);
          return;
        }
        const json = await res.json();
        setProfile(json.profile);
      } catch (err) {
        console.error('Failed to load public profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading public profile...</div>;
  if (!profile) return <div className="p-12 text-center text-gray-600">Profile not found or not public.</div>;

  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.username;
  const ogImage = `/api/og/profile/${profile.username}`;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <Head>
        <title>{fullName} — Public Profile</title>
        <meta name="description" content={profile.headline || 'Public skills and career snapshot'} />
        <meta property="og:title" content={`${fullName} — Public Profile`} />
        <meta property="og:description" content={profile.headline || 'Public skills and career snapshot'} />
        <meta property="og:image" content={ogImage} />
      </Head>

      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
            {profile.username.slice(0,2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <p className="text-gray-600">{profile.headline}</p>
            <p className="text-sm text-gray-500 mt-2">Member since: {new Date(profile.memberSince).toLocaleDateString()}</p>
          </div>
        </div>

        <hr className="my-6" />

        <section>
          <h3 className="font-semibold mb-3">Top skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.topSkills && profile.topSkills.length > 0 ? (
              profile.topSkills.map((s, idx) => (
                <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{s.name}</span>
              ))
            ) : (
              <p className="text-gray-500">No skills listed</p>
            )}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="font-semibold mb-3">Skill categories</h3>
          <div className="space-y-2">
            {profile.skillCategories && profile.skillCategories.length > 0 ? (
              profile.skillCategories.map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="w-48 text-sm text-gray-700">{cat.category}</div>
                  <div className="flex-1 bg-gray-100 h-4 rounded overflow-hidden">
                    <div style={{ width: `${Math.min(100, (cat.count || 0) * 10)}%` }} className="h-4 bg-blue-600" />
                  </div>
                  <div className="w-12 text-sm text-gray-600">{cat.count}</div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No categories</p>
            )}
          </div>
        </section>

        <div className="mt-6">
          <a href="/analyze" className="px-5 py-2 bg-green-600 text-white rounded-lg">Analyze your own skill gaps free</a>
        </div>
      </div>
    </div>
  );
}
