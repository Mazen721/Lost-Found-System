import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import type { TFunction } from 'i18next';
import { FormField } from '@/components/shared/FormField';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { usersApi } from '@/features/users/usersApi';
import { getErrorMessage } from '@/lib/api';
import { enumLabel } from '@/lib/labels';
import { ROLES, type Role } from '@/types/auth';
import type { UserRecord } from '@/types/users';

export function createUserFormSchema(t: TFunction, isEditing: boolean) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, t('validation.fieldRequired', { field: t('users.name') }))
        .max(120, t('validation.maxChars', { field: t('users.name'), max: 120 })),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .email(t('validation.email'))
        .max(254),
      password: z.string().optional(),
      role: z.enum(ROLES),
      department: z
        .string()
        .trim()
        .max(120, t('validation.maxChars', { field: t('users.department'), max: 120 }))
        .optional(),
      departmentAr: z
        .string()
        .trim()
        .max(120, t('validation.maxChars', { field: t('users.departmentAr'), max: 120 }))
        .optional(),
      contactPhone: z
        .string()
        .trim()
        .max(40, t('validation.maxChars', { field: t('auth.contactPhone'), max: 40 }))
        .optional(),
    })
    .superRefine((values, context) => {
      if (isEditing) return;
      if (!values.password) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: t('validation.passwordUserRequired'),
        });
      } else if (values.password.length < 8 || values.password.length > 72) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: t('validation.passwordMin', { min: 8 }),
        });
      }
    });
}

export type UserFormSchema = ReturnType<typeof createUserFormSchema>;
export type UserFormValues = z.infer<UserFormSchema>;

const EMPTY_VALUES: UserFormValues = {
  name: '',
  email: '',
  password: '',
  role: 'STUDENT',
  department: '',
  departmentAr: '',
  contactPhone: '',
};

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRecord | null;
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(user);

  const schema = useMemo(() => createUserFormSchema(t, isEditing), [t, isEditing]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    reset(
      user
        ? {
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            department: user.department ?? '',
            departmentAr: user.departmentAr ?? '',
            contactPhone: user.contactPhone ?? '',
          }
        : EMPTY_VALUES,
    );
  }, [open, user, reset]);

  const saveUser = useMutation({
    mutationFn: (values: UserFormValues) => {
      const shared = {
        name: values.name,
        email: values.email,
        role: values.role,
        department: values.department?.trim() || undefined,
        departmentAr: values.departmentAr?.trim() || undefined,
        contactPhone: values.contactPhone?.trim() || undefined,
      };

      return user
        ? usersApi.update(user.id, shared)
        : usersApi.create({ ...shared, password: values.password ?? '' });
    },
  });

  const onSubmit = async (values: UserFormValues) => {
    setServerError(null);
    try {
      await saveUser.mutateAsync(values);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('users.userSavedSuccess'));
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('users.editUser') : t('users.createUser')}</DialogTitle>
          <DialogDescription>
            {t('users.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="user-name" label={t('users.name')} hint={t('users.nameEnglishHint')} error={errors.name?.message} required>
              <Input
                id="user-name"
                placeholder={t('users.namePlaceholder')}
                autoComplete="name"
                dir="ltr"
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
            </FormField>

            <FormField id="user-email" label={t('auth.email')} error={errors.email?.message} required>
              <Input
                id="user-email"
                type="email"
                dir="ltr"
                className="text-start"
                placeholder={t('users.emailPlaceholder')}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
            </FormField>

            {!isEditing ? (
              <FormField
                id="user-password"
                label={t('auth.password')}
                error={errors.password?.message}
                hint={t('validation.passwordMin', { min: 8 })}
                required
              >
                <PasswordInput
                  id="user-password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
              </FormField>
            ) : null}

            <FormField id="user-role" label={t('auth.role')} error={errors.role?.message} required>
              <select
                id="user-role"
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-invalid={Boolean(errors.role)}
                {...register('role')}
              >
                {ROLES.map((role: Role) => (
                  <option key={role} value={role}>
                    {enumLabel('role', role)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="user-department" label={t('users.department')} error={errors.department?.message}>
              <Input
                id="user-department"
                dir="ltr"
                placeholder={t('users.departmentPlaceholder')}
                aria-invalid={Boolean(errors.department)}
                {...register('department')}
              />
            </FormField>

            <FormField id="user-department-ar" label={t('users.departmentAr')} error={errors.departmentAr?.message}>
              <Input
                id="user-department-ar"
                dir="rtl"
                placeholder={t('users.departmentArPlaceholder')}
                aria-invalid={Boolean(errors.departmentAr)}
                {...register('departmentAr')}
              />
            </FormField>

            <FormField id="user-phone" label={t('auth.contactPhone')} error={errors.contactPhone?.message}>
              <Input
                id="user-phone"
                type="tel"
                dir="ltr"
                className="text-start"
                placeholder={t('users.phonePlaceholder')}
                autoComplete="tel"
                aria-invalid={Boolean(errors.contactPhone)}
                {...register('contactPhone')}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
