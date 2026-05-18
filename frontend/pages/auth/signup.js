import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast, { Toaster } from 'react-hot-toast';

const getErrorMessage = (error) => {
  const data = error.response?.data;
  if (data?.error) return data.error;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((item) => item.msg).join(', ');
  }
  return error.message || 'Registration failed';
};

export default function Signup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('📤 Submitting registration:', {
        ...formData,
        password: '***'
      });
      console.log('📍 API Base URL:', process.env.NEXT_PUBLIC_API_URL);

      const response = await api.post('/auth/register', formData);
      console.log('✅ Registration response:', response.data);
      
      const { user } = response.data;

      // Save to store
      setUser(user);

      // Save non-sensitive profile only; JWT is in an httpOnly cookie.
      localStorage.setItem('user', JSON.stringify(user));

      // Check for guest session token to claim
      const guestSessionToken = localStorage.getItem('guestSessionToken');
      if (guestSessionToken) {
        try {
          console.log('📝 Claiming guest session...');
          await api.post('/users/claim-guest-session', { sessionToken: guestSessionToken });
          localStorage.removeItem('guestSessionToken');
          toast.success('Your analysis has been saved to your account!');
        } catch (claimError) {
          console.error('Failed to claim guest session:', claimError);
          // Continue even if claiming fails
        }
      }

      toast.success('Registration successful!');
      router.push('/dashboard');
    } catch (error) {
      console.error('❌ Registration error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up - Skill Gap Analyzer</title>
      </Head>
      <Toaster />

      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <h2 className="text-3xl font-bold mb-6 text-center text-dark">Create Account</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-dark font-semibold mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-dark font-semibold mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-dark font-semibold mb-2">First Name</label>
                <input
                  type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
                <label className="block text-dark font-semibold mb-2">Last Name</label>
                <input
                  type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            </div>

            <div className="mb-6">
              <label className="block text-dark font-semibold mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-4 text-center text-gray-600">
            Already have an account?{' '}
            <a href="/auth/login" className="text-primary font-bold hover:underline">
              Login
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
