export const ROLES = [
  'SUPER_ADMIN',
  'LOST_FOUND_MANAGER',
  'STUDENT',
  'EMPLOYEE',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  LOST_FOUND_MANAGER: 'Lost & Found Manager',
  STUDENT: 'Student',
  EMPLOYEE: 'Employee',
};

export const ROLE_SHORT_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Admin',
  LOST_FOUND_MANAGER: 'Manager',
  STUDENT: 'Student',
  EMPLOYEE: 'Employee',
};

export interface AuthUser {
  id: string;
  name: string;
  nameAr?: string;
  email: string;
  role: Role;
  department?: string;
  departmentAr?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
