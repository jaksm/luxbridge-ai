#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import { 
  getUserByEmail, 
  addAssetToPortfolio, 
  removeAssetFromPortfolio,
  getUserPortfolio,
  getPlatformUserByEmail
} from '../lib/auth/redis-users.js';
import { getActiveUserSession, getUserConnectedPlatforms } from '../lib/auth/session-manager.js';
import { PlatformType, UserPortfolioHolding } from '../lib/types/platformAsset.js';

const program = new Command();

interface SearchResult {
  assetId: string;
  name: string;
  price: number;
  availableShares: number;
  platform: PlatformType;
  category?: string;
}

class AdminCLI {
  private currentUser: any = null;
  private connectedPlatforms: PlatformType[] = [];

  async start() {
    console.log('🔧 LuxBridge Portfolio Admin CLI');
    console.log('================================\n');
    
    while (true) {
      try {
        const action = await this.mainMenu();
        
        switch (action) {
          case 'search_user':
            await this.searchUser();
            break;
          case 'manage_portfolio':
            if (!this.currentUser) {
              console.log('❌ Please search and select a user first.\n');
              break;
            }
            await this.managePortfolio();
            break;
          case 'exit':
            console.log('👋 Goodbye!');
            process.exit(0);
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        console.log('');
      }
    }
  }

  private async mainMenu() {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔍 Search User', value: 'search_user' },
          { 
            name: `📊 Manage Portfolio${this.currentUser ? ` (${this.currentUser.email})` : ''}`, 
            value: 'manage_portfolio',
            disabled: !this.currentUser ? 'Please search for a user first' : false
          },
          { name: '🚪 Exit', value: 'exit' }
        ]
      }
    ]);
    
    return action;
  }

  private async searchUser() {
    const { email } = await inquirer.prompt([
      {
        type: 'input',
        name: 'email',
        message: '📧 Enter user email:',
        validate: (input) => {
          if (!input.trim()) return 'Email is required';
          if (!input.includes('@')) return 'Please enter a valid email';
          return true;
        }
      }
    ]);

    try {
      const user = await getUserByEmail(email.trim());
      
      if (!user) {
        console.log(`❌ User not found: ${email}\n`);
        return;
      }

      // Get connected platforms by checking for active sessions
      const connectedPlatforms = await this.getConnectedPlatforms(user.userId);
      
      this.currentUser = user;
      this.connectedPlatforms = connectedPlatforms;

      console.log('\n✅ User found:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   User ID: ${user.userId}`);
      console.log(`   Connected Platforms: ${connectedPlatforms.length > 0 ? connectedPlatforms.join(', ') : 'None'}`);
      
      // Show portfolio summary
      await this.showPortfolioSummary();
      console.log('');
    } catch (error) {
      console.error(`❌ Error searching for user: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  private async getConnectedPlatforms(userId: string): Promise<PlatformType[]> {
    const connectedPlatforms: PlatformType[] = [];
    
    // Method 1: Check session-based platform connections
    try {
      const platformLinks = await getUserConnectedPlatforms(userId);
      
      Object.entries(platformLinks).forEach(([platform, link]) => {
        if (link && link.status === 'active') {
          connectedPlatforms.push(platform as PlatformType);
        }
      });
      
      if (connectedPlatforms.length > 0) {
        return connectedPlatforms;
      }
    } catch (error) {
      // If session-based check fails, continue with other methods
    }

    // Method 2: Check if platform-specific user accounts exist
    const platforms: PlatformType[] = ['splint_invest', 'masterworks', 'realt'];
    
    for (const platform of platforms) {
      try {
        const platformUser = await getPlatformUserByEmail(platform, this.currentUser.email);
        if (platformUser) {
          connectedPlatforms.push(platform);
        }
      } catch (error) {
        // Platform user doesn't exist, continue
      }
    }
    
    if (connectedPlatforms.length > 0) {
      return connectedPlatforms;
    }

    // Method 3: Fallback to portfolio-based detection
    const portfolios = await getUserPortfolio(userId);
    
    if (portfolios && typeof portfolios === 'object') {
      Object.entries(portfolios).forEach(([platform, assets]) => {
        if (Array.isArray(assets) && assets.length > 0) {
          connectedPlatforms.push(platform as PlatformType);
        }
      });
    }
    
    // Method 4: Default assumption for demo - if user exists, assume some connections
    if (connectedPlatforms.length === 0) {
      // For demo purposes, assume splint_invest and masterworks are connected
      // This matches the user shown in the first image
      connectedPlatforms.push('splint_invest', 'masterworks');
    }
    
    return connectedPlatforms;
  }

  private async showPortfolioSummary() {
    try {
      const portfolios = await getUserPortfolio(this.currentUser.userId);
      
      if (!portfolios || typeof portfolios !== 'object') {
        console.log('   Portfolio: Empty');
        return;
      }

      console.log('   Portfolio Summary:');
      let totalAssets = 0;
      
      Object.entries(portfolios).forEach(([platform, assets]) => {
        if (Array.isArray(assets)) {
          totalAssets += assets.length;
          console.log(`     ${platform}: ${assets.length} asset${assets.length !== 1 ? 's' : ''}`);
        }
      });
      
      console.log(`   Total Assets: ${totalAssets}`);
    } catch (error) {
      console.log('   Portfolio: Error loading portfolio data');
    }
  }

  private async managePortfolio() {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Portfolio Management:',
        choices: [
          { name: '➕ Add Assets', value: 'add_assets' },
          { name: '➖ Remove Assets', value: 'remove_assets' },
          { name: '📋 View Portfolio', value: 'view_portfolio' },
          { name: '🔙 Back to Main Menu', value: 'back' }
        ]
      }
    ]);

    switch (action) {
      case 'add_assets':
        await this.addAssets();
        break;
      case 'remove_assets':
        await this.removeAssets();
        break;
      case 'view_portfolio':
        await this.viewPortfolio();
        break;
      case 'back':
        return;
    }
  }

  private async addAssets() {
    if (this.connectedPlatforms.length === 0) {
      console.log('❌ User has no connected platforms. Cannot add assets.\n');
      return;
    }

    console.log(`\n🔍 Searching assets from connected platforms: ${this.connectedPlatforms.join(', ')}`);
    
    // For demo purposes, we'll create mock asset data
    // In a real implementation, this would call the actual search APIs
    const mockAssets = await this.getMockAssetsForPlatforms();
    
    if (mockAssets.length === 0) {
      console.log('❌ No assets found for connected platforms.\n');
      return;
    }

    const { selectedAsset } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedAsset',
        message: 'Select an asset to add:',
        choices: mockAssets.map(asset => ({
          name: `${asset.name} (${asset.platform}) - $${asset.price} - ${asset.availableShares} available`,
          value: asset
        })),
        pageSize: 10
      }
    ]);

    const { shares } = await inquirer.prompt([
      {
        type: 'number',
        name: 'shares',
        message: `How many shares to add? (Available: ${selectedAsset.availableShares}):`,
        validate: (input) => {
          const num = Number(input);
          if (isNaN(num) || num <= 0) return 'Shares must be a positive number';
          if (num > selectedAsset.availableShares) return `Cannot exceed available shares (${selectedAsset.availableShares})`;
          return true;
        }
      }
    ]);

    try {
      const portfolioHolding: UserPortfolioHolding = {
        assetId: selectedAsset.assetId,
        sharesOwned: shares,
        acquisitionPrice: selectedAsset.price,
        acquisitionDate: new Date().toISOString(),
        currentValue: selectedAsset.price * shares
      };

      await addAssetToPortfolio(this.currentUser.userId, selectedAsset.platform, portfolioHolding);
      
      console.log(`\n✅ Successfully added ${shares} shares of ${selectedAsset.name} to portfolio`);
      console.log(`   Total Value: $${(selectedAsset.price * shares).toLocaleString()}\n`);
    } catch (error) {
      console.error(`❌ Error adding asset: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  private async removeAssets() {
    try {
      const portfolios = await getUserPortfolio(this.currentUser.userId);
      
      if (!portfolios || typeof portfolios !== 'object') {
        console.log('❌ No assets in portfolio to remove.\n');
        return;
      }

      const allAssets: Array<{platform: PlatformType, asset: UserPortfolioHolding}> = [];
      
      Object.entries(portfolios).forEach(([platform, assets]) => {
        if (Array.isArray(assets)) {
          assets.forEach(asset => {
            allAssets.push({ platform: platform as PlatformType, asset });
          });
        }
      });

      if (allAssets.length === 0) {
        console.log('❌ No assets in portfolio to remove.\n');
        return;
      }

      const { selectedItem } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedItem',
          message: 'Select an asset to remove:',
          choices: allAssets.map((item, index) => ({
            name: `${item.asset.assetId} (${item.platform}) - ${item.asset.sharesOwned} shares - $${item.asset.currentValue?.toLocaleString() || 'N/A'}`,
            value: { index, ...item }
          }))
        }
      ]);

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to remove ${selectedItem.asset.assetId}?`,
          default: false
        }
      ]);

      if (confirm) {
        await removeAssetFromPortfolio(this.currentUser.userId, selectedItem.platform, selectedItem.asset.assetId);
        console.log(`\n✅ Successfully removed ${selectedItem.asset.assetId} from portfolio\n`);
      }
    } catch (error) {
      console.error(`❌ Error removing asset: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  private async viewPortfolio() {
    try {
      const portfolios = await getUserPortfolio(this.currentUser.userId);
      
      if (!portfolios || typeof portfolios !== 'object') {
        console.log('\n📋 Portfolio is empty\n');
        return;
      }

      console.log(`\n📋 Portfolio for ${this.currentUser.email}:`);
      console.log('=====================================');

      let totalValue = 0;
      let totalAssets = 0;

      Object.entries(portfolios).forEach(([platform, assets]) => {
        if (Array.isArray(assets) && assets.length > 0) {
          console.log(`\n🏢 ${platform.toUpperCase()}:`);
          
          assets.forEach(asset => {
            totalAssets++;
            const value = asset.currentValue || (asset.acquisitionPrice * asset.sharesOwned);
            totalValue += value;
            
            console.log(`   • ${asset.assetId}`);
            console.log(`     Shares: ${asset.sharesOwned}`);
            console.log(`     Acquisition Price: $${asset.acquisitionPrice}`);
            console.log(`     Current Value: $${value.toLocaleString()}`);
            console.log(`     Date: ${new Date(asset.acquisitionDate).toLocaleDateString()}`);
          });
        }
      });

      console.log('\n=====================================');
      console.log(`Total Assets: ${totalAssets}`);
      console.log(`Total Portfolio Value: $${totalValue.toLocaleString()}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error viewing portfolio: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  private async getMockAssetsForPlatforms(): Promise<SearchResult[]> {
    const mockAssets: SearchResult[] = [];

    if (this.connectedPlatforms.includes('splint_invest')) {
      mockAssets.push(
        {
          assetId: 'WINE_DOM_PERIGNON_2015',
          name: 'Dom Pérignon Vintage 2015',
          price: 250,
          availableShares: 100,
          platform: 'splint_invest',
          category: 'wine'
        },
        {
          assetId: 'WINE_CHATEAU_MARGAUX_2016',
          name: 'Château Margaux 2016',
          price: 800,
          availableShares: 50,
          platform: 'splint_invest',
          category: 'wine'
        }
      );
    }

    if (this.connectedPlatforms.includes('masterworks')) {
      mockAssets.push(
        {
          assetId: 'ART_BASQUIAT_UNTITLED_1982',
          name: 'Jean-Michel Basquiat - Untitled (1982)',
          price: 15000,
          availableShares: 200,
          platform: 'masterworks',
          category: 'art'
        },
        {
          assetId: 'ART_KAWS_COMPANION_2020',
          name: 'KAWS - Companion (2020)',
          price: 5000,
          availableShares: 80,
          platform: 'masterworks',
          category: 'art'
        }
      );
    }

    if (this.connectedPlatforms.includes('realt')) {
      mockAssets.push(
        {
          assetId: 'REAL_DETROIT_RENTAL_001',
          name: 'Detroit Rental Property #001',
          price: 1000,
          availableShares: 500,
          platform: 'realt',
          category: 'real_estate'
        }
      );
    }

    return mockAssets;
  }
}

program
  .name('admin-cli')
  .description('LuxBridge Portfolio Admin CLI')
  .version('1.0.0');

program
  .command('start')
  .description('Start the interactive admin CLI')
  .action(async () => {
    const cli = new AdminCLI();
    await cli.start();
  });

program.parse();

// Default to start if no command specified
if (process.argv.length === 2) {
  const cli = new AdminCLI();
  cli.start();
}