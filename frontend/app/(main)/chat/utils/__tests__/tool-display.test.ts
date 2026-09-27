/**
 * `load_skill`/`skill_search`/`skills_list`/`load_skill_resource`/
 * `skill_manage` go over AG-UI as ordinary `TOOL_CALL_*` frames (see
 * "Skill activity UX" plan) — there is no protocol-level skill event, and
 * no DB migration backing this. These tests lock in the two label sources
 * that must both resolve to sensible copy:
 *
 *  - OLD chats: persisted `MessagePart`s with only `toolName` (no
 *    `displayName`) must still read as "Loaded skill", not "Load Skill".
 *  - NEW chats: a backend-provided `displayName` always wins outright.
 */
import { describe, it, expect } from 'vitest';
import {
  isSkillTool,
  toolActivityLabel,
  toolActivityText,
  toolStatusLabel,
  toolStatusText,
  humanizeToolName,
} from '../tool-display';
import { localizedText } from '@/lib/i18n/localized-text';

describe('isSkillTool', () => {
  it('is true for exactly the five built-in skill tools', () => {
    expect(isSkillTool('skills_list')).toBe(true);
    expect(isSkillTool('skill_search')).toBe(true);
    expect(isSkillTool('load_skill')).toBe(true);
    expect(isSkillTool('load_skill_resource')).toBe(true);
    expect(isSkillTool('skill_manage')).toBe(true);
  });

  it('is false for unrelated tools, including ones that also contain "skill"', () => {
    expect(isSkillTool('web_search')).toBe(false);
    expect(isSkillTool('run_code')).toBe(false);
    expect(isSkillTool(undefined)).toBe(false);
  });

  it('does not treat Object.prototype names as skill tools', () => {
    expect(isSkillTool('constructor')).toBe(false);
    expect(isSkillTool('toString')).toBe(false);
    expect(isSkillTool('valueOf')).toBe(false);
  });
});

describe('toolActivityLabel — old chat (toolName only, no displayName)', () => {
  it.each([
    ['skills_list', 'Listed skills'],
    ['skill_search', 'Searched skills'],
    ['load_skill', 'Loaded skill'],
    ['load_skill_resource', 'Loaded skill file'],
    ['skill_manage', 'Managed skill'],
  ])('labels %s as %s', (toolName, expected) => {
    expect(toolActivityLabel(toolName)).toBe(expected);
  });

  it('falls back to generic humanization for a non-skill tool, unaffected by the skill map', () => {
    expect(toolActivityLabel('run_code')).toBe('Run Code');
  });
});

describe('toolActivityLabel — new chat (backend-provided displayName)', () => {
  it('always prefers displayName over the skill label map', () => {
    expect(toolActivityLabel('load_skill', 'Loaded skill docx')).toBe('Loaded skill docx');
    expect(toolActivityLabel('skill_manage', 'Created skill docx')).toBe('Created skill docx');
  });
});

describe('toolStatusLabel — live streaming status (present tense)', () => {
  it.each([
    ['skills_list', 'Listing skills'],
    ['skill_search', 'Searching skills'],
    ['load_skill', 'Loading skill'],
    ['load_skill_resource', 'Loading skill file'],
    ['skill_manage', 'Managing skill'],
  ])('labels %s as %s', (toolName, expected) => {
    expect(toolStatusLabel(toolName)).toBe(expected);
  });

  it('falls back to "Using <Humanized Name>" for a non-skill tool', () => {
    expect(toolStatusLabel('run_code')).toBe('Using Run Code');
  });
});

describe('tool label descriptors', () => {
  it('describes app-owned skill fallbacks while leaving backend display names as plain strings', () => {
    expect(toolActivityText('load_skill')).toEqual(localizedText('chat.toolActivity.skills.load.past'));
    expect(toolStatusText('skills_list')).toEqual(localizedText('chat.toolActivity.skills.list.present'));
    expect(toolActivityText('load_skill', 'Loaded skill from backend')).toBe('Loaded skill from backend');
  });

  it('keeps the humanized tool name as an interpolation value', () => {
    expect(toolStatusText('run_code')).toEqual(localizedText('chat.toolActivity.usingTool', {
      toolName: 'Run Code',
    }));
    expect(toolActivityText(undefined)).toEqual(localizedText('chat.toolActivity.usedTool'));
  });
});

describe('humanizeToolName — regression guard for the pre-map behavior', () => {
  it('title-cases a skill tool name the old way, confirming the map is what changed', () => {
    expect(humanizeToolName('load_skill')).toBe('Load Skill');
    expect(humanizeToolName('skill_search')).toBe('Skill Search');
  });
});
