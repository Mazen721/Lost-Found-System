import { describe, expect, it, test } from 'vitest';
import type { MatchableItem } from '../../src/modules/lost-found/matches/matching.service';
import { scorePair } from '../../src/modules/lost-found/matches/matching.service';

/**
 * Matching v2 edge-case battery (specs/002-hard-matching).
 *
 * The TRUE fixtures mirror the seed's rewritten pair texts verbatim
 * (server/src/seed/demoData.ts): two different humans describing one item —
 * synonyms, dialect, missing model/brand, Arabic-Indic digits, typos.
 * The FALSE fixtures are pairs a naive text matcher would wrongly merge.
 */

const BASE_DATE = new Date('2026-11-10T10:00:00.000Z');
const NEXT_DAY = new Date(BASE_DATE.getTime() + 24 * 60 * 60 * 1000);
const LOCATION = {
  id: 'location-1',
  buildingName: 'Engineering & Technological Complex',
  floor: 'Floor 2',
};

function lostItem(overrides: Partial<MatchableItem> = {}): MatchableItem {
  return {
    id: 'lost-1',
    reportType: 'LOST',
    category: 'Other',
    location: LOCATION,
    occurrenceDate: BASE_DATE,
    itemTitle: '',
    description: '',
    ...overrides,
  };
}

function foundItem(overrides: Partial<MatchableItem> = {}): MatchableItem {
  return {
    id: 'found-1',
    reportType: 'FOUND',
    category: 'Other',
    location: LOCATION,
    occurrenceDate: NEXT_DAY,
    itemTitle: '',
    description: '',
    ...overrides,
  };
}

interface PairFixture {
  name: string;
  lost: Partial<MatchableItem>;
  found: Partial<MatchableItem>;
}

