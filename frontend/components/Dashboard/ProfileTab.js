import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProfileTab() {
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    isPublicProfile: user?.is_public_profile || false,
    profileHeadline: user?.profile_headline || ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.put('/users/profile', {
        first_name: profile.firstName,
        last_name: profile.lastName,
        bio: profile.bio,
        is_public_profile: profile.isPublicProfile,
        profile_headline: profile.profileHeadline
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/profile/${user?.username}`;
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
        
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                name="firstName"
                value={profile.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={profile.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-2 border rounded-lg bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
            <textarea
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Headline (public)</label>
            <input
              type="text"
              name="profileHeadline"
              value={profile.profileHeadline}
              onChange={handleChange}
              placeholder="Short headline shown on your public profile"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isPublicProfile"
              name="isPublicProfile"
              type="checkbox"
              checked={profile.isPublicProfile}
              onChange={(e) => setProfile(prev => ({ ...prev, isPublicProfile: e.target.checked }))}
              className="h-4 w-4"
            />
            <label htmlFor="isPublicProfile" className="text-sm text-gray-700">Make my profile public</label>
            <button onClick={handleCopyLink} className="ml-auto px-3 py-1 bg-gray-100 rounded">Copy public link</button>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <a href="/api/auth/github" className="ml-4 inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">
            Connect GitHub
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8 border-l-4 border-red-500">
        <h3 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h3>
        <p className="text-gray-600 mb-4">Permanently delete your account and all data</p>
        <button className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">
          Delete Account
        </button>
      </div>
    </div>
  );
}
