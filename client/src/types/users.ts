import type { AuthUser } from '@/types/auth';

export type UserRecord = AuthUser;

export interface CreateUserInput {
  name: string;
  nameAr?: string;
  email: string;
  password: string;
  role: AuthUser['role'];
  department?: string;
  departmentAr?: string;
  contactPhone?: string;
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>>;
