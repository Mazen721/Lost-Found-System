import type { Role } from '../../config/constants';
import { env } from '../../config/env';
import { ApiError } from '../../shared/utils/ApiError';
import {
  AI_INSIGHTS_PROMPT_VERSION,
  AiInsightCache,
  ensureAiInsightCacheIndexes,
  type InsightContent,
  type InsightScope,
} from './aiInsightCache.model';
import {
  parseInsightsContent,
  type InsightPeriod,
  type InsightsBody,
} from './ai.validation';
import { generateGeminiText, type AiClientResult } from './gemini.client';
import { getLostFoundInsightStats } from '../dashboard/dashboard.service';

const SYSTEM_INSTRUCTION =
  'You are a senior Lost & Found operations analyst for a university campus ' +
  'writing an executive brief that is calm, clear, and quick to scan. You ' +
  'receive aggregated Lost & Found stats plus item codes (LF-*), claim codes ' +
  '(CLM-*), match scores, categories, buildings, and claimant names. Use only ' +
  'the supplied data; never invent facts or people. Do NOT repeat raw KPI ' +
  'totals already visible on the dashboard, and NEVER output raw system ' +
  'status enums — translate statuses into natural human phrasing in Arabic. ' +
  'Write 2 to 3 crisp bullets per section (12 to 25 words each, max 200 ' +
  'characters, no crowded parenthetical lists). Return a JSON object with ' +
  'exactly four arrays of strings: observations (what changed or stands out ' +
  'most in lost/found reports), repeatedPatterns (recurring item categories, ' +
  'buildings, or locations where items are lost and found), operationalRisks ' +
  '(stalled matches or claims, items waiting longest, handovers at risk, ' +
  'paired with their real campus impact), and preventiveRecommendations ' +
  '(actionable "Owner -> Next step + timeframe" directives supported by the ' +
  'data). Write every string value in Modern Standard Arabic. Keep JSON keys ' +
  'in English. Return raw JSON only, without markdown fences.';

const ADMIN_SYSTEM_INSTRUCTION =
  'You are the chief campus governance analyst briefing the Super ' +
  'Administrator of CampusCare Lost & Found in a clear, scannable executive ' +
  'tone. You receive Lost & Found data (reports, match suggestions, ' +
  'ownership claims, handovers) together with user accounts, campus ' +
  'buildings/locations, and audit-log activity. Use only supplied data; ' +
  'never invent facts or people. Do NOT recite basic platform headcounts or ' +
  'report totals already visible on the dashboard, and NEVER include raw ' +
  'English enum tokens inside prose — express states naturally in Arabic. ' +
  'Keep each bullet to one crisp, easy-to-read sentence (12 to 25 words, max ' +
  '200 characters, avoid dense parentheticals) citing concrete codes (LF-*, ' +
  'CLM-*), buildings, and people only where they clarify action. Return a ' +
  'JSON object with exactly four arrays of strings: observations (key ' +
  'priorities across Lost & Found and governance), repeatedPatterns (campus ' +
  'building hotspots or lost & found clusters), operationalRisks (stalled ' +
  'matches/claims, inactive accounts, or audit concerns and their ' +
  'consequence), and preventiveRecommendations (concrete "Owner -> Action" ' +
  'next steps for the Lost & Found office and administration). Write every ' +
  'string value in Modern Standard Arabic. Keep JSON keys in English. ' +
  'Return raw JSON only, without markdown fences.';

export type InsightGenerator = (
  prompt: string,
  systemInstruction: string,
) => Promise<AiClientResult>;

export interface InsightsActor {
  id: string;
  role: Role;
}

export interface LostFoundInsightsResponse {
  available: boolean;
  stats: Record<string, unknown>;
  insights?: InsightContent;
  generatedAt?: Date;
  rangeStart: Date;
  rangeEnd: Date;
  message?: string;
}

function buildPrompt(stats: Record<string, unknown>, period: InsightPeriod): string {
  return [
    `Period: ${period}`,
    'Analyze the following Lost & Found data and return the requested',
    'JSON object. Reference specific codes, names, locations and numbers where',
    'the data provides them.',
    JSON.stringify(stats),
  ].join('\n');
}

interface InsightCacheValues {
  generatedAt: Date;
  rangeStart: Date;
  rangeEnd: Date;
  stats: Record<string, unknown>;
  insights: InsightContent;
  model: string;
}

