import { describe, expect, it } from 'vitest';
import { estimateItemValue } from '../../src/modules/lost-found/items/item-value';

describe('estimateItemValue — model signals (Phones only)', () => {
  it('prices an iPhone 13 by its model table entry', () => {
    const result = estimateItemValue({
      category: 'Phones',
      brand: 'Apple',
      title: 'Silver iPhone 13',
      description: 'Found a silver iPhone 13 near the main gate.',
    });
    expect(result).toMatchObject({ valueEGP: 28_000, rule: 'model', brandGroup: 'apple' });
  });

  it('reads Arabic spellings, Arabic-Indic digits and the no-space form', () => {
    for (const title of ['آيفون ١٣ لونه فضي', 'آيفون13', 'ايفون 13 برو']) {
      const result = estimateItemValue({
        category: 'Phones',
        title,
        description: 'موبايل ضاع مني في الجامعة',
      });
      expect(result.valueEGP).toBe(28_000);
      expect(result.rule).toBe('model');
    }
  });

  it('prices Galaxy S and Galaxy A models from their tables', () => {
    expect(
      estimateItemValue({
        category: 'Phones',
        brand: 'Samsung',
        title: 'Samsung Galaxy S23',
        description: 'Black Galaxy S23 phone.',
      }).valueEGP,
    ).toBe(28_000);
    expect(
      estimateItemValue({
        category: 'Phones',
        title: 'Galaxy A35',
        description: 'Samsung Galaxy A35 in a clear case.',
      }).valueEGP,
    ).toBe(10_000);
    expect(
      estimateItemValue({
        category: 'Phones',
        title: 'Galaxy A 15',
        description: 'Samsung phone, A series.',
      }).valueEGP,
    ).toBe(7_000);
  });

  it('never prices an accessory as a phone (iPhone case, charging cable)', () => {
    const phoneCase = estimateItemValue({
      category: 'Accessories',
      title: 'جراب آيفون 13',
      description: 'جراب شفاف لآيفون 13',
    });
    expect(phoneCase).toMatchObject({ valueEGP: 500, rule: 'accessory-cap' });

    const cable = estimateItemValue({
      category: 'Electronics',
      title: 'iPhone charging cable',
      description: 'White Lightning cable.',
    });
    expect(cable.valueEGP).toBeLessThan(1_000);
  });

  it('does not invent a model from unrelated numbers in the text', () => {
    const result = estimateItemValue({
      category: 'Phones',
      brand: 'Samsung',
      title: 'موبايل سامسونج اسود',
      description: 'فقدته في معمل 204 يوم 13 نوفمبر',
    });
    expect(result).toMatchObject({ valueEGP: 12_000, rule: 'brand-tier' });
  });
});

