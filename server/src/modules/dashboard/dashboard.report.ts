import { addMonths, format, startOfMonth } from 'date-fns';
import ExcelJS from 'exceljs';
import { Types } from 'mongoose';
import { LOST_FOUND_CATEGORIES } from '../../config/constants';
import { Location } from '../locations/location.model';
import { LostFoundItem } from '../lost-found/items/lostFoundItem.model';
import {
  computeStaleItems,
  foldLocationTypeRows,
  getRecoveryStats,
  getValueStats,
  handoverInstant,
  loadCompletedClaims,
  locationDisplayName,
  selectCanonicalReturns,
} from './dashboard.service';

/**
 * Monthly Excel report (spec 011): the workbook behind
 * `GET /dashboard/report.xlsx`. Every instant filter uses the same
 * half-open month interval [startOfMonth, startOfMonth + 1mo) so a
 * boundary instant belongs to exactly one month's report, and every
 * sheet states its scoping basis in a title row — البلاغات by report
 * date, الاسترجاعات by handover date, the stale sheet a point-in-time
 * snapshot.
 */

// Arabic enum labels, mirrored from the client's i18n tables
// (client/src/i18n/locales/ar.ts — enums.lostFoundCategory / status /
// role). The server has no i18n bundle; keep the two in step.
const CATEGORY_LABELS_AR: Record<string, string> = {
  Accessories: 'إكسسوارات',
  Bags: 'حقائب',
  Books: 'كتب',
  Clothing: 'ملابس',
  Documents: 'وثائق',
  Electronics: 'إلكترونيات',
  Headphones: 'سماعات',
  Keys: 'مفاتيح',
  Laptops: 'أجهزة لابتوب',
  Other: 'أخرى',
  Phones: 'هواتف',
  Wallets: 'محافظ',
};

const ITEM_STATUS_LABELS_AR: Record<string, string> = {
  OPEN: 'مفتوح',
  MATCH_CONFIRMED: 'تم تأكيد التطابق',
  CLAIM_UNDER_REVIEW: 'طلب الاستلام قيد المراجعة',
  APPROVED_FOR_HANDOVER: 'معتمد للتسليم',
  RETURNED: 'تم الإرجاع',
  CLOSED: 'مغلق',
};

const ROLE_LABELS_AR: Record<string, string> = {
  SUPER_ADMIN: 'مدير النظام',
  LOST_FOUND_MANAGER: 'مدير المفقودات',
  STUDENT: 'طالب',
  EMPLOYEE: 'موظف',
};

const REPORT_BASIS_COUNTS = 'حسب تاريخ الإبلاغ — أغراض أُنشئت هذا الشهر';

function styleTitleRow(sheet: ExcelJS.Worksheet, title: string, basis: string) {
  const titleRow = sheet.addRow([title]);
  titleRow.font = { bold: true, size: 13 };
  const basisRow = sheet.addRow([basis]);
  basisRow.font = { italic: true, color: { argb: 'FF666666' } };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
}

async function monthCategoryRows(monthStart: Date, nextMonthStart: Date) {
  const rows = await LostFoundItem.aggregate<{
    _id: { category: string; reportType: string };
    count: number;
  }>([
    { $match: { createdAt: { $gte: monthStart, $lt: nextMonthStart } } },
    {
      $group: {
        _id: { category: '$category', reportType: '$reportType' },
        count: { $sum: 1 },
      },
    },
  ]);
  const byCategory = new Map<string, { lost: number; found: number }>();
  for (const row of rows) {
    if (!row._id?.category) continue;
    const current = byCategory.get(row._id.category) ?? { lost: 0, found: 0 };
    if (row._id.reportType === 'LOST') current.lost += row.count;
    if (row._id.reportType === 'FOUND') current.found += row.count;
    byCategory.set(row._id.category, current);
  }
  return LOST_FOUND_CATEGORIES.map((category) => {
    const counts = byCategory.get(category) ?? { lost: 0, found: 0 };
    return { category, ...counts, total: counts.lost + counts.found };
  });
}

async function monthLocationRows(monthStart: Date, nextMonthStart: Date) {
  const rows = await LostFoundItem.aggregate<{
    _id: { locationId: Types.ObjectId; reportType: string };
    count: number;
  }>([
    { $match: { createdAt: { $gte: monthStart, $lt: nextMonthStart } } },
    {
      $group: {
        _id: { locationId: '$locationId', reportType: '$reportType' },
        count: { $sum: 1 },
      },
    },
  ]);
  const top = foldLocationTypeRows(rows).slice(0, 10);

  const locations = await Location.find({
    _id: { $in: top.map((row) => row.locationId) },
  })
    .select('buildingName buildingNameAr room roomAr')
    .lean();
  const locationById = new Map(
    locations.map((location) => [location._id.toString(), location]),
  );
  return top.flatMap((row) => {
    const location = locationById.get(row.locationId.toString());
    if (!location) return [];
    const { name, nameAr } = locationDisplayName(location);
    return [{ name: nameAr ?? name, ...row }];
  });
}

