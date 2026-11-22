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

export const LOST_FOUND_CATEGORIES = [
  'Electronics',
  'Phones',
  'Laptops',
  'Headphones',
  'Wallets',
  'Bags',
  'Keys',
  'Documents',
  'Accessories',
  'Books',
  'Clothing',
  'Other',
] as const;
export type LostFoundCategory = (typeof LOST_FOUND_CATEGORIES)[number];

export const ITEM_STATUSES = [
  'OPEN',
  'MATCH_CONFIRMED',
  'CLAIM_UNDER_REVIEW',
  'APPROVED_FOR_HANDOVER',
  'RETURNED',
  'CLOSED',
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const CLAIM_STATUSES = [
  'PENDING_REVIEW',
  'UNDER_VERIFICATION',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const MATCH_STATUSES = ['SUGGESTED', 'CONFIRMED', 'DISMISSED'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MATCH_LEVELS = ['STRONG', 'POSSIBLE'] as const;
export type MatchLevel = (typeof MATCH_LEVELS)[number];

export const REPORT_TYPES = ['LOST', 'FOUND'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const LOCATION_TYPES = ['BUILDING', 'FLOOR', 'ROOM', 'LAB', 'OTHER'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const IMAGE_MAX_COUNT = 3;
/**
 * Upload guardrail only (production-readiness pass, 2026-11-22): normal
 * mobile photos are ALWAYS accepted and automatically resized/compressed
 * server-side (see upload.service optimizeImageBuffer) — users must never
 * see a "photo too big" error for a real phone photo. This cap exists
 * solely as an abuse/security ceiling for absurd payloads.
 */
export const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
/** Longest edge (px) kept after automatic server-side image optimization. */
export const IMAGE_MAX_DIMENSION = 1600;
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface DemoAccount {
  email: string;
  name: string;
  nameAr: string;
  department: string;
  departmentAr?: string;
}

export const DEMO_ACCOUNTS: Record<Role, DemoAccount> = {
  SUPER_ADMIN: {
    email: 't.elshenawy@mansnu.edu.eg',
    name: 'Eng. Tarek El-Shenawy',
    nameAr: 'م. طارق الشناوي',
    department: 'Information Technology & Digital Transformation Unit',
    departmentAr: 'وحدة تكنولوجيا المعلومات والتحول الرقمي',
  },
  LOST_FOUND_MANAGER: {
    email: 'a.eldesouky@mansnu.edu.eg',
    name: 'Ahmed El-Desouky',
    nameAr: 'أ. أحمد الدسوقي',
    department: 'University Security, Safety & Lost and Found Office',
    departmentAr: 'إدارة الأمن الجامعي والسلامة — مكتب المفقودات',
  },
  STUDENT: {
    email: 'youssef.elashry@std.mansnu.edu.eg',
    name: 'Youssef El-Ashry',
    nameAr: 'يوسف العشري',
    department: 'Faculty of Engineering (Level 3 Mechatronics)',
    departmentAr: 'كلية الهندسة (المستوى الثالث — ميكاترونكس)',
  },
  EMPLOYEE: {
    email: 'm.kamal@mansnu.edu.eg',
    name: 'Mostafa Kamal',
    nameAr: 'مصطفى كمال',
    department: 'Student Affairs Department',
    departmentAr: 'إدارة شئون الطلاب',
  },
};
