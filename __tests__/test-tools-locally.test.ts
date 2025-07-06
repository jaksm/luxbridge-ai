import { describe, it, expect, vi } from 'vitest';
import { registerGetAuthStateTool } from '@/lib/tools/get-auth-state-tool';
import { registerGetAssetTool } from '@/lib/tools/get-asset-tool';
import { registerGetPortfolioTool } from '@/lib/tools/get-portfolio-tool';
import { registerSemanticSearchTool } from '@/lib/tools/semantic-search-tool';
import { registerTokenizeAssetTool } from '@/lib/tools/tokenize-asset-tool';
import { registerSwapTokensTool } from '@/lib/tools/swap-tokens-tool';

// Mock access token
const mockAccessToken = {
  userId: 'did:privy:123456789',
  clientId: 'test_client_123',
  sessionId: 'session_789xyz',
  expiresAt: '2024-12-31T23:59:59Z',
  userData: {
    walletAddress: '0x742d35Cc6634C0532925a3b8F33C7D1C93F9e7A2'
  }
};

// Mock MCP server
const createMockServer = () => {
  const tools: Record<string, any> = {};
  return {
    tool: (name: string, description: string, schema: any, handler: Function) => {
      tools[name] = { description, schema, handler };
    },
    getTool: (name: string) => tools[name],
    getAllTools: () => tools
  };
};

describe('🧪 Local MCP Tools Testing', () => {
  
  it('should test get_auth_state tool', async () => {
    const mockServer = createMockServer();
    const registerTool = registerGetAuthStateTool({ accessToken: mockAccessToken });
    registerTool(mockServer as any);
    
    const tool = mockServer.getTool('get_auth_state');
    expect(tool).toBeDefined();
    
    const result = await tool.handler();
    expect(result.content[0].text).toContain('Authentication successful');
    expect(result.content[0].text).toContain('Alex Chen');
    expect(result.content[0].text).toContain('investor@luxbridge.ai');
    
    console.log('✅ get_auth_state result:', result.content[0].text.slice(0, 200) + '...');
  });

  it('should test get_asset tool', async () => {
    const mockServer = createMockServer();
    const registerTool = registerGetAssetTool({ accessToken: mockAccessToken });
    registerTool(mockServer as any);
    
    const tool = mockServer.getTool('get_asset');
    expect(tool).toBeDefined();
    
    const result = await tool.handler({
      platform: 'splint_invest',
      assetId: 'WINE-BORDEAUX-001'
    });
    
    expect(result.content[0].text).toContain('Château Margaux 2019');
    expect(result.content[0].text).toContain('$85');
    
    console.log('✅ get_asset result:', result.content[0].text.slice(0, 200) + '...');
  });

  it('should test get_portfolio tool', async () => {
    const mockServer = createMockServer();
    const registerTool = registerGetPortfolioTool({ accessToken: mockAccessToken });
    registerTool(mockServer as any);
    
    const tool = mockServer.getTool('get_portfolio');
    expect(tool).toBeDefined();
    
    const result = await tool.handler();
    expect(result.content[0].text).toContain('Complete Portfolio Analysis');
    expect(result.content[0].text).toContain('142,750');
    expect(result.content[0].text).toContain('6.14%');
    
    console.log('✅ get_portfolio result:', result.content[0].text.slice(0, 300) + '...');
  });

  it('should test semantic_search tool', async () => {
    const mockServer = createMockServer();
    const registerTool = registerSemanticSearchTool({ accessToken: mockAccessToken });
    registerTool(mockServer as any);
    
    const tool = mockServer.getTool('semantic_search');
    expect(tool).toBeDefined();
    
    const result = await tool.handler({
      query: 'luxury wine investments',
      platform: 'splint_invest',
      limit: 5,
      minScore: 0.1
    });
    
    expect(result.content[0].text).toContain('Semantic Search Results');
    expect(result.content[0].text).toContain('luxury wine investments');
    
    console.log('✅ semantic_search result:', result.content[0].text.slice(0, 300) + '...');
  });

  it('should test tokenize_asset tool', async () => {
    const mockServer = createMockServer();
    const registerTool = registerTokenizeAssetTool({ accessToken: mockAccessToken });
    registerTool(mockServer as any);
    
    const tool = mockServer.getTool('tokenize_asset');
    expect(tool).toBeDefined();
    
    const result = await tool.handler({
      platform: 'masterworks',
      assetId: 'MONET-WL-2023-004',
      apiAssetData: {
        name: 'Water Lilies Series - Nymphéas',
        currentPrice: 4500000,
        sharePrice: 450,
        totalShares: 10000,
        category: 'art'
      }
    });
    
    expect(result.content[0].text).toContain('Asset Successfully Tokenized');
    expect(result.content[0].text).toContain('Transaction Hash');
    
    console.log('✅ tokenize_asset result:', result.content[0].text.slice(0, 300) + '...');
  });

  it('should test swap_tokens tool', async () => {
    const mockServer = createMockServer();
    const registerTool = registerSwapTokensTool({ accessToken: mockAccessToken });
    registerTool(mockServer as any);
    
    const tool = mockServer.getTool('swap_tokens');
    expect(tool).toBeDefined();
    
    const result = await tool.handler({
      tokenIn: '0x1234567890123456789012345678901234567890',
      tokenOut: '0x0987654321098765432109876543210987654321',
      amountIn: '100',
      amountOutMin: '85'
    });
    
    expect(result.content[0].text).toContain('Token Swap Successful');
    expect(result.content[0].text).toContain('Transaction Hash');
    
    console.log('✅ swap_tokens result:', result.content[0].text.slice(0, 300) + '...');
  });

});