export async function buildMonthlyReport(
  now: Date = new Date(),
): Promise<{ buffer: Buffer; filename: string }> {
  const monthStart = startOfMonth(now);
  const nextMonthStart = addMonths(monthStart, 1);
  const createdInMonth = { createdAt: { $gte: monthStart, $lt: nextMonthStart } };

  const [
    lostThisMonth,
    foundThisMonth,
    categoryRows,
    locationRows,
    valueStats,
    recoveryStats,
    stale,
    completedClaims,
  ] = await Promise.all([
    LostFoundItem.countDocuments({ reportType: 'LOST', ...createdInMonth }),
    LostFoundItem.countDocuments({ reportType: 'FOUND', ...createdInMonth }),
    monthCategoryRows(monthStart, nextMonthStart),
    monthLocationRows(monthStart, nextMonthStart),
    getValueStats(now),
    getRecoveryStats(),
    computeStaleItems(now),
    loadCompletedClaims(),
  ]);

  const returnsThisMonth = selectCanonicalReturns(completedClaims).filter(
    (claim) => {
      const instant = handoverInstant(claim);
      return instant >= monthStart && instant < nextMonthStart;
    },
  ).length;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CampusCare Lost & Found';
  workbook.created = now;

  // --- Sheet 1: month summary -------------------------------------------
  const summary = workbook.addWorksheet('ملخص الشهر', {
    views: [{ rightToLeft: true }],
  });
  summary.columns = [{ width: 46 }, { width: 24 }];
  styleTitleRow(
    summary,
    'تقرير المفقودات والمعثورات الشهري',
    'البلاغات حسب تاريخ الإبلاغ، والاسترجاعات حسب تاريخ التسليم',
  );
  const monthLabel = new Intl.DateTimeFormat('ar-EG', {
    month: 'long',
    year: 'numeric',
  }).format(now);
  const generatedAt = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(now);
  summary.addRow(['الشهر', monthLabel]);
  summary.addRow(['تاريخ إنشاء التقرير', generatedAt]);
  summary.addRow(['بلاغات مفقودة هذا الشهر', lostThisMonth]);
  summary.addRow(['بلاغات معثور عليها هذا الشهر', foundThisMonth]);
  summary.addRow(['عمليات استرجاع هذا الشهر', returnsThisMonth]);
  summary.addRow([
    'قيمة المفقودات هذا الشهر (ج.م) — تقديرية',
    valueStats.lostValueThisMonthEGP,
  ]);
  summary.addRow([
    'قيمة المسترجعات هذا الشهر (ج.م) — تقديرية',
    valueStats.returnedValueThisMonthEGP,
  ]);
  const cumulativeHeader = summary.addRow([
    'مؤشرات تراكمية — ليست خاصة بهذا الشهر',
  ]);
  cumulativeHeader.font = { bold: true };
  summary.addRow(['إجمالي بلاغات الفقدان', recoveryStats.totalLostReports]);
  summary.addRow(['إجمالي المسترجعات', recoveryStats.returnedCount]);
  const rateRow = summary.addRow([
    'نسبة الاسترجاع الإجمالية',
    recoveryStats.returnRate ?? 'غير متاح',
  ]);
  if (recoveryStats.returnRate !== null) {
    rateRow.getCell(2).numFmt = '0.0%';
  }
  summary.addRow([
    'متوسط زمن الاسترجاع الإجمالي (يوم)',
    recoveryStats.averageDaysToReturn,
  ]);

  // --- Sheet 2: by category (report-date cohort) -------------------------
  const byCategory = workbook.addWorksheet('حسب الفئة', {
    views: [{ rightToLeft: true }],
  });
  byCategory.columns = [{ width: 26 }, { width: 12 }, { width: 14 }, { width: 12 }];
  styleTitleRow(byCategory, 'الأغراض حسب الفئة', REPORT_BASIS_COUNTS);
  styleHeaderRow(byCategory.addRow(['الفئة', 'مفقود', 'معثور عليه', 'الإجمالي']));
  for (const row of categoryRows) {
    byCategory.addRow([
      CATEGORY_LABELS_AR[row.category] ?? row.category,
      row.lost,
      row.found,
      row.total,
    ]);
  }

  // --- Sheet 3: by location (report-date cohort) -------------------------
  const byLocation = workbook.addWorksheet('حسب المكان', {
    views: [{ rightToLeft: true }],
  });
  byLocation.columns = [{ width: 40 }, { width: 12 }, { width: 14 }, { width: 12 }];
  styleTitleRow(byLocation, 'الأغراض حسب المكان', REPORT_BASIS_COUNTS);
  styleHeaderRow(byLocation.addRow(['المكان', 'مفقود', 'معثور عليه', 'الإجمالي']));
  for (const row of locationRows) {
    byLocation.addRow([row.name, row.lost, row.found, row.count]);
  }

  // --- Sheet 4: stale items (point-in-time snapshot) ---------------------
  const staleSheet = workbook.addWorksheet('أغراض نايمة', {
    views: [{ rightToLeft: true }],
  });
  staleSheet.columns = [
    { width: 14 },
    { width: 34 },
    { width: 12 },
    { width: 14 },
    { width: 22 },
    { width: 30 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
  ];
  styleTitleRow(
    staleSheet,
    'أغراض نايمة — تحتاج متابعة',
    'قائمة لحظية بتاريخ إنشاء التقرير',
  );
  styleHeaderRow(
    staleSheet.addRow([
      'رقم البلاغ',
      'العنوان',
      'النوع',
      'الفئة',
      'الحالة',
      'المكان',
      'دور المُبلِّغ',
      'أيام دون حركة',
      'آخر حركة',
    ]),
  );
  for (const item of stale.items) {
    const row = staleSheet.addRow([
      item.reportNumber,
      item.itemTitleAr ?? item.itemTitle,
      item.reportType === 'LOST' ? 'مفقود' : 'معثور عليه',
      CATEGORY_LABELS_AR[item.category] ?? item.category,
      ITEM_STATUS_LABELS_AR[item.status] ?? item.status,
      item.buildingAr ?? item.building,
      ROLE_LABELS_AR[item.reporterRole] ?? item.reporterRole,
      item.ageDays,
      item.lastMovementAt,
    ]);
    row.getCell(9).numFmt = 'yyyy-mm-dd hh:mm';
  }

  const data = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(data as unknown as Uint8Array),
    filename: `تقرير-المفقودات-${format(now, 'yyyy-MM')}.xlsx`,
  };
}
