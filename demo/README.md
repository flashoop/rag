# RAG System Demo & Testing Suite

Comprehensive testing and comparison suite for two RAG (Retrieval-Augmented Generation) implementations designed for bug bounty documentation and penetration testing knowledge bases.

## Overview

This demo implements and compares two approaches:

### 1. **Qdrant RAG** (Vector-Based Semantic Search)
- **Based on**: [RAG_IMPLEMENTATION_GUIDE.md](../RAG_IMPLEMENTATION_GUIDE.md)
- **Technology**: Qdrant vector database + OpenAI embeddings
- **Best for**: Semantic understanding, conceptual queries, multi-language support
- **Cost**: ~$0.05/month for typical workload (OpenAI API)

### 2. **Knowledge MCP Server** (Full-Text Search)
- **Based on**: [KNOWLEDGE-MCP-SERVER-DESIGN.md](../KNOWLEDGE-MCP-SERVER-DESIGN.md)
- **Technology**: SQLite FTS5 (Full-Text Search 5)
- **Best for**: Keyword-based queries, ultra-low latency, zero API cost
- **Cost**: Free (no external dependencies)

## Quick Start

### Prerequisites

- **Node.js** 18+ (with npm)
- **OpenAI API Key** (only required for Qdrant tests)
  - Get yours at: https://platform.openai.com/api-keys
  - Estimated cost: $0.01-0.05 for full test suite

### Installation

```bash
# Navigate to demo directory
cd demo

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
nano .env  # or use any text editor
```

Edit `.env`:
```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Running Tests

#### Test Individual Approaches

```bash
# Test Qdrant RAG (requires OpenAI API key)
npm run test:qdrant

# Test Knowledge MCP Server (no API key needed)
npm run test:knowledge

# Compare both approaches side-by-side
npm run test:comparison
```

#### Run All Tests

```bash
npm run test:all
```

## What Gets Tested

### Test Coverage

Each test suite evaluates:

| Metric | Description | Target |
|--------|-------------|--------|
| **Query Latency** | Time to retrieve results | <100ms (p90) |
| **Search Accuracy** | Relevance of top results | >80% tag match |
| **Storage Size** | Disk space usage | <10MB for 50 writeups |
| **Setup Time** | Initial indexing duration | <30s for 10 writeups |
| **Results Quality** | Number of relevant results | 3-5 per query |

### Sample Test Queries

The test suite includes 15 realistic queries:

1. **Service Enumeration**: "How to enumerate LDAP users?"
2. **Tool Usage**: "What are the nmap commands for port scanning?"
3. **Multi-language**: "如何使用mimikatz提取密码?" (Chinese)
4. **Vulnerability Patterns**: "Show me SQL injection examples"
5. **Attack Techniques**: "Explain Kerberoasting attack"
6. **Privilege Escalation**: "Windows privilege escalation with SUID binaries"
7. **Post-Exploitation**: "Port forwarding commands for pivoting"

## Understanding the Results

### Sample Output

```
🧪 Running Qdrant RAG Test Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Query 1: "How to enumerate LDAP users?"
   ⏱️  Latency: 127ms
   📊 Results: 3
   🎯 Top Score: 0.842
   📄 Top Result: Enumeration
   🔧 Tools: nmap, ldapsearch
   ✅ PASSED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TEST SUMMARY

   Tests Passed:        5/5 (100.0%)
   Average Latency:     98.2ms
   Average Top Score:   0.781
   Total Results:       17
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Comparison Output

The comparison test produces a detailed analysis:

```
⚔️  RAG Approach Comparison

📊 COMPARISON SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️  Latency Comparison:

  Metric           Qdrant RAG    Knowledge MCP    Winner
  ─────────────────────────────────────────────────────────
  Avg Latency      98.2ms        12.4ms           🏆 Knowledge
  Min Latency      75ms          8ms              🏆 Knowledge
  Max Latency      142ms         18ms             🏆 Knowledge
  P90 Latency      125.0ms       16.0ms           🏆 Knowledge

💾 Storage Comparison:

  Storage Size     2.45 KB       1.82 KB          🏆 Knowledge

🏆 Query-by-Query Winners:

  Qdrant wins:     2/10 queries
  Knowledge wins:  7/10 queries
  Ties:            1/10 queries
```

## Detailed Test Descriptions

### 1. Qdrant RAG Test (`test-qdrant-rag.ts`)

**What it does:**
- Creates Qdrant vector collection
- Generates embeddings using OpenAI `text-embedding-3-small`
- Indexes sample bug bounty writeup
- Tests 10 realistic queries
- Measures latency and relevance scores

**Key Features Tested:**
- ✅ Semantic search (understands "privilege escalation" ≈ "privesc")
- ✅ Multi-language support (English + Chinese)
- ✅ Cosine similarity ranking
- ✅ Metadata filtering
- ✅ Chunk context preservation