describe('estimateItemValue — brand tiers', () => {
  it('uses the premium band for a known premium brand without a model', () => {
    const result = estimateItemValue({
      category: 'Phones',
      brand: 'Apple',
      title: 'iPhone with a cracked screen',
      description: 'Apple phone, model unknown.',
    });
    expect(result).toMatchObject({ valueEGP: 45_000, rule: 'brand-tier', tier: 'premium' });
  });

  it('detects Arabic brand spellings in the brand field (supplementary aliases)', () => {
    expect(
      estimateItemValue({
        category: 'Phones',
        brand: 'أوبو',
        title: 'موبايل اوبو رينو',
        description: 'هاتف اوبو لونه ازرق',
      }),
    ).toMatchObject({ valueEGP: 15_000, rule: 'brand-tier', brandGroup: 'oppo', tier: 'mid' });

    expect(
      estimateItemValue({
        category: 'Phones',
        brand: 'ريلمي',
        title: 'موبايل ريلمي',
        description: 'هاتف ريلمي اسود',
      }),
    ).toMatchObject({ valueEGP: 6_000, brandGroup: 'realme', tier: 'budget' });

    expect(
      estimateItemValue({
        category: 'Headphones',
        brand: 'بيتس',
        title: 'سماعات بيتس',
        description: 'سماعات رأس حمراء',
      }),
    ).toMatchObject({ valueEGP: 7_000, brandGroup: 'beats', tier: 'premium' });
  });

  it('detects a brand that appears only in the title or description', () => {
    expect(
      estimateItemValue({
        category: 'Headphones',
        title: 'Sony WH-CH720N headphones',
        description: 'Black over-ear headphones.',
      }),
    ).toMatchObject({ valueEGP: 7_000, brandGroup: 'sony' });

    expect(
      estimateItemValue({
        category: 'Bags',
        title: 'شنطة ضهر سودا',
        description: 'شنطة نايك كبيرة فيها جيب لابتوب',
      }),
    ).toMatchObject({ valueEGP: 4_000, brandGroup: 'nike' });
  });

  it('defaults a Samsung phone with no model signal to the Galaxy A midpoint', () => {
    const result = estimateItemValue({
      category: 'Phones',
      brand: 'Samsung',
      title: 'Black Samsung phone',
      description: 'A black Samsung phone with a cracked screen.',
    });
    expect(result).toMatchObject({ valueEGP: 12_000, rule: 'brand-tier', tier: 'mid' });
  });

  it('keeps dell/hp/lenovo laptops mid unless a premium line appears', () => {
    expect(
      estimateItemValue({
        category: 'Laptops',
        brand: 'Lenovo',
        title: 'Lenovo IdeaPad laptop',
        description: 'Silver Lenovo laptop.',
      }).valueEGP,
    ).toBe(30_000);

    expect(
      estimateItemValue({
        category: 'Laptops',
        brand: 'Lenovo',
        title: 'Lenovo ThinkPad X1',
        description: 'Black ThinkPad laptop.',
      }).valueEGP,
    ).toBe(60_000);

    expect(
      estimateItemValue({
        category: 'Laptops',
        title: 'MacBook Pro 14',
        description: 'Apple laptop in a sleeve.',
      }),
    ).toMatchObject({ valueEGP: 60_000, brandGroup: 'apple', tier: 'premium' });
  });
});

describe('estimateItemValue — sub-bands and defaults', () => {
  it('prices a charger as a charger even when filed under Laptops', () => {
    const result = estimateItemValue({
      category: 'Laptops',
      brand: 'Lenovo',
      title: 'Lenovo laptop charger',
      description: 'Found a Lenovo 65W laptop charger plugged into a socket.',
    });
    expect(result).toMatchObject({ valueEGP: 700, rule: 'accessory-cap' });
  });

  it('prices a USB stick and a power bank from their sub-bands', () => {
    expect(
      estimateItemValue({
        category: 'Electronics',
        brand: 'Kingston',
        title: 'USB Kingston 32GB',
        description: 'Silver USB flash drive.',
      }),
    ).toMatchObject({ valueEGP: 450, rule: 'accessory-cap' });

    expect(
      estimateItemValue({
        category: 'Electronics',
        title: 'Power bank 10000mAh',
        description: 'Black power bank.',
      }).valueEGP,
    ).toBe(1_100);
  });

  it('routes tablets and smartwatches out of the generic Electronics band', () => {
    expect(
      estimateItemValue({
        category: 'Electronics',
        title: 'تابلت سامسونج',
        description: 'تابلت بشاشة كبيرة وقلم',
      }),
    ).toMatchObject({ valueEGP: 15_000, rule: 'subcategory' });
  });

  it('falls back to the category mid band for an unknown brand', () => {
    expect(
      estimateItemValue({
        category: 'Bags',
        title: 'شنطة ضهر سودا',
        description: 'شنطة كبيرة فيها كتب',
      }),
    ).toMatchObject({ valueEGP: 1_200, rule: 'category-default', brandGroup: null });
  });

  it('leans budget for a brandless phone report', () => {
    expect(
      estimateItemValue({
        category: 'Phones',
        title: 'موبايل ضاع مني',
        description: 'ضاع مني موبايل في المدرج',
      }),
    ).toMatchObject({ valueEGP: 9_000, rule: 'category-default' });
  });
});
