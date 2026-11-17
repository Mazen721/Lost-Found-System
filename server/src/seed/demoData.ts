import { subDays, subHours } from 'date-fns';
import { Types } from 'mongoose';
import { DEMO_ACCOUNTS } from '../config/constants';
import { User } from '../modules/auth/user.model';
import { Location } from '../modules/locations/location.model';
import { LostFoundItem } from '../modules/lost-found/items/lostFoundItem.model';
import { ItemMatch } from '../modules/lost-found/matches/itemMatch.model';
import { ClaimRequest } from '../modules/lost-found/claims/claimRequest.model';
import {
  AI_INSIGHTS_PROMPT_VERSION,
  AiInsightCache,
} from '../modules/ai/aiInsightCache.model';
import { Notification } from '../shared/models/Notification.model';
import { ActivityLog } from '../shared/models/ActivityLog.model';

export interface DemoDataCounts {
  lostItems: number;
  foundItems: number;
  matches: number;
  claims: number;
  notifications: number;
  activityLogs: number;
  insights: number;
}

const EXTRA_STUDENTS = [
  {
    name: 'Sara Mahmoud',
    nameAr: 'سارة محمود',
    email: 'sara.mahmoud@std.mansnu.edu.eg',
    department: 'Faculty of Economics and Business Administration',
    departmentAr: 'كلية الاقتصاد وإدارة الأعمال',
    contactPhone: '+20 100 555 0211',
    isActive: true,
  },
  {
    name: 'Omar Khaled',
    nameAr: 'عمر خالد',
    email: 'omar.khaled@std.mansnu.edu.eg',
    department: 'Faculty of Medicine and Surgery',
    departmentAr: 'كلية الطب والجراحة',
    contactPhone: '+20 100 555 0224',
    isActive: true,
  },
  {
    name: 'Dr. Noha El-Gayar',
    nameAr: 'د. نهى الجيار',
    email: 'n.elgayar@mansnu.edu.eg',
    department: 'Faculty of Engineering',
    departmentAr: 'كلية الهندسة',
    contactPhone: '+20 100 555 0238',
    isActive: true,
  },
  {
    name: 'Mariam El-Menshawy',
    nameAr: 'مريم المنشاوي',
    email: 'mariam.elmenshawy@std.mansnu.edu.eg',
    department: 'Faculty of Dentistry',
    departmentAr: 'كلية طب الفم والأسنان',
    contactPhone: '+20 100 555 0249',
    isActive: true,
  },
  {
    name: 'Eng. Adel El-Masry',
    nameAr: 'م. عادل المصري',
    email: 'a.elmasry@mansnu.edu.eg',
    department: 'Faculty of Pharmacy (Former Lab Coordinator)',
    departmentAr: 'كلية الصيدلة (منسق معامل سابق)',
    contactPhone: '+20 100 555 0299',
    isActive: false,
  },
];

const EXTRA_DEMO_LOCATIONS = [
  {
    buildingName: 'Central Workshops & Laboratories Building',
    buildingNameAr: 'مبنى الورش والمعامل المركزية',
    floor: 'Ground Floor',
    floorAr: 'الطابق الأرضي',
    room: 'Heavy Machinery Workshop G01',
    roomAr: 'ورشة الماكينات الثقيلة G01',
    locationType: 'LAB' as const,
    description: 'Dedicated to heavy engineering machinery, fabrication labs, and technical testing — Ground Floor, Heavy Machinery Workshop G01',
    descriptionAr: 'مخصص للماكينات الهندسية الثقيلة ومعامل التصنيع والاختبارات الفنية — الطابق الأرضي، ورشة الماكينات الثقيلة G01',
    isActive: true,
  },
  {
    buildingName: 'Central Workshops & Laboratories Building',
    buildingNameAr: 'مبنى الورش والمعامل المركزية',
    floor: 'Ground Floor',
    floorAr: 'الطابق الأرضي',
    room: 'Fabrication & Welding Lab G03',
    roomAr: 'معمل التصنيع واللحام G03',
    locationType: 'LAB' as const,
    description: 'Dedicated to heavy engineering machinery, fabrication labs, and technical testing — Ground Floor, Fabrication & Welding Lab G03',
    descriptionAr: 'مخصص للماكينات الهندسية الثقيلة ومعامل التصنيع والاختبارات الفنية — الطابق الأرضي، معمل التصنيع واللحام G03',
    isActive: true,
  },
  {
    buildingName: 'Central Workshops & Laboratories Building',
    buildingNameAr: 'مبنى الورش والمعامل المركزية',
    floor: 'Floor 1',
    floorAr: 'الطابق الأول',
    room: 'Materials Testing Lab 102',
    roomAr: 'معمل اختبار المواد 102',
    locationType: 'LAB' as const,
    description: 'Dedicated to heavy engineering machinery, fabrication labs, and technical testing — Floor 1, Materials Testing Lab 102',
    descriptionAr: 'مخصص للماكينات الهندسية الثقيلة ومعامل التصنيع والاختبارات الفنية — الطابق الأول، معمل اختبار المواد 102',
    isActive: true,
  },
  {
    buildingName: 'Central Workshops & Laboratories Building',
    buildingNameAr: 'مبنى الورش والمعامل المركزية',
    floor: 'Floor 1',
    floorAr: 'الطابق الأول',
    room: 'CNC & Mechatronics Lab 104',
    roomAr: 'معمل التحكم الرقمي والميكاترونكس 104',
    locationType: 'LAB' as const,
    description: 'Dedicated to heavy engineering machinery, fabrication labs, and technical testing — Floor 1, CNC & Mechatronics Lab 104',
    descriptionAr: 'مخصص للماكينات الهندسية الثقيلة ومعامل التصنيع والاختبارات الفنية — الطابق الأول، معمل التحكم الرقمي والميكاترونكس 104',
    isActive: true,
  },
  {
    buildingName: 'Student Activities & Sports Complex',
    buildingNameAr: 'منطقة الأنشطة الطلابية والملاعب الرياضية',
    floor: 'Ground Floor',
    floorAr: 'الطابق الأرضي',
    room: 'Central Student Cafeteria G01',
    roomAr: 'الكافتيريا الطلابية المركزية G01',
    locationType: 'OTHER' as const,
    description: 'Multi-purpose courts, student cafeterias, and social hubs — Ground Floor, Central Student Cafeteria G01',
    descriptionAr: 'الملاعب متعددة الأغراض والكافتيريات الطلابية والمراكز الاجتماعية — الطابق الأرضي، الكافتيريا الطلابية المركزية G01',
    isActive: true,
  },
  {
    buildingName: 'Student Activities & Sports Complex',
    buildingNameAr: 'منطقة الأنشطة الطلابية والملاعب الرياضية',
    floor: 'Ground Floor',
    floorAr: 'الطابق الأرضي',
    room: 'Multi-Purpose Sports Court G05',
    roomAr: 'الملعب الرياضي متعدد الأغراض G05',
    locationType: 'OTHER' as const,
    description: 'Multi-purpose courts, student cafeterias, and social hubs — Ground Floor, Multi-Purpose Sports Court G05',
    descriptionAr: 'الملاعب متعددة الأغراض والكافتيريات الطلابية والمراكز الاجتماعية — الطابق الأرضي، الملعب الرياضي متعدد الأغراض G05',
    isActive: true,
  },
  {
    buildingName: 'Student Activities & Sports Complex',
    buildingNameAr: 'منطقة الأنشطة الطلابية والملاعب الرياضية',
    floor: 'Floor 1',
    floorAr: 'الطابق الأول',
    room: 'Student Union & Activities Hub 101',
    roomAr: 'مقر اتحاد الطلاب والأنشطة 101',
    locationType: 'ROOM' as const,
    description: 'Multi-purpose courts, student cafeterias, and social hubs — Floor 1, Student Union & Activities Hub 101',
    descriptionAr: 'الملاعب متعددة الأغراض والكافتيريات الطلابية والمراكز الاجتماعية — الطابق الأول، مقر اتحاد الطلاب والأنشطة 101',
    isActive: true,
  },
];

interface ItemSpec {
  key: string;
  photos: string[];
  reportType: 'LOST' | 'FOUND';
  itemTitle: string;
  itemTitleAr?: string;
  description: string;
  descriptionAr?: string;
  privateIdentificationDetails: string;
  category: 'Electronics' | 'Phones' | 'Laptops' | 'Headphones' | 'Wallets' | 'Bags' | 'Keys' | 'Documents' | 'Accessories' | 'Books' | 'Clothing' | 'Other';
  color?: string;
  colorAr?: string;
  brand?: string;
  brandAr?: string;
  reporterEmail: string;
  building: 'Engineering' | 'Administration' | 'Medical' | 'Humanities' | 'Workshops' | 'Sports';
  locationIndex: number;
  locationDetails: string;
  locationDetailsAr?: string;
  occurrenceDaysAgo: number;
  status: 'OPEN' | 'MATCH_CONFIRMED' | 'CLAIM_UNDER_REVIEW' | 'APPROVED_FOR_HANDOVER' | 'RETURNED' | 'CLOSED';
}

