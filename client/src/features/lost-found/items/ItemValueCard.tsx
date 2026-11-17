import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Banknote, Loader2, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import type { TFunction } from 'i18next';
import { FormField } from '@/components/shared/FormField';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/AuthContext';
import { itemsApi } from '@/features/lost-found/items/itemsApi';
import { getErrorMessage } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import type { LostFoundItem } from '@/types/lostFound';

/**
 * Mirror of the server price-book bounds
 * (server/src/modules/lost-found/items/item-value.price-book.ts).
 * UX validation only — the server validates authoritatively.
 */
const VALUE_MIN_EGP = 20;
const VALUE_MAX_EGP = 150_000;

export function createValueSchema(t: TFunction) {
  return z.object({
    valueEGP: z
      .number({
        required_error: t('lostFound.valueInvalid', {
          min: VALUE_MIN_EGP,
          max: formatNumber(VALUE_MAX_EGP),
        }),
        invalid_type_error: t('lostFound.valueInvalid', {
          min: VALUE_MIN_EGP,
          max: formatNumber(VALUE_MAX_EGP),
        }),
      })
      .int(
        t('lostFound.valueInvalid', {
          min: VALUE_MIN_EGP,
          max: formatNumber(VALUE_MAX_EGP),
        }),
      )
      .min(VALUE_MIN_EGP)
      .max(VALUE_MAX_EGP),
  });
}

type ValueFormValues = z.infer<ReturnType<typeof createValueSchema>>;

/**
 * Staff-only estimated-value card for the item detail sidebar (spec 008).
 * Renders nothing unless the viewer is LOST_FOUND_MANAGER / SUPER_ADMIN
 * AND the payload actually carries a value — the server omits the fields
 * entirely for students/employees, so this is defence in depth, not the
 * privacy mechanism.
 */
export function ItemValueCard({ item }: { item: LostFoundItem }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isStaff =
    user?.role === 'LOST_FOUND_MANAGER' || user?.role === 'SUPER_ADMIN';
  const hasValue = typeof item.estimatedValueEGP === 'number';

  const schema = useMemo(() => createValueSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ValueFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { valueEGP: item.estimatedValueEGP ?? 0 },
  });

  useEffect(() => {
    if (!dialogOpen) return;
    setServerError(null);
    reset({ valueEGP: item.estimatedValueEGP ?? 0 });
  }, [dialogOpen, item.estimatedValueEGP, reset]);

  const adjustMutation = useMutation({
    mutationFn: (valueEGP: number) => itemsApi.adjustValue(item.id, valueEGP),
  });

  const onSubmit = async (values: ValueFormValues) => {
    setServerError(null);
    try {
      await adjustMutation.mutateAsync(values.valueEGP);
      await queryClient.invalidateQueries({
        queryKey: ['lost-found-item', item.id],
      });
      await queryClient.invalidateQueries({ queryKey: ['lost-found-items'] });
      toast.success(t('lostFound.valueSaved'));
      setDialogOpen(false);
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  if (!isStaff || !hasValue) return null;

  const isAdjusted = item.valueSource === 'ADJUSTED';

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('lostFound.estimatedValue')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              ~{formatNumber(item.estimatedValueEGP ?? 0)}{' '}
              <span className="text-sm font-semibold text-muted-foreground">
                {t('lostFound.egpSuffix')}
              </span>
            </p>
            {isAdjusted ? (
              <Badge variant="secondary">{t('lostFound.valueAdjustedManually')}</Badge>
            ) : null}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t('lostFound.estimatedValueStaffOnly')}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {t('lostFound.adjustValue')}
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(nextOpen) => !isSubmitting && setDialogOpen(nextOpen)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('lostFound.adjustValueTitle')}</DialogTitle>
            <DialogDescription>
              {t('lostFound.adjustValueDescription')}
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

            <FormField
              id="item-value-egp"
              label={t('lostFound.valueAmountLabel')}
              error={errors.valueEGP?.message}
              required
            >
              <Input
                id="item-value-egp"
                type="number"
                dir="ltr"
                min={VALUE_MIN_EGP}
                max={VALUE_MAX_EGP}
                step={1}
                inputMode="numeric"
                aria-invalid={Boolean(errors.valueEGP)}
                {...register('valueEGP', { valueAsNumber: true })}
              />
            </FormField>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
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
    </>
  );
}