async function saveInsightCache(
  scope: InsightScope,
  period: InsightPeriod,
  values: InsightCacheValues,
): Promise<void> {
  const update = {
    $set: {
      scope,
      period,
      lang: 'ar' as const,
      promptVersion: AI_INSIGHTS_PROMPT_VERSION,
      ...values,
    },
  };

  try {
    await AiInsightCache.findOneAndUpdate({ scope, period, lang: 'ar' }, update, {
      upsert: true,
      new: true,
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 11_000) {
      throw error;
    }

    await ensureAiInsightCacheIndexes();
    await AiInsightCache.findOneAndUpdate({ scope, period, lang: 'ar' }, update, {
      upsert: true,
      new: true,
    });
  }
}

async function runScopedInsights(
  scope: InsightScope,
  period: InsightPeriod,
  regenerate: boolean,
  baseInstruction: string,
  statsBundle: {
    stats: Record<string, unknown>;
    rangeStart: Date;
    rangeEnd: Date;
  },
  generator: InsightGenerator,
): Promise<LostFoundInsightsResponse> {
  const { stats, rangeStart, rangeEnd } = statsBundle;
  const cached = await AiInsightCache.findOne({
    scope,
    period,
    lang: 'ar',
    promptVersion: AI_INSIGHTS_PROMPT_VERSION,
  }).lean();

  if (cached && !regenerate) {
    return {
      available: true,
      stats,
      insights: cached.insights,
      generatedAt: cached.generatedAt,
      rangeStart: cached.rangeStart,
      rangeEnd: cached.rangeEnd,
    };
  }

  const result = await generator(buildPrompt(stats, period), baseInstruction);

  if (!result.available) {
    return {
      available: false,
      stats,
      ...(cached
        ? {
            insights: cached.insights,
            generatedAt: cached.generatedAt,
          }
        : {}),
      rangeStart,
      rangeEnd,
      message: result.message,
    };
  }

  const insights = parseInsightsContent(result.text);

  if (!insights) {
    return {
      available: false,
      stats,
      ...(cached
        ? {
            insights: cached.insights,
            generatedAt: cached.generatedAt,
          }
        : {}),
      rangeStart,
      rangeEnd,
      message:
        'The AI service returned an unreadable response. Showing calculated statistics instead.',
    };
  }

  const generatedAt = new Date();

  await saveInsightCache(scope, period, {
    generatedAt,
    rangeStart,
    rangeEnd,
    stats,
    insights,
    model: env.GEMINI_MODEL,
  });

  return {
    available: true,
    stats,
    insights,
    generatedAt,
    rangeStart,
    rangeEnd,
  };
}

const defaultGenerator: InsightGenerator = (prompt, instruction) =>
  generateGeminiText(prompt, instruction, {
    maxOutputTokens: 1200,
    temperature: 0.3,
  });

/**
 * Generates (or returns cached) Arabic AI Lost & Found insights for the
 * Lost & Found Manager.
 */
export async function generateLostFoundInsights(
  actor: InsightsActor,
  input: InsightsBody,
  generator: InsightGenerator = defaultGenerator,
): Promise<LostFoundInsightsResponse> {
  if (actor.role !== 'LOST_FOUND_MANAGER') {
    throw ApiError.forbidden(
      'Only Lost & Found managers can generate insights',
      'managerInsightsOnly',
    );
  }

  const { period, regenerate = false } = input;
  const statsBundle = await getLostFoundInsightStats(period, 'LOST_FOUND');

  return runScopedInsights(
    'LOST_FOUND',
    period,
    regenerate,
    SYSTEM_INSTRUCTION,
    statsBundle,
    generator,
  );
}

/**
 * Generates (or returns cached) Arabic AI platform insights (Lost & Found +
 * governance) for a Super Admin.
 */
export async function generateAdminInsights(
  actor: InsightsActor,
  input: InsightsBody,
  generator: InsightGenerator = (prompt, instruction) =>
    generateGeminiText(prompt, instruction, {
      maxOutputTokens: 1400,
      temperature: 0.3,
    }),
): Promise<LostFoundInsightsResponse> {
  if (actor.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden(
      'Only administrators can generate platform insights',
      'forbidden',
    );
  }

  const { period, regenerate = false } = input;
  const statsBundle = await getLostFoundInsightStats(period, 'ADMIN');

  return runScopedInsights(
    'ADMIN',
    period,
    regenerate,
    ADMIN_SYSTEM_INSTRUCTION,
    statsBundle,
    generator,
  );
}
