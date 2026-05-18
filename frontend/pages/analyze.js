import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import api from '../lib/api';

export default function Analyze() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [sessionToken, setSessionToken] = useState('');
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    await uploadResume(file);
  };

  const uploadResume = async (file) => {
    setUploading(true);
    setError('');
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/resumes/analyze-guest', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setAnalysisData(data);
      setSessionToken(data.sessionToken);
      setSuccess(true);

      // Store session token in localStorage for post-signup claiming
      localStorage.setItem('guestSessionToken', data.sessionToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSignup = () => {
    if (sessionToken) {
      // Redirect to signup with session token
      router.push(`/auth/signup?session=${sessionToken}`);
    } else {
      router.push('/auth/signup');
    }
  };

  return (
    <>
      <Head>
        <title>Analyze Your Resume - Skill Gap Analyzer</title>
        <meta name="description" content="Upload your resume to get instant career insights and skill gap analysis" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Analyze Your Resume
            </h1>
            <p className="text-xl text-gray-600">
              Get instant insights into your skills, career opportunities, and learning paths
            </p>
          </div>

          {!success ? (
            // Step 1: Upload Resume
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Step 1: Upload Your Resume</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-10-8v8m0 0l-3-3m3 3l3-3"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drag and drop your resume here
                </p>
                <p className="text-gray-600 mb-4">or</p>

                <button
                  onClick={() => inputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Browse Files'}
                </button>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleChange}
                  className="hidden"
                  disabled={uploading}
                />

                <p className="text-sm text-gray-500 mt-4">
                  Accepted format: PDF (Max 10MB)
                </p>
              </div>

              <p className="text-sm text-gray-600 mt-4 text-center">
                ⏱️ Rate limit: 3 analyses per hour per IP address
              </p>
            </div>
          ) : (
            // Step 2 & 3: Show Analysis Results
            <div className="space-y-8">
              {/* Career Snapshot */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Career Snapshot</h2>

                {analysisData?.snapshot?.topRoles && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Top Matching Roles</h3>
                    <div className="space-y-3">
                      {analysisData.snapshot.topRoles.slice(0, 3).map((role, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-800">{role.title}</h4>
                            <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded">
                              {Math.round(role.matchPercentage)}% Match
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{role.description}</p>
                          {role.salaryRange && (
                            <p className="text-gray-500 text-sm mt-2">
                              💰 Salary: ${role.salaryRange.min.toLocaleString()} - ${role.salaryRange.max.toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Extracted Skills */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Extracted Skills</h2>

                {analysisData?.extractedSkills && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {analysisData.extractedSkills.map((skill, idx) => (
                      <div
                        key={idx}
                        className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center"
                      >
                        <span className="text-gray-700 font-medium">{skill.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {(!analysisData?.extractedSkills || analysisData.extractedSkills.length === 0) && (
                  <p className="text-gray-600">No skills detected in your resume.</p>
                )}
              </div>

              {/* Call to Action */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white text-center">
                <h3 className="text-2xl font-bold mb-3">Ready to Unlock Your Potential?</h3>
                <p className="text-lg mb-6 opacity-90">
                  Create an account to save your analysis, get personalized learning paths, and track your career progress.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handleSignup}
                    className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg transition"
                  >
                    Create Account
                  </button>
                  <Link href="/">
                    <a className="bg-blue-500 hover:bg-blue-400 font-bold py-3 px-8 rounded-lg transition text-center">
                      Back to Home
                    </a>
                  </Link>
                </div>

                <p className="text-sm mt-4 opacity-75">
                  Already have an account?{' '}
                  <Link href="/auth/login">
                    <a className="underline font-semibold hover:text-gray-200">Sign in here</a>
                  </Link>
                </p>
              </div>

              {/* Results Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-gray-700 text-center">
                  ✨ Your analysis is stored temporarily and will be available for 24 hours.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