const TRUE_PAIRS: PairFixture[] = [
  {
    name: 'backpack: شنطة ضهر سودا vs حقيبة ظهر (synonyms + dialect)',
    lost: {
      category: 'Bags', color: 'Black', brand: 'North Face',
      itemTitle: 'My black backpack is gone', itemTitleAr: 'شنطة ضهر سودا',
      description: 'I lost my black backpack after the afternoon lecture near the engineering lab. It has books and a blue keychain in the front pocket.',
      descriptionAr: 'ضاعت مني الشنطة السودا بعد محاضرة بعد الضهر جنب معمل الهندسة، فيها كتب وميدالية مفاتيح زرقا في الجيب الأمامي.',
    },
    found: {
      category: 'Bags', color: 'Black', brand: 'North Face',
      itemTitle: 'Backpack found by the engineering lab', itemTitleAr: 'حقيبة ظهر لقيتها جنب معمل الهندسة',
      description: 'Found a black backpack by the engineering lab door. There is a blue keychain and mechatronics notes in the front pocket. Handed it to the reception desk.',
      descriptionAr: 'لقيت شنطة ضهر سودا عند باب معمل الهندسة، في جيبها الأمامي ميدالية مفاتيح زرقا ومذكرات ميكاترونكس، سلمتها لمكتب الاستقبال.',
    },
  },
  {
    name: 'bottle: قارورة ميه vs زجاجة ماء ستانلس (brand missing on found side)',
    lost: {
      category: 'Other', color: 'Blue', brand: 'Thermos',
      itemTitle: 'My water bottle', itemTitleAr: 'قارورة ميه',
      description: 'My blue water bottle went missing between the cafeteria and the library. The lid has a visible dent and an engineering faculty sticker on it.',
      descriptionAr: 'قارورة الميه الزرقا بتاعتي ضاعت ما بين الكافتيريا والمكتبة، غطاها فيه خبطة باينة وملزوق عليها ستيكر كلية الهندسة.',
    },
    found: {
      category: 'Other', color: 'Blue',
      itemTitle: 'Blue steel bottle found in library', itemTitleAr: 'زجاجة ماء ستانلس زرقا',
      description: 'Found a blue stainless water bottle on a study table in the library. Its lid is dented and it has an engineering faculty sticker.',
      descriptionAr: 'لقيت زجاجة ماء ستانلس لونها أزرق على ترابيزة مذاكرة في المكتبة، غطاها مخبوط وعليها ستيكر كلية الهندسة.',
    },
  },
  {
    name: 'phone: name-only موبايل ضاع مني vs full-model آيفون 13',
    lost: {
      category: 'Phones', color: 'Silver', brand: 'Apple',
      itemTitle: 'Lost my phone', itemTitleAr: 'موبايل ضاع مني',
      description: 'Lost my phone at the medical complex entrance. It is silver in a clear case and the lock screen has a cat photo.',
      descriptionAr: 'ضاع مني الموبايل عند مدخل المجمع الطبي، لونه فضي وحاطه في جراب شفاف، وشاشة القفل عليها صورة قطة.',
    },
    found: {
      category: 'Phones', color: 'Silver', brand: 'Apple',
      itemTitle: 'iPhone 13 found', itemTitleAr: 'آيفون 13 لونه فضي',
      description: 'Found a silver iPhone 13 in a clear case at the medical complex entrance. The phone is off; handed it to the security desk.',
      descriptionAr: 'لقيت آيفون 13 فضي في جراب شفاف عند مدخل المجمع الطبي، التليفون مقفول ومسلمته لمكتب الأمن.',
    },
  },
  {
    name: 'keys: مفاتيحي ضاعت vs سلسلة مفاتيح بميدالية حمرا',
    lost: {
      category: 'Keys', color: 'Silver',
      itemTitle: 'Lost my keys', itemTitleAr: 'مفاتيحي ضاعت',
      description: 'I lost a key ring with three keys and a red plastic tag near the humanities building gate.',
      descriptionAr: 'ضاعت مني سلسلة مفاتيح فيها تلات مفاتيح وميدالية بلاستيك حمرا جنب بوابة مبنى العلوم الإنسانية.',
    },
    found: {
      category: 'Keys', color: 'Silver',
      itemTitle: 'Keys with red tag found', itemTitleAr: 'سلسلة مفاتيح بميدالية حمرا',
      description: 'Found a ring of three keys with a red tag at the humanities building gate. Handed it to the security office.',
      descriptionAr: 'لقيت سلسلة مفاتيح تلاتة بميدالية حمرا عند بوابة مبنى العلوم الإنسانية وسلمتها لمكتب الأمن.',
    },
  },
  {
    name: 'id: بطاقتي الجامعية vs كارنيه جامعة في جراب شفاف',
    lost: {
      category: 'Documents',
      itemTitle: 'My student ID', itemTitleAr: 'بطاقتي الجامعية',
      description: 'My student ID card went missing in the lecture hall corridor of the humanities building. It is in a transparent holder.',
      descriptionAr: 'بطاقتي الجامعية ضاعت في ممر قاعات المحاضرات بمبنى العلوم الإنسانية، محطوطة في جراب شفاف.',
    },
    found: {
      category: 'Documents',
      itemTitle: 'University ID in clear holder', itemTitleAr: 'كارنيه جامعة في جراب شفاف',
      description: 'Found a university ID card in a clear holder on the floor of the humanities corridor. Handed it to the faculty reception.',
      descriptionAr: 'لقيت كارنيه جامعة في جراب شفاف على أرض ممر العلوم الإنسانية وسلمته لاستقبال الكلية.',
    },
  },
  {
    name: 'hoodie: هودي رمادي vs سويت شيرت رصاصي (grey synonyms)',
    lost: {
      category: 'Clothing', color: 'Grey',
      itemTitle: 'Grey hoodie', itemTitleAr: 'هودي رمادي',
      description: 'Left my grey hoodie in the engineering study room. It has a small ink stain on the sleeve and the drawstring is missing on the left side.',
      descriptionAr: 'نسيت الهودي الرمادي بتاعي في قاعة استذكار الهندسة، على كمه بقعة حبر صغيرة ورباطه ناقص من ناحية الشمال.',
    },
    found: {
      category: 'Clothing', color: 'Grey',
      itemTitle: 'Grey sweatshirt left behind', itemTitleAr: 'سويت شيرت رصاصي',
      description: 'Found a grey sweatshirt on a chair in the engineering study room. There is an ink stain on the sleeve and a missing drawstring.',
      descriptionAr: 'لقيت سويت شيرت رصاصي على كرسي في قاعة استذكار الهندسة، على الكم بقعة حبر ورباطه ناقص.',
    },
  },
  {
    name: 'textbook: الداتا ستراكشر transliteration vs هياكل البيانات Data Structures',
    lost: {
      category: 'Books',
      itemTitle: 'Data structures book', itemTitleAr: 'كتاب الداتا ستراكشر',
      description: 'Lost my data structures textbook in the library reading room. The name Omar Khaled is written inside the cover and chapter four is highlighted.',
      descriptionAr: 'فقدت كتاب الداتا ستراكشر في قاعة القراءة بالمكتبة، مكتوب اسم عمر خالد جوه الغلاف وملون على الفصل الرابع.',
    },
    found: {
      category: 'Books',
      itemTitle: 'Data Structures textbook found', itemTitleAr: 'كتاب هياكل البيانات Data Structures',
      description: 'Found a data structures textbook left on a desk in the library reading room after closing. The name Omar Khaled is written inside.',
      descriptionAr: 'لقيت كتاب هياكل البيانات متساب على مكتب في قاعة القراءة بالمكتبة بعد ميعاد القفل، مكتوب فيه اسم عمر خالد.',
    },
  },
  {
    name: 'usb: فلاشة ٣٢ جيجا (Arabic-Indic digits) vs USB Kingston 32GB',
    lost: {
      category: 'Electronics', color: 'Black',
      itemTitle: 'USB stick 32 GB', itemTitleAr: 'فلاشة ٣٢ جيجا',
      description: 'Lost a black USB stick with a red cap near the computer lab printers. It has my graduation project files on it.',
      descriptionAr: 'فقدت فلاشة سودا بغطا أحمر جنب طابعات معمل الحاسب، عليها ملفات مشروع التخرج.',
    },
    found: {
      category: 'Electronics', color: 'Black', brand: 'Kingston',
      itemTitle: 'Kingston USB 32GB', itemTitleAr: 'USB Kingston 32GB أسود',
      description: 'Found a black Kingston 32GB USB stick with a red cap by the computer lab printers.',
      descriptionAr: 'لقيت فلاشة USB كينجستون 32 جيجا لونها أسود وغطاها أحمر عند طابعات معمل الحاسب.',
    },
  },
  {
    name: 'headphones: سماعات سوني vs هيدفون Sony WH-CH720N (model one side only)',
    lost: {
      category: 'Headphones', color: 'Black', brand: 'Sony',
      itemTitle: 'Sony headphones', itemTitleAr: 'سماعات سوني',
      description: 'Lost my black Sony headphones in a grey case at the engineering workshops break area. Inside the case there is a charging cable and a small blue sticker.',
      descriptionAr: 'فقدت سماعات سوني سودا في جراب رمادي عند استراحة الورش الهندسية، جوه الجراب سلك شحن وستيكر أزرق صغير.',
    },
    found: {
      category: 'Headphones', color: 'Black', brand: 'Sony',
      itemTitle: 'Sony WH-CH720N headphones', itemTitleAr: 'هيدفون Sony WH-CH720N أسود',
      description: 'Found black Sony WH-CH720N headphones in a grey case at the engineering workshops security point, with a charging cable and a blue sticker.',
      descriptionAr: 'لقيت هيدفون سوني أسود موديل WH-CH720N في جراب رمادي عند نقطة أمن الورش الهندسية، معاه سلك شحن وستيكر أزرق.',
    },
  },
  {
    name: 'wallet: محفظتي الجلد vs بوك بني جلد طبيعي',
    lost: {
      category: 'Wallets', color: 'Brown',
      itemTitle: 'My leather wallet', itemTitleAr: 'محفظتي الجلد',
      description: 'My brown leather wallet went missing in the indoor sports hall stands. It holds a library card, transit cards and a folded train ticket.',
      descriptionAr: 'ضاعت محفظتي الجلد البني في مدرجات الصالة الرياضية المغطاة، فيها بطاقة المكتبة وكروت مواصلات وتذكرة قطر مطوية.',
    },
    found: {
      category: 'Wallets', color: 'Brown',
      itemTitle: 'Brown leather wallet found', itemTitleAr: 'بوك بني جلد طبيعي',
      description: 'Found a brown natural leather wallet by the sports hall stands entrance, with a library card and transit cards inside.',
      descriptionAr: 'لقيت بوك بني جلد طبيعي عند مدخل مدرجات الصالة الرياضية، جواه بطاقة مكتبة وكروت مواصلات.',
    },
  },
  {
    name: 'calculator: آلة حاسبة كاسيو (no model) vs Casio fx-991ARX',
    lost: {
      category: 'Electronics', color: 'Black', brand: 'Casio',
      itemTitle: 'Casio calculator', itemTitleAr: 'آلة حاسبة كاسيو',
      description: 'Lost a Casio scientific calculator with a sliding cover in Engineering Lecture Hall 3. The initials T.N. are etched on its back.',
      descriptionAr: 'فقدت آلة حاسبة كاسيو علمية بغطا منزلق في مدرج الهندسة ٣، محفور على ضهرها حروف T.N.',
    },
    found: {
      category: 'Electronics', color: 'Black', brand: 'Casio',
      itemTitle: 'Casio fx-991ARX calculator', itemTitleAr: 'Casio fx-991ARX',
      description: 'Found a Casio fx-991ARX calculator on the podium of Engineering Lecture Hall 3, with T.N. etched on the back and a sliding cover.',
      descriptionAr: 'لقيت آلة حاسبة كاسيو fx-991ARX على منصة مدرج الهندسة ٣، على ضهرها حروف T.N. وغطاها منزلق.',
    },
  },
  {
    name: 'typos: سماعاة / كاسيوا still match سماعات / كاسيو',
    lost: {
      category: 'Headphones', color: 'Black', brand: 'Sony',
      itemTitle: 'سماعاة سوني', itemTitleAr: 'سماعاة كاسيوا',
      description: 'سماعاة سودا في جراب رمادي.', descriptionAr: 'سماعاة سوني سودا في جراب رمادي.',
    },
    found: {
      category: 'Headphones', color: 'Black', brand: 'Sony',
      itemTitle: 'سماعات سوني', itemTitleAr: 'سماعات كاسيو',
      description: 'سماعات سودا في جراب رمادي.', descriptionAr: 'سماعات سوني سودا في جراب رمادي.',
    },
  },
  {
    name: 'word order flipped in the title',
    lost: {
      category: 'Bags', color: 'Black', brand: 'North Face',
      itemTitle: 'Backpack North Face black',
      description: 'Black backpack with a blue keychain.',
    },
    found: {
      category: 'Bags', color: 'Black', brand: 'North Face',
      itemTitle: 'Black North Face backpack',
      description: 'Black backpack with a blue keychain.',
    },
  },
  {
    name: 'ة/ه and سوداء/سودا spelling variants',
    lost: {
      category: 'Bags', color: 'Black',
      itemTitle: 'حقيبة سوداء', itemTitleAr: 'حقيبة سوداء',
      description: 'حقيبة كبيرة فيها كتب.', descriptionAr: 'حقيبة كبيرة فيها كتب.',
    },
    found: {
      category: 'Bags', color: 'Black',
      itemTitle: 'حقيبه سودا', itemTitleAr: 'حقيبه سودا',
      description: 'حقيبه كبيره فيها كتب.', descriptionAr: 'حقيبه كبيره فيها كتب.',
    },
  },
  {
    name: 'color missing on one side does not block a strong match',
    lost: {
      category: 'Bags', color: 'Black', brand: 'North Face',
      itemTitle: 'My black backpack is gone', itemTitleAr: 'شنطة ضهر سودا',
      description: 'I lost my black backpack after the afternoon lecture near the engineering lab. It has books and a blue keychain in the front pocket.',
      descriptionAr: 'ضاعت مني الشنطة السودا بعد محاضرة بعد الضهر جنب معمل الهندسة، فيها كتب وميدالية مفاتيح زرقا في الجيب الأمامي.',
    },
    found: {
      category: 'Bags', brand: 'North Face',
      itemTitle: 'Backpack found by the engineering lab', itemTitleAr: 'حقيبة ظهر لقيتها جنب معمل الهندسة',
      description: 'Found a black backpack by the engineering lab door. There is a blue keychain and mechatronics notes in the front pocket. Handed it to the reception desk.',
      descriptionAr: 'لقيت شنطة ضهر سودا عند باب معمل الهندسة، في جيبها الأمامي ميدالية مفاتيح زرقا ومذكرات ميكاترونكس، سلمتها لمكتب الاستقبال.',
    },
  },
  {
    name: 'verbose finder wording with filler still matches',
    lost: {
      category: 'Other', color: 'Blue', brand: 'Thermos',
      itemTitle: 'My water bottle', itemTitleAr: 'قارورة ميه',
      description: 'My blue water bottle went missing between the cafeteria and the library. The lid has a visible dent and an engineering faculty sticker on it.',
      descriptionAr: 'قارورة الميه الزرقا بتاعتي ضاعت ما بين الكافتيريا والمكتبة، غطاها فيه خبطة باينة وملزوق عليها ستيكر كلية الهندسة.',
    },
    found: {
      category: 'Other', color: 'Blue',
      itemTitle: 'Blue steel bottle found in library', itemTitleAr: 'زجاجة ماء ستانلس زرقا',
      description: 'Hi everyone, I found a blue stainless water bottle on a study table in the library today. Its lid is dented and it has an engineering faculty sticker. Please share so the owner can claim it, thanks a lot.',
      descriptionAr: 'يا جماعة لو سمحتم أنا لقيت زجاجة ماء ستانلس لونها أزرق على ترابيزة مذاكرة في المكتبة، غطاها مخبوط وعليها ستيكر كلية الهندسة، يا ريت صاحبها يتواصل معايا وشكرا جزيلا.',
    },
  },
];

