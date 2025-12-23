/**
 * Demo Configuration for RAG System Testing
 * Supports both approaches from the design documents
 */

import * as path from 'path';
import * as fs from 'fs';

export interface RAGConfig {
  // API Keys
  openaiApiKey: string;

  // Paths
  projectRoot: string;
  rawDataPath: string;
  vectorDbPath: string;
  chromaDbPath: string;
  knowledgeDbPath: string;
  testDataPath: string;

  // Embedding Settings
  embeddingModel: string;
  embeddingDimensions: number;

  // Chunking Settings
  chunkSize: number;
  chunkOverlap: number;

  // Vector DB Settings (Qdrant)
  collectionName: string;
  distanceMetric: 'cosine' | 'euclidean' | 'dot';

  // ChromaDB Settings
  chromaCollectionName: string;

  // Retrieval Settings
  topK: number;
  minSimilarityScore: number;
  useReranker: boolean;
  rerankerModel: string;

  // Knowledge MCP Server Settings
  knowledgeServerHost: string;
  knowledgeServerPort: number;
}

export class DemoConfig {
  private static config: RAGConfig;

  static initialize(): RAGConfig {
    const projectRoot = path.resolve(__dirname, '..');

    this.config = {
      // API Keys
      openaiApiKey: process.env.OPENAI_API_KEY || '',

      // Paths
      projectRoot,
      rawDataPath: path.join(projectRoot, 'data', 'raw'),
      vectorDbPath: path.join(projectRoot, 'qdrant_storage'),
      chromaDbPath: path.join(projectRoot, 'chroma_storage'),
      knowledgeDbPath: path.join(projectRoot, 'data', 'knowledge.db'),
      testDataPath: path.join(projectRoot, 'demo', 'test_data'),

      // Embedding Settings
      embeddingModel: 'text-embedding-3-small',
      embeddingDimensions: 1536,

      // Chunking Settings
      chunkSize: 600, // tokens
      chunkOverlap: 100, // tokens

      // Vector DB Settings (Qdrant)
      collectionName: 'bug_bounty_docs',
      distanceMetric: 'cosine',

      // ChromaDB Settings
      chromaCollectionName: 'bug_bounty_docs_chroma',

      // Retrieval Settings
      topK: 5,
      minSimilarityScore: 0.65,
      useReranker: false,
      rerankerModel: 'cross-encoder/ms-marco-MiniLM-L-6-v2',

      // Knowledge MCP Server Settings
      knowledgeServerHost: 'localhost',
      knowledgeServerPort: 6333,
    };

    return this.config;
  }

  static get(): RAGConfig {
    if (!this.config) {
      return this.initialize();
    }
    return this.config;
  }

  static ensureDirectories(): void {
    const config = this.get();
    const directories = [
      config.rawDataPath,
      config.vectorDbPath,
      config.chromaDbPath,
      config.testDataPath,
      path.dirname(config.knowledgeDbPath),
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    });
  }

  static validateConfig(): boolean {
    const config = this.get();

    if (!config.openaiApiKey) {
      console.log('⚠️  Warning: OPENAI_API_KEY not set in environment');
      console.log('   Set it with: export OPENAI_API_KEY=your-key-here');
      return false;
    }

    console.log('✅ Configuration validated successfully');
    return true;
  }

  static printConfig(): void {
    const config = this.get();
    console.log('\n📋 RAG Demo Configuration:\n');
    console.log('━'.repeat(60));
    console.log(`  Embedding Model:       ${config.embeddingModel}`);
    console.log(`  Embedding Dimensions:  ${config.embeddingDimensions}`);
    console.log(`  Chunk Size:            ${config.chunkSize} tokens`);
    console.log(`  Chunk Overlap:         ${config.chunkOverlap} tokens`);
    console.log(`  Top-K Results:         ${config.topK}`);
    console.log(`  Min Similarity:        ${config.minSimilarityScore}`);
    console.log(`  Use Re-ranker:         ${config.useReranker}`);
    console.log('━'.repeat(60));
    console.log(`  Vector DB Path:        ${config.vectorDbPath}`);
    console.log(`  Knowledge DB Path:     ${config.knowledgeDbPath}`);
    console.log(`  Test Data Path:        ${config.testDataPath}`);
    console.log('━'.repeat(60));
    console.log('');
  }
}

// Initialize configuration on import
DemoConfig.initialize();
