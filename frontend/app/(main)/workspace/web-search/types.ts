// ============================================================
// Web Search Configuration — Types
// ============================================================

export type WebSearchProviderType = 'duckduckgo' | 'serper' | 'tavily' | 'exa';

export const DUCKDUCKGO_PROVIDER_ID: WebSearchProviderType = 'duckduckgo';

// ── API response shapes ──────────────────────────────────────

export interface ConfiguredWebSearchProvider {
  providerKey: string;
  provider: string;
  configuration: Record<string, string>;
  isDefault: boolean;
}

export interface WebSearchSettings {
  includeImages: boolean;
  maxImages: number;
}

export interface WebSearchConfigData {
  providers: ConfiguredWebSearchProvider[];
  settings: WebSearchSettings;
  inherited?: boolean;
}

// ── Web search provider usage (agent check) ─────────────────

export interface WebSearchProviderAgentUsage {
  name: string;
  _key: string;
  creatorName: string | null;
}

// ── API request payloads ─────────────────────────────────────

export interface WebSearchProviderData {
  provider: string;
  configuration: Record<string, string>;
  isDefault?: boolean;
}

// ── Panel state ──────────────────────────────────────────────

export type ConfigurableProvider = Extract<WebSearchProviderType, 'serper' | 'tavily' | 'exa'>;

// ── Per-provider display metadata ────────────────────────────

export interface WebSearchProviderMeta {
  type: WebSearchProviderType;
  label: string;
  description: string;
  icon: string;
  iconType: 'material' | 'image';
  configurable: boolean;
  docUrl: string;
  apiKeyUrl?: string;
}

export const WEB_SEARCH_PROVIDER_META: WebSearchProviderMeta[] = [
  {
    type: 'duckduckgo',
    label: 'DuckDuckGo',
    description: '',
    icon: '/icons/web-search/duckduckgo.svg',
    iconType: 'image',
    configurable: false,
    docUrl: 'https://duckduckgo.com/about',
  },
  {
    type: 'serper',
    label: 'Serper',
    description: 'Fast Google Search API with generous free tier',
    icon: '/icons/web-search/serper.svg',
    iconType: 'image',
    configurable: true,
    docUrl: 'https://serper.dev/docs',
    apiKeyUrl: 'https://serper.dev',
  },
  {
    type: 'tavily',
    label: 'Tavily',
    description: 'AI-optimised search API',
    icon: '/icons/web-search/tavily.svg',
    iconType: 'image',
    configurable: true,
    docUrl: 'https://docs.tavily.com',
    apiKeyUrl: 'https://tavily.com',
  },
  {
    type: 'exa',
    label: 'Exa',
    description: 'Neural web search API',
    icon: '/icons/web-search/exa.svg',
    iconType: 'image',
    configurable: true,
    docUrl: 'https://docs.exa.ai',
    apiKeyUrl: 'https://dashboard.exa.ai/api-keys',
  },
];

export const ALL_WEB_SEARCH_PROVIDER_TYPES: WebSearchProviderType[] = [
  'duckduckgo',
  'serper',
  'tavily',
  'exa',
];