**Expected Results:**
- Latency: 80-150ms (includes OpenAI API call)
- Top Score: 0.7-0.9 (cosine similarity)
- Results: 3-5 per query

### 2. Knowledge MCP Test (`test-knowledge-mcp.ts`)

**What it does:**
- Creates SQLite database with FTS5 index
- Chunks writeup by sections
- Extracts 50+ security keywords
- Tests full-text search with BM25 ranking
- Tests category and service filtering

**Key Features Tested:**
- ✅ Full-text search (FTS5 with Porter stemming)
- ✅ Category-based filtering (enumeration, foothold, privesc)
- ✅ Service-specific queries (e.g., "gunicorn", "java rmi")
- ✅ Tag-based filtering (50+ security keywords)
- ✅ Sub-10ms query latency

**Expected Results:**
- Latency: 5-20ms (pure SQLite, no API calls)
- Rank: BM25 score (varies by query)
- Results: 3-5 per query

### 3. Comparison Test (`test-comparison.ts`)

**What it does:**
- Runs both approaches on identical queries
- Compares latency, storage, and result quality
- Provides winner analysis for each metric
- Offers recommendations based on use case

**Comparison Metrics:**
- ⏱️ Latency (avg, min, max, p90)
- 📊 Result count and quality
- 💾 Storage efficiency
- ⚡ Setup time
- 🏆 Query-by-query winners

## Project Structure

```
demo/
├── config.ts                  # Shared configuration
├── test-qdrant-rag.ts        # Qdrant vector search tests
├── test-knowledge-mcp.ts     # SQLite FTS5 tests
├── test-comparison.ts        # Side-by-side comparison
├── test_data/
│   ├── sample-writeup.md     # Example HTB writeup
│   └── test-queries.json     # 15 test queries
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── .env.example              # Environment template
└── README.md                 # This file

# Generated during tests:
qdrant_storage/               # Qdrant vector database
data/
└── knowledge.db              # SQLite database
```

## Configuration Options

Edit `config.ts` to customize:

```typescript
// Embedding Settings
embeddingModel: 'text-embedding-3-small'
embeddingDimensions: 1536

// Chunking Settings
chunkSize: 600      // tokens
chunkOverlap: 100   // tokens

// Retrieval Settings
topK: 5
minSimilarityScore: 0.65

// Database Paths
vectorDbPath: './qdrant_storage'
knowledgeDbPath: './data/knowledge.db'
```

## Sample Test Data

### Included Sample Writeup

The demo includes a complete synthetic writeup: `test_data/sample-writeup.md`

**Content:**
- **Title**: HTB: Example Machine
- **Difficulty**: Easy
- **Sections**: Synopsis, Enumeration, Foothold, Privilege Escalation
- **Techniques**: SQL Injection, SUID exploitation
- **Tools**: nmap, sqlmap, linpeas, msfvenom
- **Services**: SSH, HTTP, MySQL

### Test Queries

15 queries covering:
- **Enumeration** (4 queries)
- **Foothold** (4 queries)
- **Privilege Escalation** (3 queries)
- **Lateral Movement** (2 queries)
- **Post-Exploitation** (2 queries)

## Interpreting Results

### When to Use Qdrant RAG

✅ **Use Qdrant if:**
- Queries are conceptual ("How to escalate privileges?")
- Multi-language support needed (English + Chinese + others)
- Dataset will grow to 100K+ documents
- Budget allows ~$0.05/month API cost
- Semantic understanding is critical

**Example Queries:**
- "Show me privilege escalation techniques" (finds: suid, sudo, capabilities)
- "Web application vulnerabilities" (finds: sqli, xss, idor)
- "如何提权?" (finds: privilege escalation content)

### When to Use Knowledge MCP Server

✅ **Use Knowledge MCP if:**
- Queries are keyword-based ("nmap", "sql injection")
- Ultra-low latency required (<10ms)
- Zero API cost needed (offline operation)
- Dataset is small-to-medium (<50K documents)
- Exact term matching preferred

**Example Queries:**
- "nmap service detection" (finds: exact nmap references)
- "SUID binary exploitation" (finds: exact SUID techniques)
- Service lookups: "gunicorn vulnerability" (finds: Gunicorn-specific content)

### Performance Expectations

| Metric | Qdrant RAG | Knowledge MCP | Winner |
|--------|------------|---------------|--------|
| **Latency (p90)** | 80-150ms | 5-20ms | 🏆 Knowledge |
| **Semantic Understanding** | Excellent | Good | 🏆 Qdrant |
| **Exact Matching** | Good | Excellent | 🏆 Knowledge |
| **Storage (1K docs)** | ~50MB | ~5MB | 🏆 Knowledge |
| **API Cost** | $0.05/month | $0 | 🏆 Knowledge |
| **Scalability** | 100K+ docs | <50K docs | 🏆 Qdrant |

