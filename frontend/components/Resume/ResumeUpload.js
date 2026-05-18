import { FiUploadCloud } from 'react-icons/fi';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import SkillVerification from '@/components/Skills/SkillVerification';

export default function ResumeUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [skillsToVerify, setSkillsToVerify] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    let intervalId;

    const pollStatus = async () => {
      if (!jobId) return;

      try {
        const statusRes = await api.get(`/resumes/status/${jobId}`);
        const { status, result, error } = statusRes.data;

        // Map status to progress
        const statusMap = {
          reading: { pct: 10, label: 'Reading file' },
          extracting: { pct: 30, label: 'Extracting content' },
          analyzing: { pct: 70, label: 'Analyzing skills' },
          completed: { pct: 100, label: 'Done' }
        };

        if (status && statusMap[status]) {
          setStatusMessage(`${statusMap[status].label} (${statusMap[status].pct}%)`);
        }

        if (status === 'completed' && result) {
          clearInterval(intervalId);
          setProcessing(false);
          const extractedSkills = result.extractedSkills || result.parsedData?.extractedSkills || [];

          if (extractedSkills.length > 0) {
            setSkillsToVerify(extractedSkills);
            setStatusMessage('Review the extracted skills before confirming.');
          } else {
            toast.success('Resume processed, but no skills were extracted.');
            onUploadSuccess();
          }
          setJobId(null);
        }

        if (status === 'failed') {
          clearInterval(intervalId);
          setProcessing(false);
          setJobId(null);
          toast.error(error || 'Resume processing failed');
        }
      } catch (pollError) {
        console.error('Polling status failed:', pollError);
      }
    };

    if (jobId) {
      setProcessing(true);
      setStatusMessage('Processing resume and extracting skills...');
      intervalId = setInterval(pollStatus, 2000);
      pollStatus();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId, onUploadSuccess]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    try {
      setUploading(true);
      setStatusMessage('Uploading your resume...');
      const response = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setJobId(response.data.jobId);
      toast.success('Resume uploaded successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Upload failed');
      setStatusMessage('');
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const handleConfirmSkills = (confirmedSkills) => {
    setSkillsToVerify([]);
    setStatusMessage('');
  };

  return (
    <div className="card">
      {!skillsToVerify.length ? (
        <>
          <h2 className="text-2xl font-bold mb-4">Upload Resume</h2>

          <div
            className="border-2 border-dashed border-primary rounded-lg p-8 text-center hover:bg-blue-50 transition cursor-pointer"
            onDrop={(e) => {
              e.preventDefault();
              onDrop(Array.from(e.dataTransfer.files));
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <FiUploadCloud className="text-4xl text-primary mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Drop your resume here</p>
            <p className="text-gray-500 mb-4">or click to browse</p>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => onDrop(Array.from(e.target.files))}
              className="hidden"
              id="resume-upload"
            />
            <label htmlFor="resume-upload" className="btn-primary cursor-pointer inline-block">
              Browse Files
            </label>
          </div>

          {(uploading || processing) && (
            <p className="mt-4 text-center text-primary font-semibold">{statusMessage}</p>
          )}

          {snapshot && (
            <div className="mt-6 bg-white rounded-lg shadow p-6 border border-green-200">
              <h3 className="text-xl font-semibold mb-3">Career Snapshot</h3>
              <p className="text-gray-700 mb-4">Your latest snapshot after skill verification.</p>
              {snapshot.topRoles?.length ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {snapshot.topRoles.slice(0, 2).map((role, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                      <p className="font-semibold text-gray-900">{role.title}</p>
                      <p className="text-sm text-gray-600 mt-2">Match: {role.matchPercentage}%</p>
                      {role.salaryRange && (
                        <p className="text-sm text-gray-600">Salary: ${role.salaryRange.min.toLocaleString()} - ${role.salaryRange.max.toLocaleString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No snapshot details available yet.</p>
              )}
            </div>
          )}
        </>
      ) : (
        <SkillVerification skills={skillsToVerify} onConfirm={handleConfirmSkills} />
      )}
    </div>
  );
}
