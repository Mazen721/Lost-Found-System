import { Navigate, Route, Routes } from 'react-router-dom';
import { ActivityLogsPage } from '@/features/activity-logs/ActivityLogsPage';
import { AppShell } from '@/components/shared/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProfilePage } from '@/features/auth/ProfilePage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LocationsPage } from '@/features/locations/LocationsPage';
import { AllReportsPage } from '@/features/lost-found/items/AllReportsPage';
import { ArchivedReportsPage } from '@/features/lost-found/items/ArchivedReportsPage';
import { BrowseItemsPage } from '@/features/lost-found/items/BrowseItemsPage';
import { ItemDetailPage } from '@/features/lost-found/items/ItemDetailPage';
import { MyReportsPage } from '@/features/lost-found/items/MyReportsPage';
import { ReportItemPage } from '@/features/lost-found/items/ReportItemPage';
import { ClaimDetailPage } from '@/features/lost-found/claims/ClaimDetailPage';
import { ClaimsPage } from '@/features/lost-found/claims/ClaimsPage';
import { HandoversPage } from '@/features/lost-found/claims/HandoversPage';
import { SubmitClaimPage } from '@/features/lost-found/claims/SubmitClaimPage';
import { MatchSuggestionsPage } from '@/features/lost-found/matches/MatchSuggestionsPage';
import { UsersPage } from '@/features/users/UsersPage';
import { ForbiddenPage } from '@/routes/ForbiddenPage';
import { NotFoundPage } from '@/routes/NotFoundPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="forbidden" element={<ForbiddenPage />} />

          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
            <Route path="users" element={<UsersPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="activity-logs" element={<ActivityLogsPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={['STUDENT', 'EMPLOYEE', 'LOST_FOUND_MANAGER', 'SUPER_ADMIN']}
              />
            }
          >
            <Route path="lost-found/report" element={<ReportItemPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'EMPLOYEE']} />}>
            <Route path="lost-found/my-reports" element={<MyReportsPage />} />
            <Route path="lost-found/claims/new" element={<SubmitClaimPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={['STUDENT', 'EMPLOYEE', 'LOST_FOUND_MANAGER', 'SUPER_ADMIN']}
              />
            }
          >
            <Route path="lost-found/claims" element={<ClaimsPage />} />
            <Route path="lost-found/claims/:id" element={<ClaimDetailPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={['LOST_FOUND_MANAGER', 'SUPER_ADMIN']} />
            }
          >
            <Route path="lost-found/matches" element={<MatchSuggestionsPage />} />
            <Route path="lost-found/handovers" element={<HandoversPage />} />
            <Route path="lost-found/items" element={<AllReportsPage />} />
            <Route path="lost-found/archived" element={<ArchivedReportsPage />} />
          </Route>

          <Route path="lost-found" element={<BrowseItemsPage />} />
          <Route path="lost-found/items/:id" element={<ItemDetailPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
