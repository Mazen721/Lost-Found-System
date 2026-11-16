import { describe, expect, it } from 'vitest';
import {
  applyNotificationLocalization,
  deriveNotificationLocalization,
} from '../../src/shared/utils/notificationLocalization';

describe('legacy notification localization', () => {
  it('derives claim, handover and match keys', () => {
    expect(
      deriveNotificationLocalization(
        'CLAIM_SUBMITTED',
        'Claim CLM-1001 was submitted for found item LF-1003.',
      ),
    ).toMatchObject({ messageKey: 'claimSubmittedMsg', params: { code: 'CLM-1001', itemCode: 'LF-1003' } });

    expect(
      deriveNotificationLocalization(
        'HANDOVER_COMPLETED',
        'Claim CLM-1001 was completed. The item was handed to Youssef El-Ashry.',
      ),
    ).toMatchObject({ messageKey: 'handoverCompletedMsg', params: { name: 'Youssef El-Ashry' } });

    expect(
      deriveNotificationLocalization(
        'MATCH_CONFIRMED',
        'A found item matching your lost report LF-1002 was confirmed.',
      ),
    ).toMatchObject({ messageKey: 'matchConfirmedMsg', params: { code: 'LF-1002' } });
  });

  it('leaves notifications that already have keys untouched', () => {
    const notification = {
      type: 'CLAIM_SUBMITTED',
      title: 'New claim submitted',
      message: 'Claim CLM-1001 was submitted for found item LF-1003.',
      titleKey: 'claimSubmitted',
      messageKey: 'claimSubmittedMsg',
      params: { code: 'CLM-1001', itemCode: 'LF-1003' },
    };

    expect(applyNotificationLocalization(notification)).toBe(notification);
  });

  it('preserves prototype-getter fields (type, title, message) when spreading Mongoose-like documents', () => {
    const proto = {
      get type() {
        return 'CLAIM_SUBMITTED';
      },
      get title() {
        return 'New claim submitted';
      },
      get message() {
        return 'Claim CLM-1001 was submitted for found item LF-1003.';
      },
    };
    const doc = Object.create(proto) as {
      type: string;
      title: string;
      message: string;
    };

    const localized = applyNotificationLocalization(doc);

    expect(localized.type).toBe('CLAIM_SUBMITTED');
    expect(localized.title).toBe('New claim submitted');
    expect(localized.message).toBe('Claim CLM-1001 was submitted for found item LF-1003.');
    expect(localized.titleKey).toBe('claimSubmitted');
    expect(localized.messageKey).toBe('claimSubmittedMsg');
  });

  it('returns the original notification when the type has no known mapping', () => {
    const notification = {
      type: 'SOMETHING_NEW',
      title: 'Custom',
      message: 'Custom message',
    };

    expect(applyNotificationLocalization(notification)).toBe(notification);
  });
});
