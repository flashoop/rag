/**
 * Test Script for Basic RAG Implementation with Qdrant
 * Based on RAG_IMPLEMENTATION_GUIDE.md
 *
 * This demonstrates the vector-based semantic search approach
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { DemoConfig } from './config';

interface SearchResult {
  id: number;
  score: number;
  text: string;
  metadata: {
    file_name: string;
    section_heading: string;
    tools_mentioned: string[];
  };
}

interface TestResult {
  query: string;
  latency_ms: number;
  results_count: number;
  top_score: number;
  results: SearchResult[];
  passed: boolean;
}

export class QdrantRAGTester {
  private client: QdrantClient;
  private openai: OpenAI;
  private config = DemoConfig.get();

  constructor() {
    // Initialize Qdrant client
    this.client = new QdrantClient({
      path: this.config.vectorDbPath,
    });

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.config.openaiApiKey,
    });
  }

  /**
   * Setup test environment - create collection
   */
  async setup(): Promise<void> {
    console.log('🔧 Setting up Qdrant test environment...\n');

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        c => c.name === this.config.collectionName
      );

      if (exists) {
        console.log(`✅ Collection '${this.config.collectionName}' already exists`);
        return;
      }

      // Create collection
      await this.client.createCollection(this.config.collectionName, {
        vectors: {
          size: this.config.embeddingDimensions,
          distance: 'Cosine',
        },
      });

      console.log(`✅ Created collection '${this.config.collectionName}'`);
    } catch (error) {
      console.error('❌ Setup failed:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Embed text using OpenAI
   */
  async embedText(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.config.embeddingModel,
      input: text,
      dimensions: this.config.embeddingDimensions,
    });

    return response.data[0].embedding;
  }

  /**
   * Embed multiple texts in batches
   */
  async embedBatch(texts: string[], batchSize: number = 100): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await this.openai.embeddings.create({
        model: this.config.embeddingModel,
        input: batch,
        dimensions: this.config.embeddingDimensions,
      });

      embeddings.push(...response.data.map(item => item.embedding));

      console.log(`   Embedded batch ${Math.floor(i / batchSize) + 1} (${batch.length} texts)`);
    }

    return embeddings;
  }

  /**
   * Index sample documents for testing
   */
  async indexSampleDocuments(): Promise<void> {
    console.log('\n📚 Indexing sample documents...\n');

    // Read sample writeup
    const writeupPath = path.join(this.config.testDataPath, 'sample-writeup.md');
    const content = fs.readFileSync(writeupPath, 'utf-8');

    // Simple chunking by sections
    const chunks = this.chunkBySection(content);
    console.log(`   Created ${chunks.length} chunks from sample writeup`);

    // Generate embeddings
    console.log('   Generating embeddings...');
    const texts = chunks.map(c => c.content);
    const embeddings = await this.embedBatch(texts);

    // Prepare points for insertion
    const points = chunks.map((chunk, idx) => ({
      id: idx,
      vector: embeddings[idx],
      payload: {
        text: chunk.content,
        file_name: 'sample-writeup.md',
        section_heading: chunk.section,
        tools_mentioned: this.extractTools(chunk.content),
        category: this.categorizeSection(chunk.section),
      },
    }));

    // Insert into Qdrant
    await this.client.upsert(this.config.collectionName, {
      wait: true,
      points,
    });

    console.log(`✅ Indexed ${points.length} chunks successfully\n`);
  }

  /**
   * Simple section-based chunking
   */
  private chunkBySection(content: string): Array<{ section: string; content: string }> {
    const chunks: Array<{ section: string; content: string }> = [];
    const lines = content.split('\n');
    let currentSection = 'General';
    let currentContent: string[] = [];

    const sectionHeaders = ['Synopsis', 'Enumeration', 'Foothold', 'Privilege Escalation'];

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if line is a section header
      const matchedHeader = sectionHeaders.find(h =>
        trimmed.toLowerCase().startsWith('## ' + h.toLowerCase())
      );

      if (matchedHeader) {
        // Save previous section
        if (currentContent.length > 0) {
          chunks.push({
            section: currentSection,
            content: currentContent.join('\n'),
          });
        }

        currentSection = matchedHeader;
        currentContent = [line];
      } else {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentContent.length > 0) {
      chunks.push({
        section: currentSection,
        content: currentContent.join('\n'),
      });
    }

    return chunks;
  }

  /**
   * Extract tool names from content
   */
  private extractTools(content: string): string[] {
    const tools = new Set<string>();
    const toolPatterns = [
      'nmap', 'sqlmap', 'linpeas', 'msfvenom', 'netcat', 'nc',
      'burp', 'gobuster', 'dirb', 'hydra', 'john', 'hashcat',
      'mimikatz', 'bloodhound', 'crackmapexec', 'impacket',
    ];

    const lowerContent = content.toLowerCase();
    for (const tool of toolPatterns) {
      if (lowerContent.includes(tool)) {
        tools.add(tool);
      }
    }

    return Array.from(tools);
  }

  /**
   * Categorize section into pentest phase
   */
  private categorizeSection(section: string): string {
    const lower = section.toLowerCase();
    if (lower.includes('enum')) return 'enumeration';
    if (lower.includes('foothold')) return 'foothold';
    if (lower.includes('privesc') || lower.includes('privilege')) return 'privesc';
    return 'general';
  }

  /**
   * Search for relevant documents
   */
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    // Embed query
    const queryEmbedding = await this.embedText(query);

    // Search Qdrant
    const searchResults = await this.client.search(this.config.collectionName, {
      vector: queryEmbedding,
      limit,
      score_threshold: this.config.minSimilarityScore,
    });

    // Format results
    return searchResults.map(result => ({
      id: result.id as number,
      score: result.score,
      text: (result.payload?.text as string) || '',
      metadata: {
        file_name: (result.payload?.file_name as string) || '',
        section_heading: (result.payload?.section_heading as string) || '',
        tools_mentioned: (result.payload?.tools_mentioned as string[]) || [],
      },
    }));
  }

  /**
   * Run test suite
   */
  async runTests(): Promise<void> {
    console.log('\n🧪 Running Qdrant RAG Test Suite\n');
    console.log('━'.repeat(80));

    // Load test queries
    const queriesPath = path.join(this.config.testDataPath, 'test-queries.json');
    const testData = JSON.parse(fs.readFileSync(queriesPath, 'utf-8'));
    const queries = testData.queries.slice(0, 5); // Test first 5 queries

    const results: TestResult[] = [];

    for (const queryData of queries) {
      console.log(`\n📝 Query ${queryData.id}: "${queryData.query}"`);

      const startTime = Date.now();
      const searchResults = await this.search(queryData.query, this.config.topK);
      const latency = Date.now() - startTime;

      const testResult: TestResult = {
        query: queryData.query,
        latency_ms: latency,
        results_count: searchResults.length,
        top_score: searchResults.length > 0 ? searchResults[0].score : 0,
        results: searchResults,
        passed: searchResults.length > 0 && latency < testData.evaluation_criteria.expected_latency_ms,
      };

      results.push(testResult);

      console.log(`   ⏱️  Latency: ${latency}ms`);
      console.log(`   📊 Results: ${searchResults.length}`);
      console.log(`   🎯 Top Score: ${testResult.top_score.toFixed(3)}`);

      if (searchResults.length > 0) {
        console.log(`   📄 Top Result: ${searchResults[0].metadata.section_heading}`);
        console.log(`   🔧 Tools: ${searchResults[0].metadata.tools_mentioned.join(', ') || 'None'}`);
      }

      console.log(`   ${testResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    }

    // Print summary
    this.printSummary(results);
  }

  /**
   * Print test summary
   */
  private printSummary(results: TestResult[]): void {
    console.log('\n');
    console.log('━'.repeat(80));
    console.log('📊 TEST SUMMARY\n');

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const avgLatency = results.reduce((sum, r) => sum + r.latency_ms, 0) / total;
    const avgScore = results.reduce((sum, r) => sum + r.top_score, 0) / total;

    console.log(`   Tests Passed:        ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`   Average Latency:     ${avgLatency.toFixed(1)}ms`);
    console.log(`   Average Top Score:   ${avgScore.toFixed(3)}`);
    console.log(`   Total Results:       ${results.reduce((sum, r) => sum + r.results_count, 0)}`);

    console.log('\n━'.repeat(80));
    console.log('');
  }

  /**
   * Cleanup - delete collection
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    try {
      await this.client.deleteCollection(this.config.collectionName);
      console.log('✅ Cleanup complete\n');
    } catch (error) {
      console.log('⚠️  Cleanup skipped (collection may not exist)\n');
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Qdrant RAG Tester\n');
  console.log('Based on: RAG_IMPLEMENTATION_GUIDE.md');
  console.log('Approach: Vector-based semantic search with OpenAI embeddings\n');

  // Validate configuration
  if (!DemoConfig.validateConfig()) {
    process.exit(1);
  }

  DemoConfig.ensureDirectories();
  DemoConfig.printConfig();

  const tester = new QdrantRAGTester();

  try {
    await tester.setup();
    await tester.indexSampleDocuments();
    await tester.runTests();
  } catch (error) {
    console.error('\n❌ Test execution failed:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }

  console.log('✅ All tests completed successfully!\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default QdrantRAGTester;
