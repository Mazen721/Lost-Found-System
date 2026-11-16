import mongoose from 'mongoose';
import { DEMO_ACCOUNTS, ROLES, type Role } from '../config/constants';
import { env } from '../config/env';
import { hashPassword } from '../modules/auth/auth.service';
import { User } from '../modules/auth/user.model';
import { Location } from '../modules/locations/location.model';
import { LostFoundItem } from '../modules/lost-found/items/lostFoundItem.model';
import { ItemMatch } from '../modules/lost-found/matches/itemMatch.model';
import { ClaimRequest } from '../modules/lost-found/claims/claimRequest.model';
import { AiInsightCache } from '../modules/ai/aiInsightCache.model';
import { Counter } from '../shared/models/Counter.model';
import { COUNTER_PREFIXES } from '../shared/services/counter.service';
import { Notification } from '../shared/models/Notification.model';
import { ActivityLog } from '../shared/models/ActivityLog.model';
import { seedDemoData, type DemoDataCounts } from './demoData';

export const SEED_PASSWORD = 'Campus@2025';

interface SeedUser {
  name: string;
  nameAr?: string;
  email: string;
  role: Role;
  department: string;
  departmentAr?: string;
  contactPhone?: string;
}

interface SeedReport {
  accounts: number;
  locations: number;
  buildings: number;
  demo?: DemoDataCounts;
}

interface SeedOptions {
  silent?: boolean;
  /**
   * Adds the full demo dataset. Defaults to true outside tests so the
   * earlier phase suites, which assume an otherwise empty workflow, keep a
   * minimal foundation.
   */
  fullDemoData?: boolean;
}

interface IndexableModel {
  createIndexes(): Promise<unknown>;
}

const ALL_MODELS: IndexableModel[] = [
  Counter,
  User,
  Location,
  LostFoundItem,
  ItemMatch,
  ClaimRequest,
  Notification,
  ActivityLog,
  AiInsightCache,
];

interface RoomTemplate {
  suffix: string;
  en: (code: string) => string;
  ar: (code: string) => string;
  type: 'ROOM' | 'LAB' | 'OTHER';
}

const CORE_BUILDINGS: ReadonlyArray<{
  name: string;
  nameAr: string;
  floors: number;
  description: string;
  descriptionAr: string;
  rooms: readonly [RoomTemplate, RoomTemplate, RoomTemplate];
}> = [
  {
    name: 'Administration & Central Library Building',
    nameAr: 'مبنى إدارة الجامعة والمكتبة المركزية',
    floors: 4,
    description: 'Executive offices, main auditorium, student affairs, and the Central Library',
    descriptionAr: 'المكاتب التنفيذية، القاعة الكبرى، شئون الطلاب، والمكتبة المركزية',
    rooms: [
      {
        suffix: '01',
        en: (code) => (code === 'G01' ? `Student Affairs Hall ${code}` : `Central Library Hall ${code}`),
        ar: (code) => (code === 'G01' ? `قاعة شئون الطلاب ${code}` : `قاعة المكتبة المركزية ${code}`),
        type: 'ROOM',
      },
      {
        suffix: '02',
        en: (code) => (code === 'G02' ? `Main Auditorium ${code}` : `Reading & Research Room ${code}`),
        ar: (code) => (code === 'G02' ? `القاعة الكبرى ${code}` : `قاعة المطالعة والبحث ${code}`),
        type: 'ROOM',
      },
      {
        suffix: '05',
        en: (code) => `Administrative Office ${code}`,
        ar: (code) => `مكتب إداري ${code}`,
        type: 'ROOM',
      },
    ],
  },
  {
    name: 'Engineering & Technological Complex A & B',
    nameAr: 'مجمع الكليات الهندسية والتكنولوجية',
    floors: 5,
    description: 'Engineering, Mechatronics, Computer Engineering, and Artificial Intelligence labs',
    descriptionAr: 'معامل ومدرجات كلية الهندسة والميكاترونكس وهندسة الحاسبات والذكاء الاصطناعي',
    rooms: [
      {
        suffix: '01',
        en: (code) => `Lecture Hall ${code}`,
        ar: (code) => `مدرج ${code}`,
        type: 'ROOM',
      },
      {
        suffix: '04',
        en: (code) => `Mechatronics & AI Lab ${code}`,
        ar: (code) => `معمل ميكاترونكس وذكاء اصطناعي ${code}`,
        type: 'LAB',
      },
      {
        suffix: '05',
        en: (code) => `Drawing Studio ${code}`,
        ar: (code) => `صالة رسم ${code}`,
        type: 'ROOM',
      },
    ],
  },
  {
    name: 'Medical Sector Complex A & B',
    nameAr: 'مجمع الكليات الطبية',
    floors: 4,
    description: 'Faculties of Medicine, Dentistry (including dental clinics), Pharmacy, and Nursing',
    descriptionAr: 'كليات الطب والجراحة، طب الفم والأسنان (بما يشمل العيادات)، الصيدلة، والتمريض',
    rooms: [
      {
        suffix: '01',
        en: (code) => `Medical Lecture Hall ${code}`,
        ar: (code) => `مدرج طبي ${code}`,
        type: 'ROOM',
      },
      {
        suffix: '02',
        en: (code) => `Dental Clinic ${code}`,
        ar: (code) => `عيادة أسنان ${code}`,
        type: 'LAB',
      },
      {
        suffix: '04',
        en: (code) => `Clinical Skills Lab ${code}`,
        ar: (code) => `معمل المهارات الإكلينيكية ${code}`,
        type: 'LAB',
      },
    ],
  },
  {
    name: 'Humanities & Business Building',
    nameAr: 'مبنى العلوم الإنسانية والاقتصاد وإدارة الأعمال',
    floors: 4,
    description: 'Lecture halls and seminar rooms for business, economics, and administrative sciences',
    descriptionAr: 'مدرجات وقاعات سيمينار لكلية الاقتصاد وإدارة الأعمال والعلوم الإنسانية',
    rooms: [
      {
        suffix: '01',
        en: (code) => `Lecture Hall ${code}`,
        ar: (code) => `مدرج ${code}`,
        type: 'ROOM',
      },
      {
        suffix: '03',
        en: (code) => `Seminar Room ${code}`,
        ar: (code) => `قاعة سيمينار ${code}`,
        type: 'ROOM',
      },
      {
        suffix: '06',
        en: (code) => `Business Simulation Lab ${code}`,
        ar: (code) => `معمل محاكاة الأعمال ${code}`,
        type: 'LAB',
      },
    ],
  },
];

