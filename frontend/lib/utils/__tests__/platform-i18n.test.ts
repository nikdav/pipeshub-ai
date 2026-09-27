import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLocalizedModifierSymbol, getModifierSymbol, isCommandKey, isMac } from '../platform';

afterEach(() => vi.unstubAllGlobals());

describe('localized platform modifier labels', () => {
  it('translates only the displayed non-Mac modifier and preserves event detection', () => {
    vi.stubGlobal('navigator', { platform: 'Win32' });
    const t = vi.fn((key: string) => (key === 'keyboard.modifier.ctrl' ? 'Strg' : key));

    expect(getLocalizedModifierSymbol(t)).toBe('Strg');
    expect(t).toHaveBeenCalledWith('keyboard.modifier.ctrl');
    expect(getModifierSymbol()).toBe('Ctrl');
    expect(isCommandKey({ metaKey: true, ctrlKey: false })).toBe(false);
    expect(isCommandKey({ metaKey: false, ctrlKey: true })).toBe(true);
  });

  it('keeps the macOS Command glyph without requesting translated text', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel' });
    const t = vi.fn((key: string) => key);

    expect(isMac()).toBe(true);
    expect(getLocalizedModifierSymbol(t)).toBe('⌘');
    expect(t).not.toHaveBeenCalled();
    expect(isCommandKey({ metaKey: true, ctrlKey: false })).toBe(true);
  });
});
