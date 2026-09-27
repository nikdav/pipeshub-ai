import { describe, expect, it } from 'vitest';
import { buildAgentChatMcpGroups, buildAgentChatToolGroups, extractAgentKnowledgeCollectionRows } from '../api';
import type { AgentDetail } from '../types';

describe('agent resource fallback localization metadata', () => {
  it('marks only missing tool, web-search, and MCP names for render-time localization', () => {
    const agent = {
      toolsets: [
        { displayName: '', name: '', tools: [{ fullName: 'local.read' }] },
        { displayName: 'Provider label', name: 'provider', tools: [{ fullName: 'provider.read' }] },
      ],
      webSearch: { provider: 'brave', providerLabel: '' },
      mcpServers: [
        { displayName: '', name: '', tools: [{ fullName: 'local.lookup' }] },
        { displayName: 'Custom MCP', name: 'custom', tools: [{ fullName: 'custom.lookup' }] },
      ],
    } as unknown as AgentDetail;

    const tools = buildAgentChatToolGroups(agent);
    expect(tools[0]).toMatchObject({ label: 'Tools', labelText: { key: 'agentBuilder.tools' } });
    expect(tools[1]).toMatchObject({ label: 'Provider label' });
    expect(tools[1]!.labelText).toBeUndefined();
    expect(tools[2]).toMatchObject({ label: 'Web Search', labelText: { key: 'agentBuilder.webSearch' } });

    const mcp = buildAgentChatMcpGroups(agent);
    expect(mcp[0]).toMatchObject({ label: 'MCP Server', labelText: { key: 'agentBuilder.mcpServerDefaultName' } });
    expect(mcp[1]).toMatchObject({ label: 'Custom MCP' });
    expect(mcp[1]!.labelText).toBeUndefined();
  });

  it('marks a generic Collection name only when the graph has no source label', () => {
    const agent = {
      knowledge: [
        { type: 'KB', connectorId: 'kb/1', displayName: '', name: '' },
        { type: 'KB', connectorId: 'kb/2', displayName: 'My saved collection', name: '' },
      ],
    } as unknown as AgentDetail;

    const rows = extractAgentKnowledgeCollectionRows(agent);
    expect(rows[0]).toMatchObject({
      id: 'kb/1',
      name: 'Collection',
      nameText: { key: 'agentBuilder.nodeCollectionFallbackName' },
    });
    expect(rows[1]).toMatchObject({ id: 'kb/2', name: 'My saved collection' });
    expect(rows[1]!.nameText).toBeUndefined();
  });
});
