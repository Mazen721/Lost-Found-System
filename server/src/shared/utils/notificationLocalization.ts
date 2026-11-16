export interface NotificationLocalizationSource {
  type: string;
  title?: string;
  message: string;
  titleKey?: string;
  messageKey?: string;
  params?: Record<string, unknown>;
}

export interface DerivedNotificationLocalization {
  titleKey: string;
  messageKey: string;
  params: Record<string, unknown>;
}

const CLAIM_CODE = /\bCLM-\d+\b/;
const ITEM_CODE = /\bLF-\d+\b/;

function firstMatch(value: string, pattern: RegExp): string | undefined {
  return value.match(pattern)?.[0];
}

function extractAfter(value: string, marker: string): string | undefined {
  const index = value.indexOf(marker);
  if (index < 0) {
    return undefined;
  }

  const result = value
    .slice(index + marker.length)
    .replace(/[.!]+$/, '')
    .trim();

  return result || undefined;
}

const BUILDING_AR_BY_EN: Record<string, string> = {
  'Administration & Central Library Building': 'مبنى إدارة الجامعة والمكتبة المركزية',
  'Engineering & Technological Complex': 'مجمع الكليات الهندسية والتكنولوجية',
  'Engineering & Technological Complex A & B': 'مجمع الكليات الهندسية والتكنولوجية',
  'Engineering Building': 'مبنى كلية الهندسة',
  'Medical Sector Complex': 'مجمع الكليات الطبية',
  'Medical Sector Complex A & B': 'مجمع الكليات الطبية',
  'Humanities & Business Building': 'مبنى العلوم الإنسانية والاقتصاد وإدارة الأعمال',
  'Central Workshops & Laboratories Building': 'مبنى الورش والمعامل المركزية',
  'Student Activities & Sports Complex': 'منطقة الأنشطة الطلابية والملاعب الرياضية',
};

const FLOOR_AR_BY_EN: Record<string, string> = {
  'Ground Floor': 'الطابق الأرضي',
  'Floor 1': 'الطابق الأول',
  'Floor 2': 'الطابق الثاني',
  'Floor 3': 'الطابق الثالث',
  'Floor 4': 'الطابق الرابع',
};

function toBilingualParam(
  value: unknown,
  dictionary: Record<string, string>,
): unknown {
  if (typeof value === 'string') {
    const ar = dictionary[value];
    return ar ? { en: value, ar } : value;
  }

  if (value && typeof value === 'object' && 'en' in value) {
    const entry = value as { en?: string; ar?: string };
    if (entry.en && !entry.ar && dictionary[entry.en]) {
      return { en: entry.en, ar: dictionary[entry.en] };
    }
  }

  return value;
}

function enrichNotificationParams(
  params?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!params) {
    return undefined;
  }

  const nextBuilding =
    params.building !== undefined
      ? toBilingualParam(params.building, BUILDING_AR_BY_EN)
      : undefined;
  const nextFloor =
    params.floor !== undefined
      ? toBilingualParam(params.floor, FLOOR_AR_BY_EN)
      : undefined;

  if (nextBuilding === params.building && nextFloor === params.floor) {
    return params;
  }

  return {
    ...params,
    ...(nextBuilding !== undefined ? { building: nextBuilding } : {}),
    ...(nextFloor !== undefined ? { floor: nextFloor } : {}),
  };
}

/**
 * Older notification documents were written before localized keys existed.
 * Derive the same keys and params from their type and stored English text so
 * they switch language too instead of staying frozen in the language they were
 * created in.
 */
export function deriveNotificationLocalization(
  type: string,
  message: string,
): DerivedNotificationLocalization | null {
  switch (type) {
    case 'CLAIM_SUBMITTED':
    case 'CLAIM_PENDING': {
      const code = firstMatch(message, CLAIM_CODE);
      const itemCode = firstMatch(message, ITEM_CODE);

      if (!code) {
        return {
          titleKey: 'claimSubmitted',
          messageKey: 'claimSubmittedGenericMsg',
          params: {},
        };
      }

      return code && itemCode
        ? {
            titleKey: 'claimSubmitted',
            messageKey: 'claimSubmittedMsg',
            params: { code, itemCode },
          }
        : {
            titleKey: 'claimSubmitted',
            messageKey: 'claimSubmittedGenericMsg',
            params: {},
          };
    }

    case 'CLAIM_APPROVED': {
      const code = firstMatch(message, CLAIM_CODE);
      return code
        ? {
            titleKey: 'claimApproved',
            messageKey: 'claimApprovedMsg',
            params: { code },
          }
        : null;
    }

    case 'CLAIM_REJECTED': {
      const code = firstMatch(message, CLAIM_CODE);
      if (!code) {
        return null;
      }

      const reason =
        extractAfter(message, 'rejected: ') ?? extractAfter(message, 'Reason: ');

      return reason
        ? {
            titleKey: 'claimRejected',
            messageKey: 'claimRejectedMsg',
            params: { code, reason },
          }
        : {
            titleKey: 'claimRejected',
            messageKey: 'claimRejectedGenericMsg',
            params: { code },
          };
    }

    case 'CLAIM_NOT_APPROVED': {
      const code = firstMatch(message, CLAIM_CODE);
      return code
        ? {
            titleKey: 'claimNotApproved',
            messageKey: 'claimNotApprovedMsg',
            params: { code },
          }
        : null;
    }

    case 'HANDOVER_COMPLETED': {
      const code = firstMatch(message, CLAIM_CODE);
      if (!code) {
        return null;
      }

      const name = extractAfter(message, 'handed to ');

      return name
        ? {
            titleKey: 'handoverCompleted',
            messageKey: 'handoverCompletedMsg',
            params: { code, name },
          }
        : {
            titleKey: 'handoverCompleted',
            messageKey: 'handoverCompletedGenericMsg',
            params: { code },
          };
    }

    case 'MATCH_SUGGESTED':
    case 'MATCH_CONFIRMED': {
      const code = firstMatch(message, ITEM_CODE);
      return code
        ? {
            titleKey: 'matchConfirmed',
            messageKey: 'matchConfirmedMsg',
            params: { code },
          }
        : {
            titleKey: 'matchConfirmed',
            messageKey: 'matchConfirmedGenericMsg',
            params: {},
          };
    }

    default:
      return null;
  }
}

/**
 * Returns a copy of a legacy notification with localization metadata attached.
 * Notifications that already have both keys are returned unchanged.
 */
export function applyNotificationLocalization<T extends NotificationLocalizationSource>(
  notification: T,
): T & Partial<DerivedNotificationLocalization> {
  if (notification.titleKey && notification.messageKey) {
    const enrichedParams = enrichNotificationParams(notification.params);
    return enrichedParams === notification.params
      ? notification
      : {
          ...notification,
          type: notification.type,
          ...(notification.title !== undefined ? { title: notification.title } : {}),
          message: notification.message,
          titleKey: notification.titleKey,
          messageKey: notification.messageKey,
          params: enrichedParams,
        };
  }

  const derived = deriveNotificationLocalization(notification.type, notification.message);

  if (!derived) {
    return notification;
  }

  return {
    ...notification,
    type: notification.type,
    ...(notification.title !== undefined ? { title: notification.title } : {}),
    message: notification.message,
    titleKey: notification.titleKey ?? derived.titleKey,
    messageKey: notification.messageKey ?? derived.messageKey,
    params: enrichNotificationParams(notification.params ?? derived.params),
  };
}
