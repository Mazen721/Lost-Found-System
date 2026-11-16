import { useAuth } from '@/features/auth/AuthContext';
import { ClaimsQueuePage } from '@/features/lost-found/claims/ClaimsQueuePage';
import { MyClaimsPage } from '@/features/lost-found/claims/MyClaimsPage';

/**
 * One route for both roles: managers get the verification queue while students
 * and employees see only their own claims (the API enforces the same rule).
 */
export function ClaimsPage() {
  const { user } = useAuth();

  return user?.role === 'LOST_FOUND_MANAGER' || user?.role === 'SUPER_ADMIN'
    ? <ClaimsQueuePage />
    : <MyClaimsPage />;
}