interface ClaimSpec {
  itemKey: string;
  linkedLostKey?: string;
  claimantEmail: string;
  claimDescription: string;
  claimDescriptionAr?: string;
  identifyingDetailsProvided: string;
  status: 'PENDING_REVIEW' | 'UNDER_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  verificationNotes?: string;
  verificationNotesAr?: string;
  rejectionReason?: string;
  rejectionReasonAr?: string;
  reviewed: boolean;
  handover?: {
    receivedByName: string;
    receivedByNameAr?: string;
    notes?: string;
    notesAr?: string;
    handedOverAt: Date;
  };
}

function daysAgo(days: number, hour = 9): Date {
  const date = subDays(new Date(), days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function hoursAgo(hours: number): Date {
  return subHours(new Date(), hours);
}

function pick<T>(values: T[], index: number): T {
  const value = values[index % values.length];
  if (!value) {
    throw new Error('Seed requires at least one value in the collection');
  }
  return value;
}


const DEMO_STUDENT_EMAIL = DEMO_ACCOUNTS.STUDENT.email;
const DEMO_EMPLOYEE_EMAIL = DEMO_ACCOUNTS.EMPLOYEE.email;
const EXTRA_STUDENT_EMAILS = EXTRA_STUDENTS.map((student) => student.email);

/**
 * Creates the demo dataset: extra student/employee users, extra locations,
 * lost & found records, matches, claims, notifications, activity logs and
 * cached Arabic AI insights. Demo accounts and core locations must already
 * exist (see seed.ts).
 */
export async function seedDemoData(passwordHash: string): Promise<DemoDataCounts> {
  await User.insertMany(
    EXTRA_STUDENTS.map((student) => ({
      ...student,
      role: student.email.includes('@std.') ? ('STUDENT' as const) : ('EMPLOYEE' as const),
      passwordHash,
    })),
  );

  await Location.insertMany(EXTRA_DEMO_LOCATIONS);

  const users = await User.find({}).select('name nameAr email role').lean();
  const locations = await Location.find({ isActive: true })
    .select('buildingName buildingNameAr floor floorAr room roomAr')
    .lean();

  const userId = (email: string): Types.ObjectId => {
    const user = users.find((entry) => entry.email === email);
    if (!user) throw new Error(`Seed user not found: ${email}`);
    return user._id;
  };

  const locationId = (
    building: ItemSpec['building'],
    index: number,
  ): Types.ObjectId => {
    const matching = locations.filter((location) =>
      location.buildingName.includes(building),
    );
    return pick(matching, index)._id;
  };

  const managerId = userId(DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email);
  const adminId = userId(DEMO_ACCOUNTS.SUPER_ADMIN.email);
  const demoStudentId = userId(DEMO_STUDENT_EMAIL);
  const demoEmployeeId = userId(DEMO_EMPLOYEE_EMAIL);

  // Lost & found
  // ---------------------------------------------------------------------------
  const itemSpecs: ItemSpec[] = [
    {
      key: 'lost-backpack',
      photos: ['https://cdn.iz.ru/sites/default/files/styles/900x506/public/news-2025-02/ANS04225_0.jpg?itok=vkc5hX33', 'https://bagdup.com/cdn/shop/files/c7f8cadad2941c8320bc73c02a5715b9ff1f7ad1725837b8c5c4905b27390ec1.jpg?v=1743096763&width=980'],
      itemTitleAr: 'شنطة ضهر سودا',
      descriptionAr:
        'ضاعت مني الشنطة السودا بعد محاضرة بعد الضهر جنب معمل الهندسة، فيها كتب وميدالية مفاتيح زرقا في الجيب الأمامي.',
      colorAr: 'أسود',
      brandAr: 'North Face',
      locationDetailsAr: 'مقعد خارج معمل 204',
      reportType: 'LOST',
      itemTitle: 'My black backpack is gone',
      description:
        'I lost my black backpack after the afternoon lecture near the engineering lab. It has books and a blue keychain in the front pocket.',
      privateIdentificationDetails:
        'Initials Y.E. written under the flap and a blue keychain in the front pocket.',
      category: 'Bags',
      color: 'Black',
      brand: 'North Face',
      reporterEmail: DEMO_STUDENT_EMAIL,
      building: 'Engineering',
      locationIndex: 2,
      locationDetails: 'Bench outside Lab 204',
      occurrenceDaysAgo: 30,
      status: 'MATCH_CONFIRMED',
    },
    {
      key: 'found-backpack',
      photos: ['https://newscast.jp/attachments/OBQOuQUmHWPPP7JhEc9e.jpg?w=700&h=700'],
      itemTitleAr: 'حقيبة ظهر لقيتها جنب معمل الهندسة',
      descriptionAr:
        'لقيت شنطة ضهر سودا عند باب معمل الهندسة، في جيبها الأمامي ميدالية مفاتيح زرقا ومذكرات ميكاترونكس، سلمتها لمكتب الاستقبال.',
      colorAr: 'أسود',
      brandAr: 'North Face',
      locationDetailsAr: 'مكتب استقبال معمل 204',
      reportType: 'FOUND',
      itemTitle: 'Backpack found by the engineering lab',
      description:
        'Found a black backpack by the engineering lab door. There is a blue keychain and mechatronics notes in the front pocket. Handed it to the reception desk.',
      privateIdentificationDetails:
        'Initials Y.E. written under the flap and a blue keychain in the front pocket.',
      category: 'Bags',
      color: 'Black',
      brand: 'North Face',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Engineering',
      locationIndex: 2,
      locationDetails: 'Lab 204 reception desk',
      occurrenceDaysAgo: 29,
      status: 'CLAIM_UNDER_REVIEW',
    },
    {
      key: 'lost-bottle',
      photos: ['https://images.pexels.com/photos/7869542/pexels-photo-7869542.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      itemTitleAr: 'قارورة ميه',
      descriptionAr:
        'قارورة الميه الزرقا بتاعتي ضاعت ما بين الكافتيريا والمكتبة، غطاها فيه خبطة باينة وملزوق عليها ستيكر كلية الهندسة.',
      colorAr: 'أزرق',
      brandAr: 'Thermos',
      locationDetailsAr: 'منطقة جلوس الكافتيريا',
      reportType: 'LOST',
      itemTitle: 'My water bottle',
      description:
        'My blue water bottle went missing between the cafeteria and the library. The lid has a visible dent and an engineering faculty sticker on it.',
      privateIdentificationDetails: 'Dented lid and a faded engineering faculty sticker.',
      category: 'Other',
      color: 'Blue',
      brand: 'Thermos',
      reporterEmail: EXTRA_STUDENT_EMAILS[0]!,
      building: 'Administration',
      locationIndex: 6,
      locationDetails: 'Cafeteria seating area',
      occurrenceDaysAgo: 12,
      status: 'OPEN',
    },
    {
      key: 'found-bottle',
      photos: ['https://portal-images.azureedge.net/auctions-2024/sphere10036/images/ab09b42c-7544-4781-993f-b13a00d425c6.jpg?w=1920&h=1920&mode=max'],
      itemTitleAr: 'زجاجة ماء ستانلس زرقا',
      descriptionAr:
        'لقيت زجاجة ماء ستانلس لونها أزرق على ترابيزة مذاكرة في المكتبة، غطاها مخبوط وعليها ستيكر كلية الهندسة.',
      colorAr: 'أزرق',
      locationDetailsAr: 'طاولة دراسة بالطابق الثاني بالمكتبة',
      reportType: 'FOUND',
      itemTitle: 'Blue steel bottle found in library',
      description:
        'Found a blue stainless water bottle on a study table in the library. Its lid is dented and it has an engineering faculty sticker.',
      privateIdentificationDetails: 'Dented lid and a faded engineering faculty sticker.',
      category: 'Other',
      color: 'Blue',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Administration',
      locationIndex: 9,
      locationDetails: 'Library second-floor study table',
      occurrenceDaysAgo: 9,
      status: 'OPEN',
    },
    {
      key: 'lost-phone',
      photos: ['https://comunidad.movistar.es/t5/s/movistar/images/bS0zMjgxNzQ4LTEyODQ2M2lGMkJGNDNGMUYyQTU5MDQy?image-dimensions=992x558&revision=3'],
      itemTitleAr: 'موبايل ضاع مني',
      descriptionAr:
        'ضاع مني الموبايل عند مدخل المجمع الطبي، لونه فضي وحاطه في جراب شفاف، وشاشة القفل عليها صورة قطة.',
      colorAr: 'فضي',
      brandAr: 'Apple',
      locationDetailsAr: 'درج المدخل الرئيسي',
      reportType: 'LOST',
      itemTitle: 'Lost my phone',
      description:
        'Lost my phone at the medical complex entrance. It is silver in a clear case and the lock screen has a cat photo.',
      privateIdentificationDetails:
        'IMEI ending 4812, clear case with a cat wallpaper and a small crack on the corner.',
      category: 'Phones',
      color: 'Silver',
      brand: 'Apple',
      reporterEmail: EXTRA_STUDENT_EMAILS[1]!,
      building: 'Medical',
      locationIndex: 5,
      locationDetails: 'Main entrance steps',
      occurrenceDaysAgo: 18,
      status: 'MATCH_CONFIRMED',
    },
    {
      key: 'found-phone',
      photos: ['https://cdn.mos.cms.futurecdn.net/t5Wa5J3C4imLbytYaHQPkh.jpg'],
      itemTitleAr: 'آيفون 13 لونه فضي',
      descriptionAr:
        'لقيت آيفون 13 فضي في جراب شفاف عند مدخل المجمع الطبي، التليفون مقفول ومسلمته لمكتب الأمن.',
      colorAr: 'فضي',
      brandAr: 'Apple',
      locationDetailsAr: 'مكتب الأمن عند المدخل الرئيسي',
      reportType: 'FOUND',
      itemTitle: 'iPhone 13 found',
      description:
        'Found a silver iPhone 13 in a clear case at the medical complex entrance. The phone is off; handed it to the security desk.',
      privateIdentificationDetails:
        'IMEI ending 4812, clear case with a cat wallpaper and a small crack on the corner.',
      category: 'Phones',
      color: 'Silver',
      brand: 'Apple',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Medical',
      locationIndex: 5,
      locationDetails: 'Security desk at the main entrance',
      occurrenceDaysAgo: 17,
      status: 'CLAIM_UNDER_REVIEW',
    },
    {
      key: 'lost-keys',
      photos: ['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Key_ring.jpg/330px-Key_ring.jpg'],
      itemTitleAr: 'مفاتيحي ضاعت',
      descriptionAr:
        'ضاعت مني سلسلة مفاتيح فيها تلات مفاتيح وميدالية بلاستيك حمرا جنب بوابة مبنى العلوم الإنسانية.',
      colorAr: 'فضي',
      locationDetailsAr: 'البوابة الرئيسية لمبنى العلوم الإنسانية',
      reportType: 'LOST',
      itemTitle: 'Lost my keys',
      description:
        'I lost a key ring with three keys and a red plastic tag near the humanities building gate.',
      privateIdentificationDetails:
        'Red tag marked M.A. and a small brass key for a bicycle lock.',
      category: 'Keys',
      color: 'Silver',
      reporterEmail: EXTRA_STUDENT_EMAILS[0]!,
      building: 'Humanities',
      locationIndex: 4,
      locationDetails: 'Humanities building main gate',
      occurrenceDaysAgo: 36,
      status: 'RETURNED',
    },
    {
      key: 'found-keys',
      photos: ['https://static2sensa.mondo.rs/api/v3/images/1280/2560/104349?ts=2026-08-24T15:39:10'],
      itemTitleAr: 'سلسلة مفاتيح بميدالية حمرا',
      descriptionAr:
        'لقيت سلسلة مفاتيح تلاتة بميدالية حمرا عند بوابة مبنى العلوم الإنسانية وسلمتها لمكتب الأمن.',
      colorAr: 'فضي',
      locationDetailsAr: 'مكتب الأمن',
      reportType: 'FOUND',
      itemTitle: 'Keys with red tag found',
      description:
        'Found a ring of three keys with a red tag at the humanities building gate. Handed it to the security office.',
      privateIdentificationDetails:
        'Red tag marked M.A. and a small brass key for a bicycle lock.',
      category: 'Keys',
      color: 'Silver',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Humanities',
      locationIndex: 4,
      locationDetails: 'Security office',
      occurrenceDaysAgo: 35,
      status: 'RETURNED',
    },
    {
      key: 'lost-umbrella',
      photos: ['https://p1-a50ece1c.imageflux.jp/c/f=webp:jpeg,w=1024,h=1024,a=0/store/reviewattachmentfile/53/16402/file/4b49c7b6d9db3e92ba4bfaad80ecaa63.jpeg'],
      itemTitleAr: 'مظلة',
      descriptionAr:
        'فقدت مظلة سادة بمقبض خشب في بهو المكتبة يوم المطر، حزامها أسود وفيها خدش أبيض صغير.',
      colorAr: 'كحلي',
      locationDetailsAr: 'بهو المكتبة',
      reportType: 'LOST',
      itemTitle: 'Umbrella',
      description:
        'Lost a plain umbrella with a wooden handle in the library lobby on the rainy day. It has a black strap and a small white scratch.',
      privateIdentificationDetails: 'Wooden handle with a small white scratch and a black strap.',
      category: 'Other',
      color: 'Navy blue',
      reporterEmail: DEMO_STUDENT_EMAIL,
      building: 'Administration',
      locationIndex: 4,
      locationDetails: 'Library lobby',
      occurrenceDaysAgo: 15,
      status: 'OPEN',
    },
    {
      key: 'found-umbrella',
      photos: ['https://cdn.shopify.com/s/files/1/0560/0008/6216/files/200856_1.jpg?v=1689917727'],
      itemTitleAr: 'شمسية كحلي منقطة',
      descriptionAr:
        'لقيت شمسية كحلي منقطة بنقط بيضا بمقبض بلاستيك عند مدخل المكتبة وسبتها عند الأمن.',
      colorAr: 'كحلي',
      locationDetailsAr: 'مدخل المكتبة',
      reportType: 'FOUND',
      itemTitle: 'Polka dot umbrella found',
      description:
        'Found a navy polka dot umbrella with white dots and a plastic handle by the library entrance. Left it with security.',
      privateIdentificationDetails: 'White polka dots, a black plastic handle and a torn hanging loop.',
      category: 'Other',
      color: 'Navy blue',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Administration',
      locationIndex: 4,
      locationDetails: 'Library entrance',
      occurrenceDaysAgo: 14,
      status: 'OPEN',
    },
    {
      key: 'lost-id',
      photos: ['https://localwiki.org/media/cache/4c/2d/4c2dc1585136f7e4da4355f7833041d0.jpg'],
      itemTitleAr: 'بطاقتي الجامعية',
      descriptionAr:
        'بطاقتي الجامعية ضاعت في ممر قاعات المحاضرات بمبنى العلوم الإنسانية، محطوطة في جراب شفاف.',
      locationDetailsAr: 'ممر قاعات المحاضرات',
      reportType: 'LOST',
      itemTitle: 'My student ID',
      description:
        'My student ID card went missing in the lecture hall corridor of the humanities building. It is in a transparent holder.',
      privateIdentificationDetails:
        'Student ID 2023-1187 issued to Sara Mahmoud and a small passport photo inside the holder.',
      category: 'Documents',
      reporterEmail: EXTRA_STUDENT_EMAILS[0]!,
      building: 'Humanities',
      locationIndex: 8,
      locationDetails: 'Lecture hall corridor',
      occurrenceDaysAgo: 6,
      status: 'OPEN',
    },
    {
      key: 'found-id',
      photos: ['https://img1.kakaocdn.net/thumb/R1280x0.fwebp/?fname=https://t1.kakaocdn.net/brunch/service/user/iI3H/image/3zH_htMcYIg7__La9TPVHN8gAMQ'],
      itemTitleAr: 'كارنيه جامعة في جراب شفاف',
      descriptionAr:
        'لقيت كارنيه جامعة في جراب شفاف على أرض ممر العلوم الإنسانية وسلمته لاستقبال الكلية.',
      locationDetailsAr: 'استقبال كلية العلوم الإنسانية',
      reportType: 'FOUND',
      itemTitle: 'University ID in clear holder',
      description:
        'Found a university ID card in a clear holder on the floor of the humanities corridor. Handed it to the faculty reception.',
      privateIdentificationDetails:
        'Student ID 2023-1187 issued to Sara Mahmoud and a small passport photo inside the holder.',
      category: 'Documents',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Humanities',
      locationIndex: 8,
      locationDetails: 'Humanities reception',
      occurrenceDaysAgo: 5,
      status: 'APPROVED_FOR_HANDOVER',
    },
    {
      key: 'lost-hoodie',
      photos: ['https://img.tori.net/dynamic/1280w/item/36653863/aaf0dcfd-8163-426d-917e-2de11557fedf'],
      itemTitleAr: 'هودي رمادي',
      descriptionAr:
        'نسيت الهودي الرمادي بتاعي في قاعة استذكار الهندسة، على كمه بقعة حبر صغيرة ورباطه ناقص من ناحية الشمال.',
      colorAr: 'رمادي',
      locationDetailsAr: 'قاعة استذكار 2',
      reportType: 'LOST',
      itemTitle: 'Grey hoodie',
      description:
        'Left my grey hoodie in the engineering study room. It has a small ink stain on the sleeve and the drawstring is missing on the left side.',
      privateIdentificationDetails: 'Drawstring missing on the left side and an ink stain on the cuff.',
      category: 'Clothing',
      color: 'Grey',
      reporterEmail: EXTRA_STUDENT_EMAILS[1]!,
      building: 'Engineering',
      locationIndex: 6,
      locationDetails: 'Study room 2',
      occurrenceDaysAgo: 4,
      status: 'OPEN',
    },
    {
      key: 'found-hoodie',
      photos: ['https://talc-paris.fr/cdn/shop/files/NEW_Menu_images-7.jpg?v=1741888609&width=540'],
      itemTitleAr: 'سويت شيرت رصاصي',
      descriptionAr:
        'لقيت سويت شيرت رصاصي على كرسي في قاعة استذكار الهندسة، على الكم بقعة حبر ورباطه ناقص.',
      colorAr: 'رصاصي',
      locationDetailsAr: 'قاعة استذكار 2',
      reportType: 'FOUND',
      itemTitle: 'Grey sweatshirt left behind',
      description:
        'Found a grey sweatshirt on a chair in the engineering study room. There is an ink stain on the sleeve and a missing drawstring.',
      privateIdentificationDetails: 'Drawstring missing on the left side and an ink stain on the cuff.',
      category: 'Clothing',
      color: 'Grey',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Engineering',
      locationIndex: 6,
      locationDetails: 'Study room 2',
      occurrenceDaysAgo: 3,
      status: 'OPEN',
    },
    {
      key: 'lost-textbook',
      photos: ['https://www.lsmason.com/images/wp-59-600.jpg'],
      itemTitleAr: 'كتاب الداتا ستراكشر',
      descriptionAr:
        'فقدت كتاب الداتا ستراكشر في قاعة القراءة بالمكتبة، مكتوب اسم عمر خالد جوه الغلاف وملون على الفصل الرابع.',
      locationDetailsAr: 'قاعة القراءة بالمكتبة',
      reportType: 'LOST',
      itemTitle: 'Data structures book',
      description:
        'Lost my data structures textbook in the library reading room. The name Omar Khaled is written inside the cover and chapter four is highlighted.',
      privateIdentificationDetails: 'Name Omar Khaled inside the cover and highlighted chapter 4.',
      category: 'Books',
      reporterEmail: EXTRA_STUDENT_EMAILS[1]!,
      building: 'Administration',
      locationIndex: 7,
      locationDetails: 'Library reading room',
      occurrenceDaysAgo: 25,
      status: 'OPEN',
    },
    {
      key: 'found-textbook',
      photos: ['https://images.pexels.com/photos/4219042/pexels-photo-4219042.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      itemTitleAr: 'كتاب هياكل البيانات Data Structures',
      descriptionAr:
        'لقيت كتاب هياكل البيانات متساب على مكتب في قاعة القراءة بالمكتبة بعد ميعاد القفل، مكتوب فيه اسم عمر خالد.',
      locationDetailsAr: 'قاعة القراءة بالمكتبة',
      reportType: 'FOUND',
      itemTitle: 'Data Structures textbook found',
      description:
        'Found a data structures textbook left on a desk in the library reading room after closing. The name Omar Khaled is written inside.',
      privateIdentificationDetails: 'Name Omar Khaled inside the cover and highlighted chapter 4.',
      category: 'Books',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Administration',
      locationIndex: 7,
      locationDetails: 'Library reading room',
      occurrenceDaysAgo: 24,
      status: 'CLOSED',
    },
    {
      key: 'lost-usb',
      photos: ['https://www.getusb.info/wp-content/uploads/2022/06/060622a.jpg'],
      itemTitleAr: 'فلاشة ٣٢ جيجا',
      descriptionAr:
        'فقدت فلاشة سودا بغطا أحمر جنب طابعات معمل الحاسب، عليها ملفات مشروع التخرج.',
      colorAr: 'أسود',
      locationDetailsAr: 'منطقة طابعات معمل الحاسب',
      reportType: 'LOST',
      itemTitle: 'USB stick 32 GB',
      description:
        'Lost a black USB stick with a red cap near the computer lab printers. It has my graduation project files on it.',
      privateIdentificationDetails: 'Serial ending 7461 and a red plastic cap.',
      category: 'Electronics',
      color: 'Black',
      reporterEmail: DEMO_STUDENT_EMAIL,
      building: 'Engineering',
      locationIndex: 7,
      locationDetails: 'Computer lab printer area',
      occurrenceDaysAgo: 50,
      status: 'CLOSED',
    },
    {
      key: 'found-usb',
      photos: ['https://crossplay.pl/wp-content/uploads/2026/07/w8_2.jpg'],
      itemTitleAr: 'USB Kingston 32GB أسود',
      descriptionAr:
        'لقيت فلاشة USB كينجستون 32 جيجا لونها أسود وغطاها أحمر عند طابعات معمل الحاسب.',
      colorAr: 'أسود',
      locationDetailsAr: 'منطقة طابعات معمل الحاسب',
      reportType: 'FOUND',
      itemTitle: 'Kingston USB 32GB',
      description:
        'Found a black Kingston 32GB USB stick with a red cap by the computer lab printers.',
      privateIdentificationDetails: 'Serial ending 7461 and a red plastic cap.',
      category: 'Electronics',
      color: 'Black',
      brand: 'Kingston',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Engineering',
      locationIndex: 7,
      locationDetails: 'Computer lab printer area',
      occurrenceDaysAgo: 49,
      status: 'OPEN',
    },
    {
      key: 'lost-headphones',
      photos: ['https://images.pexels.com/photos/610945/pexels-photo-610945.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      itemTitleAr: 'سماعات سوني',
      descriptionAr:
        'فقدت سماعات سوني سودا في جراب رمادي عند استراحة الورش الهندسية، جوه الجراب سلك شحن وستيكر أزرق صغير.',
      colorAr: 'أسود',
      brandAr: 'Sony',
      locationDetailsAr: 'منطقة استراحة الورش الهندسية',
      reportType: 'LOST',
      itemTitle: 'Sony headphones',
      description:
        'Lost my black Sony headphones in a grey case at the engineering workshops break area. Inside the case there is a charging cable and a small blue sticker.',
      privateIdentificationDetails:
        'Small blue sticker inside the case lid and a spare USB-C cable tucked in the mesh pocket.',
      category: 'Headphones',
      color: 'Black',
      brand: 'Sony',
      reporterEmail: DEMO_STUDENT_EMAIL,
      building: 'Workshops',
      locationIndex: 1,
      locationDetails: 'Engineering workshops break area',
      occurrenceDaysAgo: 5,
      status: 'MATCH_CONFIRMED',
    },
    {
      key: 'found-headphones',
      photos: ['https://images.pexels.com/photos/11340544/pexels-photo-11340544.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      itemTitleAr: 'هيدفون Sony WH-CH720N أسود',
      descriptionAr:
        'لقيت هيدفون سوني أسود موديل WH-CH720N في جراب رمادي عند نقطة أمن الورش الهندسية، معاه سلك شحن وستيكر أزرق.',
      colorAr: 'أسود',
      brandAr: 'Sony',
      locationDetailsAr: 'نقطة أمن الورش الهندسية',
      reportType: 'FOUND',
      itemTitle: 'Sony WH-CH720N headphones',
      description:
        'Found black Sony WH-CH720N headphones in a grey case at the engineering workshops security point, with a charging cable and a blue sticker.',
      privateIdentificationDetails:
        'Small blue sticker inside the case lid and a spare USB-C cable tucked in the mesh pocket.',
      category: 'Headphones',
      color: 'Black',
      brand: 'Sony',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Workshops',
      locationIndex: 1,
      locationDetails: 'Engineering workshops security desk',
      occurrenceDaysAgo: 4,
      status: 'CLAIM_UNDER_REVIEW',
    },
    {
      key: 'lost-wallet',
      photos: ['https://images.pexels.com/photos/33277784/pexels-photo-33277784.jpeg?auto=compress&cs=tinysrgb&w=1200'],
      itemTitleAr: 'محفظتي الجلد',
      descriptionAr:
        'ضاعت محفظتي الجلد البني في مدرجات الصالة الرياضية المغطاة، فيها بطاقة المكتبة وكروت مواصلات وتذكرة قطر مطوية.',
      colorAr: 'بني',
      locationDetailsAr: 'مدرجات الصالة الرياضية',
      reportType: 'LOST',
      itemTitle: 'My leather wallet',
      description:
        'My brown leather wallet went missing in the indoor sports hall stands. It holds a library card, transit cards and a folded train ticket.',
      privateIdentificationDetails:
        'Library barcode ending 319 and a folded train ticket in the side slot.',
      category: 'Wallets',
      color: 'Brown',
      reporterEmail: EXTRA_STUDENT_EMAILS[2]!,
      building: 'Sports',
      locationIndex: 1,
      locationDetails: 'Indoor sports hall stands',
      occurrenceDaysAgo: 5,
      status: 'RETURNED',
    },
    {
      key: 'found-wallet',
      photos: ['https://i.etsystatic.com/61921830/r/il/e4c9fd/7950078557/il_600x600.7950078557_2ag0.jpg'],
      itemTitleAr: 'بوك بني جلد طبيعي',
      descriptionAr:
        'لقيت بوك بني جلد طبيعي عند مدخل مدرجات الصالة الرياضية، جواه بطاقة مكتبة وكروت مواصلات.',
      colorAr: 'بني',
      locationDetailsAr: 'مكتب مشرف الصالة الرياضية',
      reportType: 'FOUND',
      itemTitle: 'Brown leather wallet found',
      description:
        'Found a brown natural leather wallet by the sports hall stands entrance, with a library card and transit cards inside.',
      privateIdentificationDetails:
        'Library barcode ending 319 and a folded train ticket in the side slot.',
      category: 'Wallets',
      color: 'Brown',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Sports',
      locationIndex: 1,
      locationDetails: 'Sports hall supervisor desk',
      occurrenceDaysAgo: 4,
      status: 'RETURNED',
    },
    {
      key: 'lost-calculator',
      photos: ['https://everylittlethingblog.weebly.com/uploads/4/3/7/8/43783451/img-5415_orig.jpg'],
      itemTitleAr: 'آلة حاسبة كاسيو',
      descriptionAr:
        'فقدت آلة حاسبة كاسيو علمية بغطا منزلق في مدرج الهندسة ٣، محفور على ضهرها حروف T.N.',
      colorAr: 'أسود',
      brandAr: 'Casio',
      locationDetailsAr: 'مدرج 3 - كلية الهندسة',
      reportType: 'LOST',
      itemTitle: 'Casio calculator',
      description:
        'Lost a Casio scientific calculator with a sliding cover in Engineering Lecture Hall 3. The initials T.N. are etched on its back.',
      privateIdentificationDetails:
        'Initials T.N. etched on the back sliding cover and yellow tape mark on the side.',
      category: 'Electronics',
      color: 'Black',
      brand: 'Casio',
      reporterEmail: EXTRA_STUDENT_EMAILS[3]!,
      building: 'Engineering',
      locationIndex: 3,
      locationDetails: 'Engineering Lecture Hall 3',
      occurrenceDaysAgo: 3,
      status: 'OPEN',
    },
    {
      key: 'found-calculator',
      photos: ['https://email-editor-production.s3.amazonaws.com/images/596438/admin-ajax_32.jpeg'],
      itemTitleAr: 'Casio fx-991ARX',
      descriptionAr:
        'لقيت آلة حاسبة كاسيو fx-991ARX على منصة مدرج الهندسة ٣، على ضهرها حروف T.N. وغطاها منزلق.',
      colorAr: 'أسود',
      brandAr: 'Casio',
      locationDetailsAr: 'منصة مدرج الهندسة 3',
      reportType: 'FOUND',
      itemTitle: 'Casio fx-991ARX calculator',
      description:
        'Found a Casio fx-991ARX calculator on the podium of Engineering Lecture Hall 3, with T.N. etched on the back and a sliding cover.',
      privateIdentificationDetails:
        'Initials T.N. etched on the back sliding cover and yellow tape mark on the side.',
      category: 'Electronics',
      color: 'Black',
      brand: 'Casio',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Engineering',
      locationIndex: 3,
      locationDetails: 'Engineering Lecture Hall 3 podium',
      occurrenceDaysAgo: 2,
      status: 'OPEN',
    },
    {
      key: 'found-charger',
      photos: ['https://upload.wikimedia.org/wikipedia/commons/b/b0/Lenovo_mini_laptop_Charger.jpg'],
      itemTitleAr: 'شاحن لاب توب لينوفو',
      descriptionAr:
        'لقيت شاحن لاب توب لينوفو 65 واط متوصل في فيشة في منطقة القراءة الهادية بالمبنى الإداري.',
      colorAr: 'أسود',
      brandAr: 'Lenovo',
      locationDetailsAr: 'منطقة القراءة الهادئة بالمبنى الإداري',
      reportType: 'FOUND',
      itemTitle: 'Lenovo laptop charger',
      description:
        'Found a Lenovo 65W laptop charger plugged into a socket in the Administration quiet study zone.',
      privateIdentificationDetails:
        'Velcro strap with silver fabric tag and serial ending 902B.',
      category: 'Laptops',
      color: 'Black',
      brand: 'Lenovo',
      reporterEmail: DEMO_ACCOUNTS.LOST_FOUND_MANAGER.email,
      building: 'Administration',
      locationIndex: 2,
      locationDetails: 'Administration quiet study zone',
      occurrenceDaysAgo: 3,
      status: 'APPROVED_FOR_HANDOVER',
    },
    {
      key: 'found-glasses',
      photos: ['https://optika-kamenets.com.ua/wp-content/uploads/2025/09/care_for_glasses-1024x683-1.jpg'],
      itemTitleAr: 'نضارة في علبة سودا',
      descriptionAr:
        'لقيت نضارة طبية إطارها أسود في علبة سودا في صالة انتظار المجمع الطبي وسلمتها للأمن.',
      colorAr: 'أسود',
      locationDetailsAr: 'استقبال المجمع الطبي',
      reportType: 'FOUND',
      itemTitle: 'Glasses in a black case',
      description:
        'Found black-framed prescription glasses inside a black hard case in the Medical Complex waiting area and handed them to security.',
      privateIdentificationDetails:
        'Microfiber cloth printed with optical shop logo inside the case.',
      category: 'Accessories',
      color: 'Black',
      reporterEmail: DEMO_STUDENT_EMAIL,
      building: 'Medical',
      locationIndex: 2,
      locationDetails: 'Medical Complex reception',
      occurrenceDaysAgo: 6,
      status: 'CLOSED',
    },
  ];

  const itemDocs = itemSpecs.map((spec, index) => ({
    _id: new Types.ObjectId(),
    reportNumber: `LF-${2001 + index}`,
    reportType: spec.reportType,
    itemTitle: spec.itemTitle,
    itemTitleAr: spec.itemTitleAr,
    description: spec.description,
    descriptionAr: spec.descriptionAr,
    privateIdentificationDetails: spec.privateIdentificationDetails,
    category: spec.category,
    color: spec.color,
    colorAr: spec.colorAr,
    brand: spec.brand,
    brandAr: spec.brandAr,
    locationId: locationId(spec.building, spec.locationIndex),
    locationDetails: spec.locationDetails,
    locationDetailsAr: spec.locationDetailsAr,
    occurrenceDate: daysAgo(spec.occurrenceDaysAgo, 12),
    images: spec.photos.map((url, imageIndex) => ({
      url,
      publicId: `seed/${spec.key}-${imageIndex + 1}`,
    })),
    reporterId: userId(spec.reporterEmail),
    status: spec.status,
    createdAt: daysAgo(spec.occurrenceDaysAgo, 13),
    updatedAt: daysAgo(Math.max(1, spec.occurrenceDaysAgo - 1), 13),
  }));

  const itemByKey = new Map(
    itemSpecs.map((spec, index) => [spec.key, itemDocs[index]!]),
  );

  await LostFoundItem.insertMany(itemDocs);

  // Scores, levels and breakdowns below are the matching engine v2's real
  // output for these pairs (specs/002-hard-matching) — the seed texts are
  // written the way two different people would write them, so the numbers
  // are whatever the deterministic scorer honestly computes.
  const matchSpecs = [
    { lost: 'lost-backpack', found: 'found-backpack', score: 86.67, level: 'STRONG', status: 'CONFIRMED', createdDaysAgo: 10, updatedDaysAgo: 2, breakdown: { category: 1, title: 0.3333, location: 1, date: 1, color: 1, brand: 1, keywords: 1 } },
    { lost: 'lost-bottle', found: 'found-bottle', score: 77.65, level: 'POSSIBLE', status: 'SUGGESTED', createdDaysAgo: 10, updatedDaysAgo: 2, breakdown: { category: 1, title: 0.4444, location: 0.6, date: 0.8, color: 1, brand: 0, keywords: 1 } },
    { lost: 'lost-phone', found: 'found-phone', score: 83.57, level: 'STRONG', status: 'SUGGESTED', createdDaysAgo: 10, updatedDaysAgo: 2, breakdown: { category: 1, title: 0.2, location: 1, date: 1, color: 1, brand: 1, keywords: 0.9565 } },
    { lost: 'lost-keys', found: 'found-keys', score: 83.33, level: 'STRONG', status: 'CONFIRMED', createdDaysAgo: 10, updatedDaysAgo: 2, breakdown: { category: 1, title: 0.25, location: 1, date: 1, color: 1, brand: 0, keywords: 1 } },
    { lost: 'lost-umbrella', found: 'found-umbrella', score: 78.81, level: 'POSSIBLE', status: 'DISMISSED', createdDaysAgo: 10, updatedDaysAgo: 2, breakdown: { category: 1, title: 0.2857, location: 1, date: 1, color: 1, brand: 0, keywords: 0.5217 } },
    { lost: 'lost-headphones', found: 'found-headphones', score: 90, level: 'STRONG', status: 'CONFIRMED', createdDaysAgo: 4, updatedDaysAgo: 2, breakdown: { category: 1, title: 0.5, location: 1, date: 1, color: 1, brand: 1, keywords: 1 } },
    { lost: 'lost-wallet', found: 'found-wallet', score: 92.59, level: 'STRONG', status: 'CONFIRMED', createdDaysAgo: 4, updatedDaysAgo: 2, breakdown: { category: 1, title: 0.6667, location: 1, date: 1, color: 1, brand: 0, keywords: 1 } },
    { lost: 'lost-calculator', found: 'found-calculator', score: 93, level: 'STRONG', status: 'SUGGESTED', createdDaysAgo: 2, updatedDaysAgo: 2, breakdown: { category: 1, title: 0.65, location: 1, date: 1, color: 1, brand: 1, keywords: 1 } },
  ] as const;

  const matchDocs = matchSpecs.map((spec) => ({
    _id: new Types.ObjectId(),
    lostItemId: itemByKey.get(spec.lost)!._id,
    foundItemId: itemByKey.get(spec.found)!._id,
    score: spec.score,
    level: spec.level,
    breakdown: spec.breakdown,
    status: spec.status,
    reviewedBy: spec.status === 'SUGGESTED' ? undefined : managerId,
    reviewedAt: spec.status === 'SUGGESTED' ? undefined : daysAgo(spec.updatedDaysAgo),
    createdAt: daysAgo(spec.createdDaysAgo),
    updatedAt: daysAgo(spec.updatedDaysAgo),
  }));

  await ItemMatch.insertMany(matchDocs);

  const claimSpecs: (ClaimSpec & { createdDaysAgo?: number })[] = [
    {
      itemKey: 'found-backpack',
      claimDescriptionAr:
        'هذه حقيبتي. تركتها على المقعد خارج معمل 204 وأدركت فقدانها بعد المحاضرة.',
      verificationNotesAr: 'تمت مطابقة الحروف الأولى وميدالية المفاتيح مع التفاصيل الخاصة في بلاغ العثور.',
      linkedLostKey: 'lost-backpack',
      claimantEmail: DEMO_STUDENT_EMAIL,
      claimDescription:
        'This is my backpack. I left it on the bench outside Lab 204 and realised it was missing after the lecture.',
      identifyingDetailsProvided:
        'My initials are under the flap and there is a blue keychain in the front pocket.',
      status: 'UNDER_VERIFICATION',
      verificationNotes: 'Initials and keychain checked against the private details on the found report.',
      reviewed: true,
    },
    {
      itemKey: 'found-phone',
      claimDescriptionAr:
        'فقدت هاتف iPhone فضي بالقرب من المدخل الطبي. به جراب شفاف وصورة قطتي على شاشة القفل.',
      linkedLostKey: 'lost-phone',
      claimantEmail: EXTRA_STUDENT_EMAILS[1]!,
      claimDescription:
        'I lost my silver iPhone near the medical entrance. It has a clear case and a photo of my cat on the lock screen.',
      identifyingDetailsProvided:
        'The IMEI ends in 4812 and there is a small crack on the bottom corner.',
      status: 'PENDING_REVIEW',
      reviewed: false,
    },
    {
      itemKey: 'found-id',
      claimDescriptionAr:
        'هذه بطاقة هويتي الجامعية. سقطت من ملفي في مكان ما بممر العلوم الإنسانية.',
      verificationNotesAr: 'تمت مطابقة الصورة ورقم الطالب الجامعي.',
      claimantEmail: EXTRA_STUDENT_EMAILS[0]!,
      claimDescription:
        'This is my student ID card. It slipped out of my folder somewhere in the humanities corridor.',
      identifyingDetailsProvided:
        'The card is issued to Sara Mahmoud and the holder contains my passport photo.',
      status: 'APPROVED',
      verificationNotes: 'Photo and student number matched.',
      reviewed: true,
    },
    {
      itemKey: 'found-keys',
      claimDescriptionAr:
        'هذه مفاتيحي. فقدتها عند بوابة العلوم الإنسانية والميدالية الحمراء عليها الحروف الأولى من اسمي.',
      verificationNotesAr: 'تطابقت المفاتيح مع الوصف واستلمها المالك.',
      linkedLostKey: 'lost-keys',
      claimantEmail: EXTRA_STUDENT_EMAILS[0]!,
      claimDescription:
        'These are my keys. I lost them at the humanities gate and the red tag has my initials on it.',
      identifyingDetailsProvided: 'Red tag marked M.A. and a brass bicycle key.',
      status: 'COMPLETED',
      verificationNotes: 'Keys matched the description and the owner collected them.',
      reviewed: true,
      handover: {
        receivedByName: 'Sara Mahmoud',
        receivedByNameAr: 'سارة محمود',
        notes: 'Student ID checked and signed at the security office.',
        notesAr: 'تم التحقق من البطاقة الجامعية والتوقيع في مكتب الأمن.',
        handedOverAt: daysAgo(2, 15),
      },
    },
    {
      itemKey: 'found-umbrella',
      claimDescriptionAr:
        'أعتقد أن هذه المظلة ملكي. فقدت مظلة كحلية في مكان ما حول المكتبة الأسبوع الماضي.',
      rejectionReasonAr:
        'لم تتطابق التفاصيل التعريفية المقدمة مع التفاصيل الخاصة في بلاغ العثور.',
      linkedLostKey: 'lost-umbrella',
      claimantEmail: EXTRA_STUDENT_EMAILS[1]!,
      claimDescription:
        'I think this umbrella is mine. I lost a navy blue one somewhere around the library last week.',
      identifyingDetailsProvided: 'It is navy blue with a wooden handle.',
      status: 'REJECTED',
      rejectionReason:
        'The identifying details did not match the private details on the found report.',
      reviewed: true,
    },
    {
      itemKey: 'found-headphones',
      claimDescriptionAr:
        'هذه سماعاتي اللاسلكية Sony تركتها في استراحة الورش الهندسية وتحتوي الحافظة على ملصق أزرق صغير.',
      verificationNotesAr: 'تمت مراجعة صورة الملصق وكابل USB-C الاحتياطي داخل الحافظة.',
      linkedLostKey: 'lost-headphones',
      claimantEmail: DEMO_STUDENT_EMAIL,
      claimDescription:
        'These are my Sony wireless headphones left in the workshops break area with a blue sticker inside the case.',
      identifyingDetailsProvided:
        'Small blue sticker under the lid and a spare USB-C cable inside the mesh pocket.',
      status: 'UNDER_VERIFICATION',
      verificationNotes: 'Blue sticker and spare cable confirmed; final pickup slot scheduled.',
      reviewed: true,
      createdDaysAgo: 3,
    },
    {
      itemKey: 'found-wallet',
      claimDescriptionAr:
        'فقدت محفظتي البنية في مدرجات الصالة الرياضية وتحتوي على بطاقة المكتبة وتذكرة قطار مطوية.',
      verificationNotesAr: 'تطابق رقم باركود المكتبة 319 وتم تسليم المحفظة باليد.',
      linkedLostKey: 'lost-wallet',
      claimantEmail: EXTRA_STUDENT_EMAILS[2]!,
      claimDescription:
        'Lost my brown leather wallet in the sports hall stands containing my library card and train ticket.',
      identifyingDetailsProvided:
        'Library barcode ends in 319 and there is a folded ticket in the side pocket.',
      status: 'COMPLETED',
      verificationNotes: 'Library card barcode verified and wallet handed over to owner.',
      reviewed: true,
      createdDaysAgo: 3,
      handover: {
        receivedByName: 'Mariam Hassan',
        receivedByNameAr: 'مريم حسن',
        notes: 'National ID and library barcode matched at Lost & Found office.',
        notesAr: 'تم مطابقة الهوية وباركود المكتبة بمكتب المفقودات.',
        handedOverAt: daysAgo(2, 14),
      },
    },
    {
      itemKey: 'found-charger',
      claimDescriptionAr:
        'شاحن Lenovo 65W الخاص بي نسيته في قاعة القراءة الهادئة وله حزام فيلكرو يحمل بطاقة فضية.',
      verificationNotesAr: 'تطابق الرقم التسلسلي 902B والحزام الفضي، وجاهز للاستلام.',
      claimantEmail: DEMO_STUDENT_EMAIL,
      claimDescription:
        'That Lenovo 65W charger is mine — left in the quiet study zone with a silver-tagged velcro strap.',
      identifyingDetailsProvided:
        'Velcro strap with silver fabric tag and adapter serial ending 902B.',
      status: 'APPROVED',
      verificationNotes: 'Serial ending 902B verified; approved for desk handover.',
      reviewed: true,
      createdDaysAgo: 2,
    },
    {
      itemKey: 'found-hoodie',
      claimDescriptionAr:
        'سترتي الرمادية نسيتها في قاعة استذكار 2 وبها بقعة حبر صغيرة على الكم ورباط أيسر مفقود.',
      linkedLostKey: 'lost-hoodie',
      claimantEmail: EXTRA_STUDENT_EMAILS[1]!,
      claimDescription:
        'My grey hoodie left in Study Room 2 — missing the left drawstring with a small cuff ink stain.',
      identifyingDetailsProvided:
        'Missing left drawstring and blue pen mark near the cuff seam.',
      status: 'PENDING_REVIEW',
      reviewed: false,
      createdDaysAgo: 2,
    },
  ];

  const claimDocs = claimSpecs.map((spec, index) => ({
    _id: new Types.ObjectId(),
    claimNumber: `CLM-${2001 + index}`,
    itemId: itemByKey.get(spec.itemKey)!._id,
    linkedLostItemId: spec.linkedLostKey
      ? itemByKey.get(spec.linkedLostKey)!._id
      : undefined,
    claimantId: userId(spec.claimantEmail),
    claimDescription: spec.claimDescription,
    claimDescriptionAr: spec.claimDescriptionAr,
    identifyingDetailsProvided: spec.identifyingDetailsProvided,
    supportingEvidence: [],
    status: spec.status,
    verificationNotes: spec.verificationNotes,
    verificationNotesAr: spec.verificationNotesAr,
    rejectionReason: spec.rejectionReason,
    rejectionReasonAr: spec.rejectionReasonAr,
    reviewedBy: spec.reviewed ? managerId : undefined,
    reviewedAt: spec.reviewed ? daysAgo(spec.createdDaysAgo ? Math.max(1, spec.createdDaysAgo - 1) : 3) : undefined,
    handover: spec.handover
      ? {
          receivedByName: spec.handover.receivedByName,
          receivedByNameAr: spec.handover.receivedByNameAr,
          handedOverBy: managerId,
          notes: spec.handover.notes,
          notesAr: spec.handover.notesAr,
          handedOverAt: spec.handover.handedOverAt,
        }
      : undefined,
    createdAt: daysAgo(spec.createdDaysAgo ?? 5, 10 + (index % 8)),
    updatedAt: daysAgo(2, 12),
  }));

  await ClaimRequest.insertMany(claimDocs);


  // ---------------------------------------------------------------------------
  // Notifications and activity logs (Lost & Found only)
  // ---------------------------------------------------------------------------
  const workshopsMainLoc = locations.find((loc) =>
    loc._id.equals(locationId('Workshops', 0)),
  )!;

  const notificationDocs = [
    {
      userId: demoStudentId,
      type: 'CLAIM_APPROVED',
      title: 'Claim approved',
      message: 'Your claim CLM-2008 was approved. Contact the Lost & Found Office to arrange the handover.',
      titleKey: 'claimApproved',
      messageKey: 'claimApprovedMsg',
      params: { code: 'CLM-2008' },
      relatedEntityType: 'ClaimRequest',
      relatedEntityId: claimDocs[7]!._id,
      linkUrl: '/lost-found/claims',
      isRead: false,
      createdAt: hoursAgo(18),
    },
    {
      userId: managerId,
      type: 'CLAIM_PENDING',
      title: 'New claim submitted',
      message: 'Claim CLM-2002 was submitted for found item LF-2006.',
      titleKey: 'claimSubmitted',
      messageKey: 'claimSubmittedMsg',
      params: { code: 'CLM-2002', itemCode: 'LF-2006' },
      relatedEntityType: 'ClaimRequest',
      relatedEntityId: claimDocs[1]!._id,
      linkUrl: '/lost-found/claims',
      isRead: false,
      createdAt: hoursAgo(9),
    },
    {
      userId: managerId,
      type: 'CLAIM_PENDING',
      title: 'New claim submitted',
      message: `Claim CLM-2009 was submitted for found item ${itemByKey.get('found-hoodie')!.reportNumber}.`,
      titleKey: 'claimSubmitted',
      messageKey: 'claimSubmittedMsg',
      params: { code: 'CLM-2009', itemCode: itemByKey.get('found-hoodie')!.reportNumber },
      relatedEntityType: 'ClaimRequest',
      relatedEntityId: claimDocs[8]!._id,
      linkUrl: '/lost-found/claims',
      isRead: false,
      createdAt: hoursAgo(6),
    },
    {
      userId: managerId,
      type: 'MATCH_SUGGESTED',
      title: 'Possible match confirmed',
      message: 'A found item matching your lost report LF-2005 was confirmed. Submit a claim to verify ownership.',
      titleKey: 'matchConfirmed',
      messageKey: 'matchConfirmedMsg',
      params: { code: 'LF-2005' },
      relatedEntityType: 'ItemMatch',
      relatedEntityId: matchDocs[2]!._id,
      linkUrl: '/lost-found/matches',
      isRead: true,
      createdAt: hoursAgo(32),
    },
    {
      userId: adminId,
      type: 'CLAIM_PENDING',
      title: 'New claim submitted',
      message: `Claim CLM-2009 was submitted for found item ${itemByKey.get('found-hoodie')!.reportNumber}.`,
      titleKey: 'claimSubmitted',
      messageKey: 'claimSubmittedMsg',
      params: { code: 'CLM-2009', itemCode: itemByKey.get('found-hoodie')!.reportNumber },
      relatedEntityType: 'ClaimRequest',
      relatedEntityId: claimDocs[8]!._id,
      linkUrl: '/lost-found/claims',
      isRead: true,
      createdAt: hoursAgo(28),
    },
    {
      userId: demoEmployeeId,
      type: 'MATCH_SUGGESTED',
      title: 'Possible match suggested',
      message: 'A possible match was suggested for one of the items you are following. Review it in Lost & Found.',
      titleKey: 'matchConfirmed',
      messageKey: 'matchConfirmedMsg',
      params: { code: 'LF-2005' },
      relatedEntityType: 'ItemMatch',
      relatedEntityId: matchDocs[2]!._id,
      linkUrl: '/lost-found',
      isRead: false,
      createdAt: hoursAgo(11),
    },
  ];

  await Notification.insertMany(notificationDocs);

  const activityLogDocs = [
    {
      actorId: adminId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: userId(EXTRA_STUDENT_EMAILS[0]!),
      description: 'Created Student account Sara Mahmoud (sara.mahmoud@std.mansnu.edu.eg)',
      descriptionKey: 'userCreated',
      params: {
        role: { en: 'Student', ar: 'طالب' },
        name: { en: 'Sara Mahmoud', ar: 'سارة محمود' },
        email: EXTRA_STUDENT_EMAILS[0]!,
      },
      metadata: { role: 'STUDENT' },
      createdAt: daysAgo(12),
    },
    {
      actorId: managerId,
      action: 'MATCH_CONFIRMED',
      entityType: 'ItemMatch',
      entityId: matchDocs[0]!._id,
      description: 'Confirmed match between LF-2001 and LF-2002',
      descriptionKey: 'matchConfirmed',
      params: { lostCode: 'LF-2001', foundCode: 'LF-2002' },
      metadata: { score: 94, level: 'STRONG' },
      createdAt: daysAgo(7),
    },
    {
      actorId: managerId,
      action: 'CLAIM_APPROVED',
      entityType: 'ClaimRequest',
      entityId: claimDocs[2]!._id,
      description: 'Approved claim CLM-2003 for LF-2012',
      descriptionKey: 'claimApproved',
      params: { code: 'CLM-2003', itemCode: 'LF-2012' },
      metadata: { status: 'APPROVED' },
      createdAt: daysAgo(3),
    },
    {
      actorId: managerId,
      action: 'HANDOVER_COMPLETED',
      entityType: 'ClaimRequest',
      entityId: claimDocs[3]!._id,
      description: 'Recorded handover for claim CLM-2004 to Sara Mahmoud',
      descriptionKey: 'handoverCompleted',
      params: {
        code: 'CLM-2004',
        name: { en: 'Sara Mahmoud', ar: 'سارة محمود' },
      },
      metadata: { receivedByName: 'Sara Mahmoud' },
      createdAt: daysAgo(2),
    },
    {
      actorId: adminId,
      action: 'LOCATION_UPDATED',
      entityType: 'Location',
      entityId: locationId('Administration', 0),
      description: 'Updated location Administration & Central Library Building, Ground Floor, Student Affairs Hall G01',
      descriptionKey: 'locationUpdated',
      params: {
        building: {
          en: 'Administration & Central Library Building',
          ar: 'مبنى إدارة الجامعة والمكتبة المركزية',
        },
        floor: {
          en: 'Ground Floor',
          ar: 'الطابق الأرضي',
        },
        room: {
          en: 'Student Affairs Hall G01',
          ar: 'قاعة شئون الطلاب G01',
        },
      },
      metadata: { building: 'Administration & Central Library Building' },
      createdAt: daysAgo(1),
    },
    {
      actorId: adminId,
      action: 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: userId('a.elmasry@mansnu.edu.eg'),
      description: 'Deactivated Employee account Eng. Adel El-Masry (a.elmasry@mansnu.edu.eg)',
      descriptionKey: 'userDeactivated',
      params: {
        role: { en: 'Employee', ar: 'موظف' },
        name: { en: 'Eng. Adel El-Masry', ar: 'م. عادل المصري' },
        email: 'a.elmasry@mansnu.edu.eg',
      },
      metadata: { role: 'EMPLOYEE' },
      createdAt: hoursAgo(12),
    },
    {
      actorId: adminId,
      action: 'LOCATION_CREATED',
      entityType: 'Location',
      entityId: workshopsMainLoc._id,
      description: `Created location ${workshopsMainLoc.buildingName}, ${workshopsMainLoc.floor}, Room ${workshopsMainLoc.room}`,
      descriptionKey: 'locationCreated',
      params: {
        building: {
          en: workshopsMainLoc.buildingName,
          ar: workshopsMainLoc.buildingNameAr ?? workshopsMainLoc.buildingName,
        },
        floor: {
          en: workshopsMainLoc.floor,
          ar: workshopsMainLoc.floorAr ?? workshopsMainLoc.floor,
        },
        room: workshopsMainLoc.room,
      },
      metadata: { building: workshopsMainLoc.buildingName },
      createdAt: hoursAgo(10),
    },
    {
      actorId: demoStudentId,
      action: 'CLAIM_SUBMITTED',
      entityType: 'ClaimRequest',
      entityId: claimDocs[5]!._id,
      description: `Submitted claim CLM-2006 for ${itemByKey.get('found-headphones')!.reportNumber}`,
      descriptionKey: 'claimSubmitted',
      params: {
        code: 'CLM-2006',
        itemCode: itemByKey.get('found-headphones')!.reportNumber,
      },
      metadata: { claimNumber: 'CLM-2006' },
      createdAt: hoursAgo(4),
    },
  ];

  await ActivityLog.insertMany(activityLogDocs);

  // ---------------------------------------------------------------------------
  // Cached Arabic AI insights (Lost & Found only)
  // ---------------------------------------------------------------------------
  const sharedInsightBase = {
    period: '7d' as const,
    promptVersion: AI_INSIGHTS_PROMPT_VERSION,
    generatedAt: daysAgo(1, 7),
    rangeStart: daysAgo(8, 7),
    rangeEnd: daysAgo(1, 7),
    stats: {
      period: '7d',
      lostFound: {
        totalLostItems: 12,
        totalFoundItems: 12,
        pendingMatchesCount: 3,
        pendingClaimsCount: 2,
      },
    },
    model: 'gemini-2.5-flash',
    createdAt: daysAgo(1, 7),
    updatedAt: daysAgo(1, 7),
  };

  await AiInsightCache.insertMany([
    {
      ...sharedInsightBase,
      scope: 'LOST_FOUND' as const,
      lang: 'ar' as const,
      insights: {
        observations: [
          'تتركز بلاغات المفقودات المفتوحة حول الإلكترونيات والهواتف والسماعات في مجمع الهندسة والمجمع الطبي.',
          'تم تأكيد 4 تطابقات قوية بين بلاغات الفقد وبلاغات العثور خلال الفترة الحالية.',
        ],
        repeatedPatterns: [
          'تتكرر بلاغات الفقد حول المكتبة المركزية ومعامل الهندسة في أوقات المحاضرات المسائية.',
          'تتصدر الحقائب والمحافظ والأجهزة الإلكترونية الصغيرة فئات البلاغات المتكررة.',
        ],
        operationalRisks: [
          'تنتظر طلبات الاستلام CLM-2006 إلى CLM-2009 الحسم، ما يطيل بقاء الأغراض في مكتب المفقودات.',
          'ما تزال 3 تطابقات مقترحة دون مراجعة وقد يفقد أصحابها فرصة الاستلام السريع.',
        ],
        preventiveRecommendations: [
          'أ. أحمد الدسوقي: حسم التطابقات المقترحة واستكمال تسليم طلبات الاستلام المعتمدة خلال 48 ساعة.',
          'مكتب المفقودات: تكثيف الإعلان عن الأغراض المعثور عليها في المكتبة المركزية أسبوعياً.',
        ],
      },
    },
    {
      ...sharedInsightBase,
      scope: 'ADMIN' as const,
      lang: 'ar' as const,
      insights: {
        observations: [
          'يتصدر مجمع الكليات الهندسية كثافة بلاغات المفقودات والمعثورات، يليه مبنى الإدارة والمكتبة المركزية.',
          'تتركز الفجوة التشغيلية الحالية في تأخر حسم التطابقات وتنسيق تسليم المفقودات المعتمدة.',
        ],
        repeatedPatterns: [
          'تتجمع المفقودات المفتوحة حول الإلكترونيات والسماعات والهواتف في الهندسة والورش والمجمع الطبي.',
          'تتكرر بلاغات الفقد في المكتبة المركزية ومنطقة الأنشطة الطلابية في نهاية اليوم الدراسي.',
        ],
        operationalRisks: [
          'تنتظر تطابقات مقترحة وطلبات استلام CLM-2006 إلى CLM-2009 الحسم والتسليم منذ أيام.',
          'يوجد حساب موظف غير نشط واحد يحتاج مراجعة الإدارة قبل إعادة التفعيل أو الأرشفة.',
        ],
        preventiveRecommendations: [
          'أ. أحمد الدسوقي: حسم التطابقات المقترحة واستكمال تسليم طلبات الاستلام المعتمدة خلال 48 ساعة.',
          'إدارة النظام: مراجعة الحسابات غير النشطة وتحديث بيانات المواقع الأكثر بلاغات شهرياً.',
        ],
      },
    },
  ]);

  return {
    lostItems: itemDocs.filter((item) => item.reportType === 'LOST').length,
    foundItems: itemDocs.filter((item) => item.reportType === 'FOUND').length,
    matches: matchDocs.length,
    claims: claimDocs.length,
    notifications: notificationDocs.length,
    activityLogs: activityLogDocs.length,
    insights: 2,
  };
}
