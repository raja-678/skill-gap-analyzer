import { FiAlertTriangle, FiArrowUpRight, FiClock, FiTarget, FiTrendingUp } from 'react-icons/fi';

const RoleScore = ({ role }) => (
  <div className="rounded-lg border border-gray-200 p-4">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-bold text-gray-900">{role.title}</h3>
        <p className="text-sm text-gray-500">{role.category} · {role.marketDemandLabel} demand</p>
      </div>
      <div className="rounded-lg bg-gray-900 px-3 py-1 text-sm font-bold text-white">
        {role.currentScore}%
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div>
        <p className="text-gray-500">Career</p>
        <p className="font-bold">{role.careerScore}</p>
      </div>
      <div>
        <p className="text-gray-500">Upgrade</p>
        <p className="font-bold">{role.effortWeeks}w</p>
      </div>
      <div>
        <p className="text-gray-500">Gaps</p>
        <p className="font-bold">{role.missingSkills.length + role.improvableSkills.length}</p>
      </div>
    </div>
  </div>
);

export default function CareerSnapshot({ snapshot, loading, onOpenChat }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Building your career snapshot...</p>
      </div>
    );
  }

  if (!snapshot?.hasProfile) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3">
          <FiTarget className="text-2xl text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Your Career Snapshot</h2>
            <p className="text-gray-500">Upload a resume to see best-fit roles, fast upgrade paths, and weaknesses.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <FiTrendingUp className="text-2xl text-primary" />
              <h2 className="text-2xl font-bold">Your Career Snapshot</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Ranked by skill match, upgrade effort, experience alignment, and catalog demand.
            </p>
          </div>
          <button onClick={onOpenChat} className="btn-primary flex items-center gap-2">
            Ask Agent <FiArrowUpRight />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <FiTarget className="text-primary" />
              <h3 className="font-bold">Top Roles You Can Target Now</h3>
            </div>
            <div className="space-y-3">
              {snapshot.topRolesNow.map((role) => <RoleScore key={`now-${role.roleId}`} role={role} />)}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <FiClock className="text-secondary" />
              <h3 className="font-bold">Roles You Can Reach Fast</h3>
            </div>
            <div className="space-y-3">
              {snapshot.fastUpgradeRoles.length ? (
                snapshot.fastUpgradeRoles.map((role) => <RoleScore key={`fast-${role.roleId}`} role={role} />)
              ) : (
                <p className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
                  No fast-upgrade role found yet. Add more skills or upload a stronger resume.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-3 flex items-center gap-2">
            <FiAlertTriangle className="text-red-500" />
            <h3 className="font-bold">Biggest Weaknesses</h3>
          </div>
          {snapshot.biggestWeaknesses.length ? (
            <div className="space-y-3">
              {snapshot.biggestWeaknesses.map((skill) => (
                <div key={skill.name} className="rounded-lg bg-red-50 p-4">
                  <p className="font-bold text-red-800">{skill.name}</p>
                  <p className="text-sm text-red-700">
                    Blocks {skill.roleCount} nearby role path{skill.roleCount > 1 ? 's' : ''}.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No major weakness detected from your current role paths.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="mb-3 font-bold">Career Timeline</h3>
          <div className="space-y-3">
            {snapshot.timeline.map((item) => (
              <div key={`${item.period}-${item.title}`} className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-bold text-primary">{item.period}</p>
                <p className="font-bold">{item.title}</p>
                <p className="text-sm text-gray-600">{item.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
