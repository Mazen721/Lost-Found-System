import type { TFunction } from 'i18next';
import { tr } from '@/i18n/localize';
import type { StudentDashboard as StudentDashboardData } from '@/types/dashboard';
import type { ReportType } from '@/types/lostFound';

export type TrackerTone = 'navy' | 'emerald' | 'danger';

export interface StudentTrackerProgress {
  activeStep: 1 | 2 | 3;
  tone: TrackerTone;
  steps: [string, string, string];
}

export interface StudentTrackerItem {
  id: string;
  to: string;
  code: string;
  title: string;
  status: string;
  createdAt: string;
  reportType?: ReportType;
  progress: StudentTrackerProgress;
}

const LOST_FOUND_PROGRESS_MAP: Record<
  string,
  { activeStep: 1 | 2 | 3; tone: TrackerTone; step3Key: string }
> = {
  PENDING_REVIEW: {
    activeStep: 1,
    tone: 'navy',
    step3Key: 'dashboard.studentStepApproved',
  },
  OPEN: {
    activeStep: 1,
    tone: 'navy',
    step3Key: 'dashboard.studentStepCompleted',
  },
  UNDER_VERIFICATION: {
    activeStep: 2,
    tone: 'navy',
    step3Key: 'dashboard.studentStepApproved',
  },
  MATCH_CONFIRMED: {
    activeStep: 2,
    tone: 'navy',
    step3Key: 'dashboard.studentStepCompleted',
  },
  CLAIM_UNDER_REVIEW: {
    activeStep: 2,
    tone: 'navy',
    step3Key: 'dashboard.studentStepCompleted',
  },
  APPROVED: {
    activeStep: 3,
    tone: 'emerald',
    step3Key: 'dashboard.studentStepApproved',
  },
  APPROVED_FOR_HANDOVER: {
    activeStep: 3,
    tone: 'emerald',
    step3Key: 'dashboard.studentStepApproved',
  },
  COMPLETED: {
    activeStep: 3,
    tone: 'emerald',
    step3Key: 'dashboard.studentStepCompleted',
  },
  RETURNED: {
    activeStep: 3,
    tone: 'emerald',
    step3Key: 'dashboard.studentStepCompleted',
  },
  CLOSED: {
    activeStep: 3,
    tone: 'emerald',
    step3Key: 'dashboard.studentStepCompleted',
  },
  REJECTED: {
    activeStep: 3,
    tone: 'danger',
    step3Key: 'dashboard.studentStepRejected',
  },
};

function resolveLostFoundProgress(
  status: string,
  t: TFunction,
): StudentTrackerProgress {
  const spec =
    LOST_FOUND_PROGRESS_MAP[status.toUpperCase()] ?? LOST_FOUND_PROGRESS_MAP.OPEN;
  return {
    activeStep: spec.activeStep,
    tone: spec.tone,
    steps: [
      t('dashboard.studentStepSubmitted'),
      t('dashboard.studentStepUnderReview'),
      t(spec.step3Key),
    ],
  };
}

/**
 * Merges recent ownership claims and lost-and-found reports into a single
 * reverse-chronological list of 3-step tracker items.
 */
export function buildLostFoundTrackerItems(
  claims: StudentDashboardData['claims']['recent'],
  reports: StudentDashboardData['reports']['recent'],
  t: TFunction,
): StudentTrackerItem[] {
  const claimItems: StudentTrackerItem[] = claims.map((claim) => ({
    id: `claim-${claim.id}`,
    to: `/lost-found/claims/${claim.id}`,
    code: claim.claimNumber,
    title: tr(claim, 'itemTitle'),
    status: claim.status,
    createdAt: claim.createdAt,
    progress: resolveLostFoundProgress(claim.status, t),
  }));

  const reportItems: StudentTrackerItem[] = reports.map((report) => {
    const reportType: ReportType = report.reportType === 'LOST' ? 'LOST' : 'FOUND';
    return {
      id: `report-${report.id}`,
      to: `/lost-found/items/${report.id}`,
      code: report.reportNumber,
      title: tr(report, 'itemTitle'),
      status: report.status,
      createdAt: report.createdAt,
      reportType,
      progress: resolveLostFoundProgress(report.status, t),
    };
  });

  return [...claimItems, ...reportItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
