export interface LocalizedText {
  key: string;
  values?: Record<string, unknown>;
}

export type LocalizedTextValue = string | LocalizedText;
export type TranslateText = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export function localizedText(
  key: string,
  values?: Record<string, unknown>,
): LocalizedText {
  return values ? { key, values } : { key };
}

export function resolveLocalizedText(
  value: LocalizedTextValue | undefined,
  t: TranslateText,
  fallback = '',
): string {
  if (typeof value === 'string') return value;
  if (!value) return fallback;
  const values = value.values
    ? Object.fromEntries(
        Object.entries(value.values).map(([key, nested]) => [
          key,
          isLocalizedText(nested) ? resolveLocalizedText(nested, t) : nested,
        ]),
      )
    : undefined;
  return t(value.key, values);
}

function isLocalizedText(value: unknown): value is LocalizedText {
  return !!value && typeof value === 'object' && typeof (value as LocalizedText).key === 'string';
}

const DEFAULT_BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatLocalizedBytes(
  bytes: number,
  locale: string,
  options: {
    base?: 1000 | 1024;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    units?: string[];
  } = {},
): string {
  const base = options.base ?? 1024;
  const units = options.units ?? DEFAULT_BYTE_UNITS;
  const maximumFractionDigits = options.maximumFractionDigits ?? 1;
  const minimumFractionDigits = Math.min(
    options.minimumFractionDigits ?? 1,
    maximumFractionDigits,
  );

  if (bytes < base) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(bytes)} ${units[0] ?? 'B'}`;
  }

  let value = bytes;
  let unitIndex = 0;
  while (value >= base && unitIndex < units.length - 1) {
    value /= base;
    unitIndex += 1;
  }

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
  return `${formatted} ${units[unitIndex]}`;
}
