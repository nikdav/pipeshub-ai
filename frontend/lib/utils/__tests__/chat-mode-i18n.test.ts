import { describe, expect, it } from 'vitest';
import { createInstance, type Resource } from 'i18next';
import { locales } from '@/lib/i18n/locales';
import { formatChatMode } from '../formatters';

const modes = {
  chat: 'chat.queryModes.chat.label',
  internal_search: 'chat.queryModes.chat.label',
  'web-search': 'chat.queryModes.web-search.label',
  web_search: 'chat.queryModes.web-search.label',
  image: 'chat.queryModes.image.label',
  agent: 'chat.queryModes.agent.label',
  auto: 'chat.agentStrategy.modes.auto.label',
  quick: 'chat.agentStrategy.modes.quick.label',
  deep: 'chat.agentStrategy.modes.deep.label',
  planExecute: 'chat.agentStrategy.modes.plan-execute.label',
  verification: 'chat.agentStrategy.modes.plan-execute.label',
  'plan-execute': 'chat.agentStrategy.modes.plan-execute.label',
};
const strategies = {
  auto: 'chat.agentStrategy.modes.auto.label',
  quick: 'chat.agentStrategy.modes.quick.label',
  deep: 'chat.agentStrategy.modes.deep.label',
  planExecute: 'chat.agentStrategy.modes.plan-execute.label',
  verification: 'chat.agentStrategy.modes.plan-execute.label',
  'plan-execute': 'chat.agentStrategy.modes.plan-execute.label',
};

it('localizes built-in modes and strategy aliases in every catalogue', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'en-US', fallbackLng: 'en-US',
    resources: Object.fromEntries(
      Object.entries(structuredClone(locales)).map(([language, catalogue]) => [language, { translation: catalogue }]),
    ) as Resource,
  });
  for (const language of Object.keys(locales)) {
    await i18n.changeLanguage(language);
    const t = i18n.t.bind(i18n);
    for (const [mode, key] of Object.entries(modes)) {
      expect(typeof i18n.getResource(language, 'translation', key)).toBe('string');
      expect(formatChatMode(mode, t)).toBe(t(key));
    }
    for (const [strategy, key] of Object.entries(strategies)) {
      expect(typeof i18n.getResource(language, 'translation', key)).toBe('string');
      expect(formatChatMode(`agent:${strategy}`, t)).toBe(`${t('chat.queryModes.agent.label')} (${t(key)})`);
    }
    expect(formatChatMode('custom_mode', t)).toBe('Custom Mode');
    expect(formatChatMode('agent:vendorStrategy', t)).toBe(`${t('chat.queryModes.agent.label')} (VendorStrategy)`);
    expect(formatChatMode(undefined, t)).toBe('');
  }
});

describe('callers without a translator keep their existing display', () => {
  it.each([
    ['chat', 'Chat'], ['web-search', 'Web-search'], ['web_search', 'Web Search'],
    ['agent:planExecute', 'Agent (Plan & Execute)'],
    ['agent:verification', 'Agent (Plan & Execute)'],
    ['agent:vendorStrategy', 'Agent (VendorStrategy)'], ['agent:', 'Agent ()'],
  ])('keeps %s unchanged', (mode, expected) => {
    expect(formatChatMode(mode)).toBe(expected);
  });
});
