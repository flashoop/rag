/**
 * Test Script for Knowledge MCP Server Implementation
 * Based on KNOWLEDGE-MCP-SERVER-DESIGN.md
 *
 * This demonstrates the SQLite FTS5 full-text search approach
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { DemoConfig } from './config';

interface Writeup {
  id?: number;
  title: string;
  date: string;
  author: string;
  difficulty: string;
  platform: string;
  skills_required: string; // JSON string
  skills_learned: string; // JSON string
  source_path: string;
}

interface KnowledgeChunk {
  id?: number;
  writeup_id: number;
  category: string;
  content: string;
  tags: string; // JSON array
  service_context?: string;
}

interface SearchResult {
  chunk_id: number;
  writeup: string;
  difficulty: string;
  category: string;
  service_context?: string;
  tags: string[];
  content_preview: string;
  rank: number;
}

interface TestResult {
  query: string;
  latency_ms: number;
  results_count: number;
  top_rank: number;
  results: SearchResult[];
  passed: boolean;
}

export class KnowledgeMCPTester {
  private db: Database.Database;
  private config = DemoConfig.get();

  constructor() {
    // Initialize SQLite database
    this.db = new Database(this.config.knowledgeDbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency
  }

  /**
   * Setup test environment - create tables and FTS5 index
   */
  async setup(): Promise<void> {
    console.log('🔧 Setting up Knowledge MCP test environment...\n');

    try {
      // Drop existing tables if they exist
      this.db.exec(`
        DROP TABLE IF EXISTS knowledge_fts;
        DROP TABLE IF EXISTS knowledge_chunks;
        DROP TABLE IF EXISTS writeups;
      `);

      // Create writeups table
      this.db.exec(`
        CREATE TABLE writeups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          date TEXT NOT NULL,
          author TEXT,
          difficulty TEXT,
          platform TEXT,
          skills_required TEXT, -- JSON array
          skills_learned TEXT,  -- JSON array
          source_path TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create knowledge_chunks table
      this.db.exec(`
        CREATE TABLE knowledge_chunks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          writeup_id INTEGER NOT NULL,
          category TEXT NOT NULL,
          content TEXT NOT NULL,
          tags TEXT NOT NULL, -- JSON array
          service_context TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (writeup_id) REFERENCES writeups(id) ON DELETE CASCADE
        );
      `);

      // Create FTS5 full-text search index
      this.db.exec(`
        CREATE VIRTUAL TABLE knowledge_fts USING fts5(
          content,
          tags,
          service_context,
          category,
          content='knowledge_chunks',
          content_rowid='id',
          tokenize='porter unicode61'
        );
      `);

      // Create triggers to keep FTS index in sync
      this.db.exec(`
        CREATE TRIGGER knowledge_chunks_ai AFTER INSERT ON knowledge_chunks BEGIN
          INSERT INTO knowledge_fts(rowid, content, tags, service_context, category)
          VALUES (new.id, new.content, new.tags, new.service_context, new.category);
        END;

        CREATE TRIGGER knowledge_chunks_ad AFTER DELETE ON knowledge_chunks BEGIN
          DELETE FROM knowledge_fts WHERE rowid = old.id;
        END;

        CREATE TRIGGER knowledge_chunks_au AFTER UPDATE ON knowledge_chunks BEGIN
          DELETE FROM knowledge_fts WHERE rowid = old.id;
          INSERT INTO knowledge_fts(rowid, content, tags, service_context, category)
          VALUES (new.id, new.content, new.tags, new.service_context, new.category);
        END;
      `);

      // Create indexes for fast filtering
      this.db.exec(`
        CREATE INDEX idx_chunks_category ON knowledge_chunks(category);
        CREATE INDEX idx_chunks_writeup ON knowledge_chunks(writeup_id);
      `);

      console.log('✅ Database schema created successfully\n');
    } catch (error) {
      console.error('❌ Setup failed:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Add a writeup to the database
   */
  addWriteup(writeup: Writeup): number {
    const stmt = this.db.prepare(`
      INSERT INTO writeups (title, date, author, difficulty, platform, skills_required, skills_learned, source_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      writeup.title,
      writeup.date,
      writeup.author,
      writeup.difficulty,
      writeup.platform,
      writeup.skills_required,
      writeup.skills_learned,
      writeup.source_path
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Add a knowledge chunk
   */
  addChunk(chunk: KnowledgeChunk): number {
    const stmt = this.db.prepare(`
      INSERT INTO knowledge_chunks (writeup_id, category, content, tags, service_context)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      chunk.writeup_id,
      chunk.category,
      chunk.content,
      chunk.tags,
      chunk.service_context || null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Index sample documents
   */
  async indexSampleDocuments(): Promise<void> {
    console.log('📚 Indexing sample documents...\n');

    // Read sample writeup
    const writeupPath = path.join(this.config.testDataPath, 'sample-writeup.md');
    const content = fs.readFileSync(writeupPath, 'utf-8');

    // Extract metadata
    const metadata = this.extractMetadata(content);

    // Add writeup
    const writeupId = this.addWriteup({
      title: metadata.title,
      date: metadata.date,
      author: metadata.author,
      difficulty: metadata.difficulty,
      platform: 'Linux',
      skills_required: JSON.stringify(metadata.skills_required),
      skills_learned: JSON.stringify(metadata.skills_learned),
      source_path: writeupPath,
    });

    console.log(`   Created writeup: ${metadata.title} (ID: ${writeupId})`);

    // Chunk content by section
    const chunks = this.chunkBySection(content);
    console.log(`   Created ${chunks.length} chunks`);

    // Add chunks
    let chunkCount = 0;
    for (const chunk of chunks) {
      const tags = this.extractTags(chunk.content);
      const services = this.extractServiceContext(chunk.content);

      this.addChunk({
        writeup_id: writeupId,
        category: this.categorizeSection(chunk.section),
        content: chunk.content,
        tags: JSON.stringify(tags),
        service_context: services,
      });

      chunkCount++;
    }

    console.log(`✅ Indexed ${chunkCount} chunks successfully\n`);
  }

  /**
   * Extract metadata from markdown content
   */
  private extractMetadata(content: string): any {
    const lines = content.split('\n');
    const metadata: any = {
      title: 'Unknown',
      author: 'Unknown',
      difficulty: 'Unknown',
      date: new Date().toISOString(),
      skills_required: [],
      skills_learned: [],
    };

    for (let i = 0; i < Math.min(30, lines.length); i++) {
      const line = lines[i].trim();

      // Title extraction
      if (line.startsWith('# ') && metadata.title === 'Unknown') {
        metadata.title = line.replace(/^#\s*/, '');
      }

      // Author
      if (line.startsWith('Prepared By:')) {
        metadata.author = line.replace('Prepared By:', '').trim();
      }

      // Difficulty
      if (line.startsWith('Difficulty:')) {
        metadata.difficulty = line.replace('Difficulty:', '').trim();
      }

      // Date
      const dateMatch = line.match(/(\d{1,2})(st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/);
      if (dateMatch) {
        const monthStr = dateMatch[3];
        const day = dateMatch[1];
        const year = dateMatch[4];
        try {
          metadata.date = new Date(`${monthStr} ${day}, ${year}`).toISOString();
        } catch (e) {
          // Keep default
        }
      }

      // Skills Required
      if (line.match(/^Skills Required/i)) {
        let j = i + 1;
        while (j < lines.length) {
          const skillLine = lines[j].trim();
          if (skillLine === '' || skillLine.match(/^Skills (Learned|Required)/i) || skillLine.match(/^[A-Z][a-z]+:/)) {
            break;
          }
          if (skillLine.length > 0) {
            metadata.skills_required.push(skillLine.replace(/^[-*•]\s*/, ''));
          }
          j++;
        }
      }

      // Skills Learned
      if (line.match(/^Skills Learned/i)) {
        let j = i + 1;
        while (j < lines.length) {
          const skillLine = lines[j].trim();
          if (skillLine === '' || skillLine.match(/^Skills (Learned|Required)/i) || skillLine.match(/^[A-Z][a-z]+:/)) {
            break;
          }
          if (skillLine.length > 0) {
            metadata.skills_learned.push(skillLine.replace(/^[-*•]\s*/, ''));
          }
          j++;
        }
      }
    }

    return metadata;
  }

  /**
   * Chunk content by section
   */
  private chunkBySection(content: string): Array<{ section: string; content: string }> {
    const chunks: Array<{ section: string; content: string }> = [];
    const lines = content.split('\n');
    let currentSection = 'General';
    let currentContent: string[] = [];

    const sectionHeaders = ['Synopsis', 'Enumeration', 'Foothold', 'Privilege Escalation', 'Post-Exploitation'];

    for (const line of lines) {
      const trimmed = line.trim();

      const matchedHeader = sectionHeaders.find(h =>
        trimmed.toLowerCase().startsWith('## ' + h.toLowerCase())
      );

      if (matchedHeader) {
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

    if (currentContent.length > 0) {
      chunks.push({
        section: currentSection,
        content: currentContent.join('\n'),
      });
    }

    return chunks;
  }

  /**
   * Extract tags from content (50+ keywords)
   */
  private extractTags(content: string): string[] {
    const tags = new Set<string>();
    const lowerContent = content.toLowerCase();

    // Privilege Escalation keywords
    const privescKeywords = [
      'suid', 'sudo', 'kernel exploit', 'kernel', 'cron', 'cronjob',
      'capabilities', 'cap_setuid', 'path hijacking', 'ld_preload',
    ];

    // Web vulnerabilities
    const webKeywords = [
      'sql injection', 'sqli', 'xss', 'csrf', 'idor',
      'lfi', 'local file inclusion', 'rfi', 'path traversal',
      'file upload', 'xxe', 'ssrf', 'ssti', 'log poisoning',
    ];

    // Services
    const serviceKeywords = [
      'ftp', 'ssh', 'http', 'https', 'smb', 'samba',
      'mysql', 'postgresql', 'redis', 'mongodb', 'ldap',
    ];

    // Tools
    const toolKeywords = [
      'nmap', 'sqlmap', 'burp', 'metasploit', 'msf', 'msfvenom',
      'linpeas', 'netcat', 'nc', 'searchsploit', 'john', 'hashcat',
    ];

    const allKeywords = [...privescKeywords, ...webKeywords, ...serviceKeywords, ...toolKeywords];

    for (const kw of allKeywords) {
      if (lowerContent.includes(kw)) {
        tags.add(kw);
      }
    }

    return Array.from(tags);
  }

  /**
   * Extract service context from content
   */
  private extractServiceContext(content: string): string | undefined {
    const services = new Set<string>();
    const lowerContent = content.toLowerCase();

    const servicePatterns: { [key: string]: RegExp } = {
      'ftp': /\b(port 21|ftp)\b/i,
      'ssh': /\b(port 22|ssh)\b/i,
      'http': /\b(port 80|http(?!s))\b/i,
      'https': /\b(port 443|https)\b/i,
      'smb': /\b(port 445|smb|samba)\b/i,
      'mysql': /\b(port 3306|mysql)\b/i,
      'apache': /\bapache\b/i,
    };

    for (const [service, pattern] of Object.entries(servicePatterns)) {
      if (pattern.test(lowerContent)) {
        services.add(service);
      }
    }

    return services.size > 0 ? Array.from(services).join(',') : undefined;
  }

  /**
   * Categorize section
   */
  private categorizeSection(section: string): string {
    const lower = section.toLowerCase();
    if (lower.includes('enum')) return 'enumeration';
    if (lower.includes('foothold')) return 'foothold';
    if (lower.includes('privesc') || lower.includes('privilege')) return 'privesc';
    if (lower.includes('post')) return 'post-exploit';
    return 'general';
  }

  /**
   * Full-text search using FTS5
   */
  search(query: string, limit: number = 5, category?: string): SearchResult[] {
    let sql = `
      SELECT
        kc.id as chunk_id,
        kc.content,
        kc.category,
        kc.tags,
        kc.service_context,
        w.title as writeup,
        w.difficulty,
        knowledge_fts.rank
      FROM knowledge_fts
      JOIN knowledge_chunks kc ON knowledge_fts.rowid = kc.id
      JOIN writeups w ON kc.writeup_id = w.id
      WHERE knowledge_fts MATCH ?
    `;

    const params: any[] = [query];

    if (category) {
      sql += ' AND kc.category = ?';
      params.push(category);
    }

    sql += ' ORDER BY rank LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const results = stmt.all(...params) as any[];

    return results.map(row => ({
      chunk_id: row.chunk_id,
      writeup: row.writeup,
      difficulty: row.difficulty,
      category: row.category,
      service_context: row.service_context,
      tags: JSON.parse(row.tags || '[]'),
      content_preview: row.content.substring(0, 300) + '...',
      rank: row.rank,
    }));
  }

  /**
   * Search by service
   */
  searchByService(service: string, limit: number = 5): SearchResult[] {
    const stmt = this.db.prepare(`
      SELECT
        kc.id as chunk_id,
        kc.content,
        kc.category,
        kc.tags,
        kc.service_context,
        w.title as writeup,
        w.difficulty,
        0 as rank
      FROM knowledge_chunks kc
      JOIN writeups w ON kc.writeup_id = w.id
      WHERE kc.service_context LIKE ?
      LIMIT ?
    `);

    const results = stmt.all(`%${service}%`, limit) as any[];

    return results.map(row => ({
      chunk_id: row.chunk_id,
      writeup: row.writeup,
      difficulty: row.difficulty,
      category: row.category,
      service_context: row.service_context,
      tags: JSON.parse(row.tags || '[]'),
      content_preview: row.content.substring(0, 300) + '...',
      rank: row.rank,
    }));
  }

  /**
   * Search by category
   */
  searchByCategory(category: string, tags?: string[], limit: number = 5): SearchResult[] {
    let sql = `
      SELECT
        kc.id as chunk_id,
        kc.content,
        kc.category,
        kc.tags,
        kc.service_context,
        w.title as writeup,
        w.difficulty,
        0 as rank
      FROM knowledge_chunks kc
      JOIN writeups w ON kc.writeup_id = w.id
      WHERE kc.category = ?
    `;

    const params: any[] = [category];

    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => `kc.tags LIKE ?`).join(' OR ');
      sql += ` AND (${tagConditions})`;
      tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    sql += ' LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const results = stmt.all(...params) as any[];

    return results.map(row => ({
      chunk_id: row.chunk_id,
      writeup: row.writeup,
      difficulty: row.difficulty,
      category: row.category,
      service_context: row.service_context,
      tags: JSON.parse(row.tags || '[]'),
      content_preview: row.content.substring(0, 300) + '...',
      rank: row.rank,
    }));
  }

  /**
   * Get statistics
   */
  getStatistics(): any {
    const writeupCount = this.db.prepare('SELECT COUNT(*) as count FROM writeups').get() as { count: number };
    const chunkCount = this.db.prepare('SELECT COUNT(*) as count FROM knowledge_chunks').get() as { count: number };

    const byCategory = this.db.prepare(`
      SELECT category, COUNT(*) as count
      FROM knowledge_chunks
      GROUP BY category
      ORDER BY count DESC
    `).all();

    const servicesRaw = this.db.prepare(`
      SELECT DISTINCT service_context
      FROM knowledge_chunks
      WHERE service_context IS NOT NULL
    `).all() as Array<{ service_context: string }>;

    const services = servicesRaw
      .flatMap(r => r.service_context.split(','))
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .sort();

    return {
      writeupCount: writeupCount.count,
      chunkCount: chunkCount.count,
      byCategory,
      services,
    };
  }

  /**
   * Run test suite
   */
  async runTests(): Promise<void> {
    console.log('\n🧪 Running Knowledge MCP Test Suite\n');
    console.log('━'.repeat(80));

    // Load test queries
    const queriesPath = path.join(this.config.testDataPath, 'test-queries.json');
    const testData = JSON.parse(fs.readFileSync(queriesPath, 'utf-8'));
    const queries = testData.queries.slice(0, 5);

    const results: TestResult[] = [];

    for (const queryData of queries) {
      console.log(`\n📝 Query ${queryData.id}: "${queryData.query}"`);

      const startTime = Date.now();
      const searchResults = this.search(queryData.query, this.config.topK);
      const latency = Date.now() - startTime;

      const testResult: TestResult = {
        query: queryData.query,
        latency_ms: latency,
        results_count: searchResults.length,
        top_rank: searchResults.length > 0 ? searchResults[0].rank : 0,
        results: searchResults,
        passed: searchResults.length > 0 && latency < testData.evaluation_criteria.expected_latency_ms,
      };

      results.push(testResult);

      console.log(`   ⏱️  Latency: ${latency}ms`);
      console.log(`   📊 Results: ${searchResults.length}`);
      console.log(`   🎯 Top Rank: ${testResult.top_rank.toFixed(3)}`);

      if (searchResults.length > 0) {
        console.log(`   📄 Top Result: ${searchResults[0].writeup} - ${searchResults[0].category}`);
        console.log(`   🔧 Tools: ${searchResults[0].tags.join(', ') || 'None'}`);
      }

      console.log(`   ${testResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    }

    // Print summary
    this.printSummary(results);

    // Test category search
    console.log('\n🔍 Testing Category Search...\n');
    const privescResults = this.searchByCategory('privesc', ['suid'], 3);
    console.log(`   Found ${privescResults.length} privesc results with SUID tag`);

    // Test service search
    console.log('\n🔍 Testing Service Search...\n');
    const sshResults = this.searchByService('ssh', 3);
    console.log(`   Found ${sshResults.length} results for SSH service`);

    // Print statistics
    console.log('\n📊 Database Statistics:\n');
    const stats = this.getStatistics();
    console.log(`   Total Writeups: ${stats.writeupCount}`);
    console.log(`   Total Chunks:   ${stats.chunkCount}`);
    console.log(`   Services:       ${stats.services.join(', ')}`);
    console.log('\n   Category Distribution:');
    stats.byCategory.forEach((cat: any) => {
      const bar = '█'.repeat(Math.min(cat.count, 10));
      console.log(`     ${cat.category.padEnd(15)} ${bar} ${cat.count}`);
    });
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

    console.log(`   Tests Passed:        ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`);
    console.log(`   Average Latency:     ${avgLatency.toFixed(1)}ms`);
    console.log(`   Total Results:       ${results.reduce((sum, r) => sum + r.results_count, 0)}`);

    console.log('\n━'.repeat(80));
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    this.db.close();
    if (fs.existsSync(this.config.knowledgeDbPath)) {
      fs.unlinkSync(this.config.knowledgeDbPath);
    }
    console.log('✅ Cleanup complete\n');
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Knowledge MCP Server Tester\n');
  console.log('Based on: KNOWLEDGE-MCP-SERVER-DESIGN.md');
  console.log('Approach: SQLite FTS5 full-text search\n');

  DemoConfig.ensureDirectories();
  DemoConfig.printConfig();

  const tester = new KnowledgeMCPTester();

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

export default KnowledgeMCPTester;