const FLOOR_LABELS_AR = [
  'الطابق الأرضي',
  'الطابق الأول',
  'الطابق الثاني',
  'الطابق الثالث',
  'الطابق الرابع',
] as const;


function buildSeedUsers(): SeedUser[] {
  return ROLES.map((role) => {
    const account = DEMO_ACCOUNTS[role];
    return {
      name: account.name,
      nameAr: account.nameAr,
      email: account.email,
      role,
      department: account.department,
      departmentAr: account.departmentAr,
      contactPhone: '+20 100 555 0100',
    };
  });
}

function buildLocations(): Array<{
  buildingName: string;
  buildingNameAr: string;
  floor: string;
  floorAr: string;
  room: string;
  roomAr: string;
  locationType: 'ROOM' | 'LAB' | 'OTHER';
  description: string;
  descriptionAr: string;
  isActive: boolean;
}> {
  return CORE_BUILDINGS.flatMap((building) =>
    Array.from({ length: building.floors }, (_, floorIndex) => {
      const floorLabel = floorIndex === 0 ? 'Ground Floor' : `Floor ${floorIndex}`;
      const floorLabelAr = FLOOR_LABELS_AR[floorIndex] ?? `الطابق ${floorIndex}`;
      const prefix = floorIndex === 0 ? 'G' : `${floorIndex}`;
      return building.rooms.map((roomSpec) => {
        const roomCode = `${prefix}${roomSpec.suffix}`;
        const roomEn = roomSpec.en(roomCode);
        const roomAr = roomSpec.ar(roomCode);
        return {
          buildingName: building.name,
          buildingNameAr: building.nameAr,
          floor: floorLabel,
          floorAr: floorLabelAr,
          room: roomEn,
          roomAr,
          locationType: roomSpec.type,
          description: `${building.description} — ${floorLabel}, ${roomEn}`,
          descriptionAr: `${building.descriptionAr} — ${floorLabelAr}، ${roomAr}`,
          isActive: true,
        };
      });
    }).flat(),
  );
}

/**
 * Wipes the configured database and recreates the demo foundation: one
 * account per role (Student, Employee, Lost & Found Manager, Super Admin),
 * four buildings with rooms, and (unless running under NODE_ENV=test
 * without an explicit override) the full Lost & Found demo dataset.
 */
export async function seedDatabase(options: SeedOptions = {}): Promise<SeedReport> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The seed script refuses to run when NODE_ENV=production');
  }

  const ownsConnection = mongoose.connection.readyState === 0;
  if (ownsConnection) {
    await mongoose.connect(env.MONGODB_URI);
  }

  try {
    await mongoose.connection.dropDatabase();

    // Recreate every collection and index explicitly after the drop.
    for (const model of ALL_MODELS) {
      await model.createIndexes();
    }

    // Counter has no secondary indexes, so initialise it explicitly.
    await Counter.insertMany(COUNTER_PREFIXES.map((_id) => ({ _id, seq: 0 })));

    const passwordHash = await hashPassword(SEED_PASSWORD);
    const seedUsers = buildSeedUsers();

    await User.insertMany(
      seedUsers.map((user) => ({
        ...user,
        passwordHash,
        isActive: true,
      })),
    );

    const locations = buildLocations();
    await Location.insertMany(locations);

    const includeDemoData = options.fullDemoData ?? process.env.NODE_ENV !== 'test';
    const demo = includeDemoData ? await seedDemoData(passwordHash) : undefined;
    const accountCount = await User.countDocuments({});
    const locationCount = await Location.countDocuments({});
    const buildingNames = await Location.distinct('buildingName');

    const report: SeedReport = {
      accounts: accountCount,
      locations: locationCount,
      buildings: buildingNames.length,
      demo,
    };

    if (!options.silent) {
      console.log('\nCampusCare Lost & Found seed complete');
      console.log('-------------------------------------');
      console.log(`Accounts:    ${report.accounts}`);
      console.log(`Buildings:   ${report.buildings}`);
      console.log(`Locations:   ${report.locations}`);
      if (report.demo) {
        console.log(
          `Lost/found:  ${report.demo.lostItems} lost, ${report.demo.foundItems} found`,
        );
        console.log(`Claims:      ${report.demo.claims}`);
        console.log(`Matches:     ${report.demo.matches}`);
        console.log(`Logs:        ${report.demo.activityLogs}`);
      }
      console.log(`\nDemo password: ${SEED_PASSWORD}\n`);
      console.log('Demo accounts:');
      for (const role of ROLES) {
        const account = DEMO_ACCOUNTS[role];
        console.log(`  ${role.padEnd(20)} ${account.email.padEnd(28)} ${account.name} (${account.nameAr})`);
      }
      console.log('');
    }

    return report;
  } finally {
    if (ownsConnection) {
      await mongoose.disconnect();
    }
  }
}

if (require.main === module) {
  void seedDatabase()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error('[campuscare-lostfound] seed failed', error);
      process.exit(1);
    });
}