describe('matching v2 hard cases — true pairs written by two different humans', () => {
  test.each(TRUE_PAIRS)('$name scores STRONG', ({ lost, found }) => {
    const result = scorePair(lostItem(lost), foundItem(found));
    expect(result).not.toBeNull();
    expect(result?.level).toBe('STRONG');
    expect(result?.score).toBeGreaterThanOrEqual(80);
  });
});

describe('matching v2 hard cases — false pairs must not merge', () => {
  it('iPhone 13 vs iPhone 12: conflicting model numbers stay below POSSIBLE', () => {
    const result = scorePair(
      lostItem({
        category: 'Phones', color: 'Silver', brand: 'Apple',
        itemTitle: 'iPhone 13', itemTitleAr: 'آيفون 13',
        description: 'Silver iPhone in a clear case.', descriptionAr: 'آيفون فضي في جراب شفاف.',
      }),
      foundItem({
        category: 'Phones', color: 'Silver', brand: 'Apple',
        itemTitle: 'iPhone 12', itemTitleAr: 'آيفون 12',
        description: 'Silver iPhone in a clear case.', descriptionAr: 'آيفون فضي في جراب شفاف.',
      }),
    );
    expect(result?.level).toBeNull();
    expect(result?.score).toBeLessThan(60);
  });

  it('Casio fx-991 vs fx-570: conflicting models stay below POSSIBLE', () => {
    const result = scorePair(
      lostItem({
        category: 'Electronics', color: 'Black', brand: 'Casio',
        itemTitle: 'Casio fx-991ARX', description: 'Casio scientific calculator.',
      }),
      foundItem({
        category: 'Electronics', color: 'Black', brand: 'Casio',
        itemTitle: 'Casio fx-570', description: 'Casio scientific calculator.',
      }),
    );
    expect(result?.level).toBeNull();
    expect(result?.score).toBeLessThan(60);
  });

  it('32GB vs 64GB USB: conflicting capacities stay below POSSIBLE', () => {
    const result = scorePair(
      lostItem({
        category: 'Electronics', color: 'Black',
        itemTitle: 'USB 32GB', description: 'Black USB stick.',
      }),
      foundItem({
        category: 'Electronics', color: 'Black',
        itemTitle: 'USB 64GB', description: 'Black USB stick.',
      }),
    );
    expect(result?.level).toBeNull();
    expect(result?.score).toBeLessThan(60);
  });

  it('red keys vs blue keys: color conflict caps below STRONG', () => {
    const result = scorePair(
      lostItem({
        category: 'Keys', color: 'Red',
        itemTitle: 'Keys with red tag', itemTitleAr: 'مفاتيح بميدالية حمرا',
        description: 'Key ring with a red tag.', descriptionAr: 'سلسلة مفاتيح بميدالية حمرا.',
      }),
      foundItem({
        category: 'Keys', color: 'Blue',
        itemTitle: 'Keys with red tag', itemTitleAr: 'مفاتيح بميدالية حمرا',
        description: 'Key ring with a red tag.', descriptionAr: 'سلسلة مفاتيح بميدالية حمرا.',
      }),
    );
    expect(result?.level).not.toBe('STRONG');
    expect(result?.score).toBeLessThanOrEqual(69);
  });

  it('Samsung Galaxy vs iPhone: brand conflict caps below STRONG', () => {
    const result = scorePair(
      lostItem({
        category: 'Phones', color: 'Black', brand: 'Samsung',
        itemTitle: 'Samsung Galaxy phone', itemTitleAr: 'موبايل سامسونج جالاكسي',
        description: 'Black Samsung phone.', descriptionAr: 'موبايل سامسونج أسود.',
      }),
      foundItem({
        category: 'Phones', color: 'Black', brand: 'Apple',
        itemTitle: 'iPhone', itemTitleAr: 'آيفون',
        description: 'Black iPhone.', descriptionAr: 'آيفون أسود.',
      }),
    );
    expect(result?.level).not.toBe('STRONG');
    expect(result?.score).toBeLessThanOrEqual(69);
  });

  it('plain navy umbrella vs polka-dot navy umbrella: at most POSSIBLE', () => {
    const result = scorePair(
      lostItem({
        category: 'Other', color: 'Navy blue',
        itemTitle: 'Umbrella', itemTitleAr: 'مظلة',
        description: 'Lost a plain umbrella with a wooden handle in the library lobby on the rainy day. It has a black strap and a small white scratch.',
        descriptionAr: 'فقدت مظلة سادة بمقبض خشب في بهو المكتبة يوم المطر، حزامها أسود وفيها خدش أبيض صغير.',
      }),
      foundItem({
        category: 'Other', color: 'Navy blue',
        itemTitle: 'Polka dot umbrella found', itemTitleAr: 'شمسية كحلي منقطة',
        description: 'Found a navy polka dot umbrella with white dots and a plastic handle by the library entrance. Left it with security.',
        descriptionAr: 'لقيت شمسية كحلي منقطة بنقط بيضا بمقبض بلاستيك عند مدخل المكتبة وسبتها عند الأمن.',
      }),
    );
    expect(result?.level).toBe('POSSIBLE');
    expect(result?.score).toBeLessThan(80);
  });

  it('black backpack vs black wallet: incompatible categories are skipped', () => {
    const result = scorePair(
      lostItem({
        category: 'Bags', color: 'Black',
        itemTitle: 'Black backpack', description: 'Black bag.',
      }),
      foundItem({
        category: 'Wallets', color: 'Black',
        itemTitle: 'Black wallet', description: 'Black wallet.',
      }),
    );
    expect(result).toBeNull();
  });

  it('found 30 days before it was lost: hard date filter skips the pair', () => {
    const result = scorePair(
      lostItem({
        category: 'Bags', color: 'Black',
        itemTitle: 'Black backpack', description: 'Black bag.',
        occurrenceDate: BASE_DATE,
      }),
      foundItem({
        category: 'Bags', color: 'Black',
        itemTitle: 'Black backpack', description: 'Black bag.',
        occurrenceDate: new Date(BASE_DATE.getTime() - 30 * 24 * 60 * 60 * 1000),
      }),
    );
    expect(result).toBeNull();
  });
});
