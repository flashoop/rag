/**
 * Comparison Test: Qdrant RAG vs Knowledge MCP Server
 *
 * This script runs both approaches and compares:
 * - Query latency
 * - Search accuracy
 * - Storage efficiency
 * - Ease of use
 */

import QdrantRAGTester from './test-qdrant-rag';
import KnowledgeMCPTester from './test-knowledge-mcp';
import { DemoConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

interface ComparisonMetrics {
  approach: string;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p90Latency: number;
  avgResultsCount: number;
  storageSize: number;
  setupTime: number;
  queryTime: number;
}

interface QueryComparison {
  query: string;
  qdrant: {
    latency: number;
    results: number;
    topScore: number;
  };
  knowledge: {
    latency: number;
    results: number;
    topRank: number;
  };
  winner: 'qdrant' | 'knowledge' | 'tie';
}

export class RAGComparisonTester {
  private config = DemoConfig.get();

  /**
   * Run comprehensive comparison
   */
  async runComparison(): Promise<void> {
    console.log('⚔️  RAG Approach Comparison\n');
    console.log('━'.repeat(80));
    console.log('Comparing:');
    console.log('  1. Qdrant RAG (Vector-based semantic search)');
    console.log('  2. Knowledge MCP Server (SQLite FTS5 full-text search)');
    console.log('━'.repeat(80));
    console.log('');

    // Load test queries
    const queriesPath = path.join(this.config.testDataPath, 'test-queries.json');
    const testData = JSON.parse(fs.readFileSync(queriesPath, 'utf-8'));
    const queries = testData.queries.slice(0, 10); // Test 10 queries

    // Initialize testers
    const qdrantTester = new QdrantRAGTester();
    const knowledgeTester = new KnowledgeMCPTester();

    // Metrics storage
    const qdrantLatencies: number[] = [];
    const knowledgeLatencies: number[] = [];
    const comparisons: QueryComparison[] = [];

    try {
      // Setup phase
      console.log('📦 Setup Phase\n');

      console.log('Setting up Qdrant RAG...');
      const qdrantSetupStart = Date.now();
      await qdrantTester.setup();
      await qdrantTester.indexSampleDocuments();
      const qdrantSetupTime = Date.now() - qdrantSetupStart;
      console.log(`✅ Qdrant setup complete (${qdrantSetupTime}ms)\n`);

      console.log('Setting up Knowledge MCP...');
      const knowledgeSetupStart = Date.now();
      await knowledgeTester.setup();
      await knowledgeTester.indexSampleDocuments();
      const knowledgeSetupTime = Date.now() - knowledgeSetupStart;
      console.log(`✅ Knowledge MCP setup complete (${knowledgeSetupTime}ms)\n`);

      // Query phase
      console.log('🔍 Query Testing Phase\n');
      console.log('━'.repeat(80));

      for (const queryData of queries) {
        console.log(`\nQuery: "${queryData.query}"`);

        // Test Qdrant
        const qdrantStart = Date.now();
        const qdrantResults = await qdrantTester.search(queryData.query, 5);
        const qdrantLatency = Date.now() - qdrantStart;
        qdrantLatencies.push(qdrantLatency);

        // Test Knowledge MCP
        const knowledgeStart = Date.now();
        const knowledgeResults = knowledgeTester.search(queryData.query, 5);
        const knowledgeLatency = Date.now() - knowledgeStart;
        knowledgeLatencies.push(knowledgeLatency);

        // Compare
        const comparison: QueryComparison = {
          query: queryData.query,
          qdrant: {
            latency: qdrantLatency,
            results: qdrantResults.length,
            topScore: qdrantResults.length > 0 ? qdrantResults[0].score : 0,
          },
          knowledge: {
            latency: knowledgeLatency,
            results: knowledgeResults.length,
            topRank: knowledgeResults.length > 0 ? knowledgeResults[0].rank : 0,
          },
          winner: qdrantLatency < knowledgeLatency ? 'qdrant' :
                   knowledgeLatency < qdrantLatency ? 'knowledge' : 'tie',
        };

        comparisons.push(comparison);

        console.log(`  Qdrant:    ${qdrantLatency}ms | ${qdrantResults.length} results | Score: ${comparison.qdrant.topScore.toFixed(3)}`);
        console.log(`  Knowledge: ${knowledgeLatency}ms | ${knowledgeResults.length} results | Rank: ${comparison.knowledge.topRank.toFixed(3)}`);
        console.log(`  Winner: ${comparison.winner === 'qdrant' ? '🏆 Qdrant' : comparison.winner === 'knowledge' ? '🏆 Knowledge' : '🤝 Tie'}`);
      }

      // Storage comparison
      console.log('\n\n💾 Storage Analysis\n');
      console.log('━'.repeat(80));

      const qdrantSize = this.getDirectorySize(this.config.vectorDbPath);
      const knowledgeSize = this.getFileSize(this.config.knowledgeDbPath);

      console.log(`  Qdrant storage:    ${(qdrantSize / 1024).toFixed(2)} KB`);
      console.log(`  Knowledge DB:      ${(knowledgeSize / 1024).toFixed(2)} KB`);
      console.log(`  Winner:            ${qdrantSize < knowledgeSize ? '🏆 Qdrant (smaller)' : '🏆 Knowledge (smaller)'}`);

      // Calculate metrics
      const qdrantMetrics: ComparisonMetrics = {
        approach: 'Qdrant RAG',
        avgLatency: this.average(qdrantLatencies),
        minLatency: Math.min(...qdrantLatencies),
        maxLatency: Math.max(...qdrantLatencies),
        p90Latency: this.percentile(qdrantLatencies, 90),
        avgResultsCount: this.average(comparisons.map(c => c.qdrant.results)),
        storageSize: qdrantSize,
        setupTime: qdrantSetupTime,
        queryTime: this.sum(qdrantLatencies),
      };

      const knowledgeMetrics: ComparisonMetrics = {
        approach: 'Knowledge MCP',
        avgLatency: this.average(knowledgeLatencies),
        minLatency: Math.min(...knowledgeLatencies),
        maxLatency: Math.max(...knowledgeLatencies),
        p90Latency: this.percentile(knowledgeLatencies, 90),
        avgResultsCount: this.average(comparisons.map(c => c.knowledge.results)),
        storageSize: knowledgeSize,
        setupTime: knowledgeSetupTime,
        queryTime: this.sum(knowledgeLatencies),
      };

      // Print summary
      this.printComparisonSummary(qdrantMetrics, knowledgeMetrics, comparisons);

      // Recommendations
      this.printRecommendations(qdrantMetrics, knowledgeMetrics);

    } catch (error) {
      console.error('\n❌ Comparison failed:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Print comparison summary
   */
  private printComparisonSummary(
    qdrant: ComparisonMetrics,
    knowledge: ComparisonMetrics,
    comparisons: QueryComparison[]
  ): void {
    console.log('\n\n📊 COMPARISON SUMMARY\n');
    console.log('━'.repeat(80));

    console.log('\n⏱️  Latency Comparison:\n');
    console.log('  Metric           Qdrant RAG    Knowledge MCP    Winner');
    console.log('  ─────────────────────────────────────────────────────────');
    console.log(`  Avg Latency      ${qdrant.avgLatency.toFixed(1)}ms        ${knowledge.avgLatency.toFixed(1)}ms           ${qdrant.avgLatency < knowledge.avgLatency ? '🏆 Qdrant' : '🏆 Knowledge'}`);
    console.log(`  Min Latency      ${qdrant.minLatency}ms          ${knowledge.minLatency}ms             ${qdrant.minLatency < knowledge.minLatency ? '🏆 Qdrant' : '🏆 Knowledge'}`);
    console.log(`  Max Latency      ${qdrant.maxLatency}ms         ${knowledge.maxLatency}ms            ${qdrant.maxLatency < knowledge.maxLatency ? '🏆 Qdrant' : '🏆 Knowledge'}`);
    console.log(`  P90 Latency      ${qdrant.p90Latency.toFixed(1)}ms        ${knowledge.p90Latency.toFixed(1)}ms           ${qdrant.p90Latency < knowledge.p90Latency ? '🏆 Qdrant' : '🏆 Knowledge'}`);

    console.log('\n📈 Results Comparison:\n');
    console.log(`  Avg Results      ${qdrant.avgResultsCount.toFixed(1)}          ${knowledge.avgResultsCount.toFixed(1)}            ${qdrant.avgResultsCount > knowledge.avgResultsCount ? '🏆 Qdrant' : knowledge.avgResultsCount > qdrant.avgResultsCount ? '🏆 Knowledge' : '🤝 Tie'}`);

    console.log('\n⚡ Performance Comparison:\n');
    console.log(`  Setup Time       ${qdrant.setupTime}ms       ${knowledge.setupTime}ms         ${qdrant.setupTime < knowledge.setupTime ? '🏆 Qdrant' : '🏆 Knowledge'}`);
    console.log(`  Total Query Time ${qdrant.queryTime}ms        ${knowledge.queryTime}ms          ${qdrant.queryTime < knowledge.queryTime ? '🏆 Qdrant' : '🏆 Knowledge'}`);

    console.log('\n💾 Storage Comparison:\n');
    console.log(`  Storage Size     ${(qdrant.storageSize / 1024).toFixed(2)} KB      ${(knowledge.storageSize / 1024).toFixed(2)} KB        ${qdrant.storageSize < knowledge.storageSize ? '🏆 Qdrant' : '🏆 Knowledge'}`);

    console.log('\n🏆 Query-by-Query Winners:\n');
    const qdrantWins = comparisons.filter(c => c.winner === 'qdrant').length;
    const knowledgeWins = comparisons.filter(c => c.winner === 'knowledge').length;
    const ties = comparisons.filter(c => c.winner === 'tie').length;

    console.log(`  Qdrant wins:     ${qdrantWins}/${comparisons.length} queries`);
    console.log(`  Knowledge wins:  ${knowledgeWins}/${comparisons.length} queries`);
    console.log(`  Ties:            ${ties}/${comparisons.length} queries`);

    console.log('\n━'.repeat(80));
  }

  /**
   * Print recommendations
   */
  private printRecommendations(qdrant: ComparisonMetrics, knowledge: ComparisonMetrics): void {
    console.log('\n\n💡 RECOMMENDATIONS\n');
    console.log('━'.repeat(80));

    console.log('\n✅ Use Qdrant RAG When:\n');
    console.log('  • You need semantic understanding (e.g., "privilege escalation" ~ "privesc")');
    console.log('  • Queries are conceptual rather than keyword-based');
    console.log('  • You have budget for OpenAI API calls (~$0.05/month for this workload)');
    console.log('  • You want to scale to larger datasets (100K+ documents)');
    console.log('  • Multi-language support is important');

    console.log('\n✅ Use Knowledge MCP Server When:\n');
    console.log('  • You need sub-10ms query latency (FTS5 is faster)');
    console.log('  • Zero-cost operation is critical (no API calls)');
    console.log('  • Queries are keyword-based ("nmap", "sql injection")');
    console.log('  • You want simpler deployment (single SQLite file)');
    console.log('  • Dataset is small-to-medium (<50K documents)');
    console.log('  • Offline operation is required');

    console.log('\n🎯 For This Bug Bounty Use Case:\n');
    if (knowledge.avgLatency < qdrant.avgLatency && knowledge.avgLatency < 50) {
      console.log('  🏆 WINNER: Knowledge MCP Server');
      console.log('  Reason: Extremely low latency, zero API cost, perfect for keyword searches');
      console.log('  Note: Most pentesting queries are keyword-based ("nmap scan", "suid exploit")');
    } else if (qdrant.avgResultsCount > knowledge.avgResultsCount * 1.2) {
      console.log('  🏆 WINNER: Qdrant RAG');
      console.log('  Reason: Better search recall, semantic understanding helpful');
    } else {
      console.log('  🤝 RECOMMENDATION: Hybrid Approach');
      console.log('  • Use Knowledge MCP for exact matches and service lookups');
      console.log('  • Use Qdrant RAG as fallback for conceptual queries');
    }

    console.log('\n━'.repeat(80));
    console.log('');
  }

  /**
   * Utility functions
   */
  private average(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private sum(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0);
  }

  private percentile(numbers: number[], p: number): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  private getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;

    const calculateSize = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          calculateSize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
    };

    try {
      calculateSize(dirPath);
    } catch {
      return 0;
    }

    return totalSize;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 RAG Approach Comparison Tool\n');

  if (!DemoConfig.validateConfig()) {
    console.log('\n⚠️  Skipping Qdrant tests (requires OpenAI API key)');
    console.log('   Running Knowledge MCP tests only...\n');

    const knowledgeTester = new KnowledgeMCPTester();
    await knowledgeTester.setup();
    await knowledgeTester.indexSampleDocuments();
    await knowledgeTester.runTests();
    return;
  }

  DemoConfig.ensureDirectories();

  const comparisonTester = new RAGComparisonTester();

  try {
    await comparisonTester.runComparison();
  } catch (error) {
    console.error('\n❌ Comparison failed:', (error as Error).message);
    process.exit(1);
  }

  console.log('✅ Comparison completed successfully!\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default RAGComparisonTester;
