import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/store';
import { FiArrowRight, FiZap, FiBarChart2, FiTarget } from 'react-icons/fi';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  return (
    <>
      <Head>
        <title>Skill Gap Analyzer - AI-Powered Career Development</title>
        <meta name="description" content="Discover your skill gaps and unlock your career potential" />
      </Head>

      <main>
        {/* Hero Section */}
        <section className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
          <div className="text-center max-w-4xl mx-auto px-4">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Unlock Your Career Potential
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Discover exactly what skills you need to reach your dream job. Get personalized learning paths powered by AI.
            </p>
            <div className="flex gap-4 justify-center flex-col sm:flex-row">
              {user ? (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-white text-primary px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-100 transition flex items-center gap-2"
                >
                  Go to Dashboard <FiArrowRight />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/analyze')}
                    className="bg-white text-primary px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
                  >
                    Try Free Analysis
                  </button>
                  <button
                    onClick={() => router.push('/auth/signup')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg transition"
                  >
                    Create Account
                  </button>
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-white hover:text-primary transition"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-12">Why Choose Skill Gap Analyzer?</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition">
                <FiZap className="text-4xl text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-3">AI-Powered Analysis</h3>
                <p className="text-gray-600">
                  Advanced NLP technology analyzes your resume and identifies skills with 95% accuracy.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition">
                <FiBarChart2 className="text-4xl text-secondary mb-4" />
                <h3 className="text-2xl font-bold mb-3">Visual Insights</h3>
                <p className="text-gray-600">
                  Interactive dashboards show your skill gaps and match percentage with target roles.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition">
                <FiTarget className="text-4xl text-danger mb-4" />
                <h3 className="text-2xl font-bold mb-3">Personalized Learning Paths</h3>
                <p className="text-gray-600">
                  Get curated learning recommendations tailored to your goals and learning style.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-white">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Career?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of professionals who are closing their skill gaps and landing their dream jobs.
            </p>
            {!user && (
              <div className="flex gap-4 justify-center flex-col sm:flex-row">
                <button
                  onClick={() => router.push('/analyze')}
                  className="bg-white text-primary px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
                >
                  Start Free Analysis
                </button>
                <button
                  onClick={() => router.push('/auth/signup')}
                  className="bg-blue-400 hover:bg-blue-300 text-white px-8 py-3 rounded-lg font-bold text-lg transition"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