## Troubleshooting

### Common Issues

#### 1. OpenAI API Key Error

```
⚠️  Warning: OPENAI_API_KEY not set in environment
```

**Solution:**
```bash
# Edit .env file
nano .env

# Add your API key
OPENAI_API_KEY=sk-your-key-here
```

#### 2. Qdrant Storage Issues

```
Error: Cannot create collection
```

**Solution:**
```bash
# Clean up existing storage
npm run clean

# Re-run tests
npm run test:qdrant
```

#### 3. SQLite Database Locked

```
Error: database is locked
```

**Solution:**
```bash
# Stop any running processes
pkill -f "test-knowledge-mcp"

# Delete database and retry
rm -rf data/knowledge.db
npm run test:knowledge
```

#### 4. Module Not Found Errors

```
Cannot find module '@qdrant/js-client-rest'
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Extending the Demo

### Adding Your Own Writeups

1. Create markdown file in `test_data/`:

```markdown
# HTB: YourMachine

Prepared By: YourName
Difficulty: Medium
20th December 2025

Skills Required:
- Web enumeration
- Windows exploitation

Skills Learned:
- AS-REP roasting
- Kerberos attacks

## Enumeration
[Your content here...]

## Foothold
[Your content here...]

## Privilege Escalation
[Your content here...]
```

2. Modify indexing code to include your file:

```typescript
// In test-qdrant-rag.ts or test-knowledge-mcp.ts
const writeupPath = path.join(this.config.testDataPath, 'your-writeup.md');
```

### Adding Custom Test Queries

Edit `test_data/test-queries.json`:

```json
{
  "queries": [
    {
      "id": 16,
      "query": "Your custom query here",
      "category": "foothold",
      "expected_tools": ["tool1", "tool2"]
    }
  ]
}
```

## Performance Benchmarking

### Run Custom Benchmarks

```typescript
// Create custom-benchmark.ts
import { QdrantRAGTester } from './test-qdrant-rag';

async function benchmark() {
  const tester = new QdrantRAGTester();
  await tester.setup();

  const queries = [/* your queries */];
  const latencies: number[] = [];

  for (const query of queries) {
    const start = Date.now();
    await tester.search(query);
    latencies.push(Date.now() - start);
  }

  console.log('P50:', latencies.sort()[Math.floor(latencies.length * 0.5)]);
  console.log('P90:', latencies.sort()[Math.floor(latencies.length * 0.9)]);
  console.log('P99:', latencies.sort()[Math.floor(latencies.length * 0.99)]);
}
```

## Advanced Usage

### Hybrid Approach (Recommended)

Combine both for best results:

```typescript
// 1. Try Knowledge MCP first (fast, keyword-based)
const kwResults = knowledgeTester.search(query, 5);

// 2. If insufficient results, try Qdrant (semantic)
if (kwResults.length < 3) {
  const vectorResults = await qdrantTester.search(query, 5);
  return [...kwResults, ...vectorResults];
}

return kwResults;
```

### Custom Filtering

```typescript
// Filter by category
const privescResults = knowledgeTester.searchByCategory('privesc', ['suid', 'capabilities']);

// Filter by service
const sshResults = knowledgeTester.searchByService('ssh');

// Custom SQL query
const db = new Database('./data/knowledge.db');
const results = db.prepare(`
  SELECT * FROM knowledge_chunks
  WHERE tags LIKE '%nmap%'
  AND category = 'enumeration'
`).all();
```

## Cost Analysis

### Qdrant RAG Costs (OpenAI API)

**One-time Indexing:**
- Sample writeup (~5 chunks): ~$0.0001
- 10 writeups (~50 chunks): ~$0.001
- 100 writeups (~500 chunks): ~$0.01

**Query Costs:**
- Per query: ~$0.000001
- 1000 queries: ~$0.001
- Monthly (100 queries/day): ~$0.003

**Total Monthly:** ~$0.05 (including weekly re-indexing)

### Knowledge MCP Server Costs

**All Operations:** $0 (no external API calls)

## Resources

- [RAG Implementation Guide](../RAG_IMPLEMENTATION_GUIDE.md) - Full Qdrant approach documentation
- [Knowledge MCP Server Design](../KNOWLEDGE-MCP-SERVER-DESIGN.md) - Full SQLite FTS5 documentation
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [SQLite FTS5 Guide](https://www.sqlite.org/fts5.html)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)

## License

MIT

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the design documents
3. Open an issue with:
   - Test output
   - Environment details
   - Error messages

---

**Happy Testing! 🚀**
