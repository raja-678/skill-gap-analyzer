# Dashboard Redesign - Quick Reference

## Key Changes Summary

### Backend
✅ `backend/schema.sql`
- Added `target_role_id` (INTEGER, FK to job_roles)
- Added `target_role_set_at` (TIMESTAMPTZ)
- To existing `users` table

✅ `backend/src/routes/userRoutes.js`
- New endpoint: `PUT /api/users/target-role`
- Request: `{ targetRoleId: number }`
- Response: `{ success, targetRole, targetRoleSetAt }`
- Audit: logs `user.target_role_set` action

### Frontend - Store
✅ `frontend/lib/store.js`
- Added state: `targetRole`, `targetRolePercentage`
- Added methods: `setTargetRole()`, `setTargetRolePercentage()`
- Added hydration: loads targetRole from localStorage

### Frontend - Components (New)
✅ `PersistentHeader.js` - Blue sticky bar at top
- Shows: Target role title | Match % | ~N weeks
- Sticky top with z-index 40

✅ `DashboardSidebar.js` - Left navigation
- 7 tabs: Overview, My Skills, Role Analysis, Learning Path, Job Fit, Chat, Profile
- Fixed position, 256px wide
- Active state: blue highlight + left border

✅ `OverviewTab.js` - Dashboard home
- Progress ring (circular SVG)
- 5-step journey checklist
- This week's 2 top skills
- 2 career snapshot cards

✅ `RoleAnalysisTab.js` - Skill comparison
- RadarChart (5 skills, your level vs required)
- Skill breakdown table (6 columns)
- Trending badges (3 trending skills)

✅ `LearningPathTab.js` - Learning timeline
- Horizontal timeline with 5 skill nodes
- Detailed skill cards below
- Status: not-started, in-progress, completed

✅ `MySkillsTab.js` - Skill management
- Lists user's skills
- Add/remove capabilities

✅ `JobFitTab.js` - Job matching
- Wraps existing JobComparison component

✅ `ProfileTab.js` - Account settings
- Edit first/last name, bio
- Delete account (danger zone)

### Frontend - Main Page
✅ `frontend/pages/dashboard.js`
- Complete layout redesign
- Uses: PersistentHeader + DashboardSidebar + 7 tabs
- Loads targetRole on mount
- Calculates match percentage from analyses

---

## Usage Flow

1. **User sets target role:**
   ```javascript
   PUT /api/users/target-role
   { targetRoleId: 42 }
   ```

2. **Store updated:**
   ```javascript
   useAnalysisStore.setTargetRole(roleObject)
   // Persists to localStorage
   ```

3. **Header displays:**
   ```
   Your target: Senior React Developer · 78% Ready · ~3 weeks to go
   ```

4. **Sidebar shows progress:**
   - Progress ring: 78%
   - Journey: 3 of 5 steps done
   - This week: top 2 skills highlighted

5. **Role Analysis tab:**
   - RadarChart shows gaps
   - Table shows skill-by-skill status
   - Trending shows what's in-demand

6. **Learning Path tab:**
   - Timeline with 5 skills
   - Each skill has start/complete actions
   - Estimated 10-16 weeks total

---

## Database Migration

```bash
npm run migrate

# Adds to users table:
ALTER TABLE users ADD COLUMN target_role_id INTEGER;
ALTER TABLE users ADD COLUMN target_role_set_at TIMESTAMPTZ;
ALTER TABLE users ADD CONSTRAINT fk_target_role 
  FOREIGN KEY (target_role_id) REFERENCES job_roles(id) ON DELETE SET NULL;
```

---

## Testing Checklist

### Backend
- [ ] `PUT /api/users/target-role` accepts valid roleId
- [ ] Returns error for invalid roleId
- [ ] Audit log created with `user.target_role_set` action
- [ ] Database persists target_role_id and timestamp

### Frontend
- [ ] Header shows target role (if set)
- [ ] Header calculates weeks correctly
- [ ] Change Role button opens selector
- [ ] Sidebar toggles tabs correctly
- [ ] localStorage persists targetRole
- [ ] OverviewTab shows journey checklist
- [ ] RoleAnalysisTab renders RadarChart
- [ ] LearningPathTab timeline scrolls
- [ ] All tabs load without errors

### Integration
- [ ] Create account → set target role → see header
- [ ] Reload page → header still shows role
- [ ] Change role → all tabs update
- [ ] Upload resume → match % increases

---

## State Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User selects target role in modal                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ PUT /api/users/target-role { targetRoleId: 42 }             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend: Update users.target_role_id, log audit             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend: setTargetRole(roleObject)                         │
├─ Updates store: targetRole = roleObject                     │
├─ Persists: localStorage.setItem('targetRole', JSON)         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ PersistentHeader re-renders                                 │
├─ Shows role title                                           │
├─ Shows match % (from targetRolePercentage)                  │
├─ Shows weeks to go (calculated: (100-match)/15)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Constants & Calculations

**Progress Ring:**
- Circumference: 2π × 45 = 282.7px
- Stroke dash offset: circumference × (1 - percentage/100)

**Weeks to Go:**
- Formula: Math.ceil((100 - matchPercentage) / 15)
- Examples:
  - 100%: 0 weeks
  - 85%: 1 week
  - 70%: 2 weeks
  - 50%: 3-4 weeks

**Journey Steps:**
- Step 1: Resume uploaded (checks: resumes.length > 0)
- Step 2: Skills extracted (checks: resumes.length > 0)
- Step 3: Target set (checks: analyses.length > 0)
- Step 4: Gap analyzed (checks: analyses.length > 0)
- Step 5: Ready (checks: matchPercentage >= 80)

**This Week's Focus:**
- Top 2 skills with proficiency < 5
- Sorted by importance (role requirement level)
- Estimated days: 3-7 days per skill

---

## Browser DevTools Tips

### Check localStorage
```javascript
localStorage.getItem('targetRole')
// Output: {"id":42,"title":"Senior React Developer",...}
```

### Check store state
```javascript
useAnalysisStore.getState()
// Output: { analyses: [...], targetRole: {...}, targetRolePercentage: 78, ... }
```

### Mock API response
```javascript
// In network tab, intercept PUT /api/users/target-role
{
  "success": true,
  "targetRole": { "id": 42, "title": "Senior React Developer" },
  "targetRoleSetAt": "2026-05-12T14:30:00Z"
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Header not showing | Check if targetRole in store, verify PersistentHeader imported |
| Sidebar not clickable | Check activeTab state, verify setActiveTab callback |
| Charts not rendering | Verify Recharts installed, check data structure |
| localStorage empty | Check browser storage not disabled, verify setTargetRole called |
| Weeks calculation wrong | Check targetRolePercentage value (0-100) |
| Progress ring not animating | Check CSS transition classes, verify SVG math |

---

## File Sizes & Imports

**Dashboard.js**
- Imports: 9 components
- Lines: ~140
- Key imports: PersistentHeader, DashboardSidebar, 5 tabs

**PersistentHeader.js**
- Lines: ~55
- Dependencies: useAnalysisStore, CustomEvent

**RoleAnalysisTab.js**
- Lines: ~180
- Dependencies: Recharts (RadarChart, PolarGrid, etc.)

**LearningPathTab.js**
- Lines: ~220
- Dependencies: useState, setLearningPath

**All components:** ~1200 lines total, modular design

