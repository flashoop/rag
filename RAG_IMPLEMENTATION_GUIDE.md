# RAG System & Vector Database Implementation Guide for Bug Bounty Documentation

## 1. Project Overview & Analysis

### Project Characteristics
- **Content Type**: Technical security documentation (penetration testing, bug bounty automation, command references)
- **Total Files**: 7 markdown files + 3-4 shell/Python scripts
- **Total Size**: ~268KB (approximately 120KB of text content)
- **Word Count**: ~9,500 words across all markdown files
- **Content Nature**:
  - Mixed language content (English and Chinese)
  - Heavy use of code blocks (bash, PowerShell, Python)
  - Command-line references with specific syntax
  - Security tool documentation (naabu, httpx, nuclei, mimikatz, etc.)
  - Procedural knowledge (enumeration workflows, privilege escalation techniques)

### Key Design Implications
- **Small-to-medium scale**: Vector database should be lightweight and embeddable
- **Technical queries**: Embeddings must handle technical terminology, tool names, and command syntax
- **Code-heavy content**: Chunking must preserve code block integrity
- **Multi-language**: Embedding model should support both English and Chinese
- **Frequent updates**: System should support easy re-indexing for evolving documentation

---

## 2. Data Preparation Strategy

### File Parsing and Cleaning

**Recommended Tools:**
- `python-markdown` (v3.5+) for markdown parsing
- `mistune` (v3.0+) as alternative markdown parser
- `beautifulsoup4` (v4.12+) for HTML cleanup if needed

**Implementation Steps:**

```python
import re
import mistune
from pathlib import Path

def preprocess_markdown(file_path):
    """
    Parse and clean markdown file while preserving structure
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove image references but keep alt text
    content = re.sub(r'!\[\[([^\]]+)\]\]', r'\1', content)
    content = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', r'\1', content)

    # Normalize whitespace but preserve code blocks
    lines = content.split('\n')
    cleaned_lines = []
    in_code_block = False

    for line in lines:
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            cleaned_lines.append(line)
        elif in_code_block:
            cleaned_lines.append(line)  # Preserve exact formatting
        else:
            cleaned_lines.append(line.strip())

    return '\n'.join(cleaned_lines)
```

### Metadata Extraction

**Key Metadata Fields:**
- `file_name`: Source file name
- `file_path`: Relative path from repository root
- `section_heading`: Markdown heading hierarchy
- `content_type`: One of ["command", "tutorial", "reference", "workflow"]
- `tools_mentioned`: List of security tools mentioned (extracted via regex)
- `language`: Detected language (en, zh, mixed)
- `created_date`: File creation timestamp
- `modified_date`: Last modification timestamp

**Extraction Implementation:**

```python
import re
from datetime import datetime

def extract_metadata(file_path, content, chunk_text):
    """
    Extract metadata from markdown content
    """
    # Detect tools mentioned
    tools = set()
    tool_patterns = r'\b(naabu|httpx|nuclei|nmap|mimikatz|bloodhound|crackmapexec|kerbrute|impacket|metasploit|burp|wfuzz|ffuf)\b'
    tools.update(re.findall(tool_patterns, chunk_text.lower()))

    # Detect language
    has_chinese = bool(re.search(r'[\u4e00-\u9fff]', chunk_text))
    has_english = bool(re.search(r'[a-zA-Z]', chunk_text))
    language = "mixed" if (has_chinese and has_english) else ("zh" if has_chinese else "en")

    # Extract section heading from chunk
    heading_match = re.search(r'^#{1,6}\s+(.+)$', chunk_text, re.MULTILINE)
    section = heading_match.group(1) if heading_match else "No heading"

    # Get file stats
    file_stat = Path(file_path).stat()

    return {
        "file_name": Path(file_path).name,
        "file_path": str(file_path),
        "section_heading": section,
        "tools_mentioned": list(tools),
        "language": language,
        "created_date": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
        "modified_date": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
        "content_length": len(chunk_text)
    }
```

### Content Normalization

**Normalization Steps:**
1. Convert all line endings to Unix style (`\n`)
2. Remove excessive blank lines (more than 2 consecutive)
3. Normalize markdown syntax (consistent header styles)
4. Preserve code block markers and language identifiers
5. Keep command-line prompt symbols (`$`, `>`, `#`) intact
6. Maintain URL structure for reference links

---

## 3. Chunking Strategy

### Recommended Approach: **Semantic Chunking with Code Block Awareness**

**Chunk Size:** 400-600 tokens (approximately 300-450 words)

**Rationale:**
- Balances context preservation with retrieval precision
- Typical command examples with explanations fit within this range
- Allows embedding models to capture semantic meaning effectively
- Prevents splitting critical code blocks or multi-step procedures

### Chunking Method: Hybrid Recursive + Semantic

**Implementation:**

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
import tiktoken

def create_semantic_chunks(markdown_content, file_path):
    """
    Create semantically aware chunks that preserve code blocks
    and command sequences
    """
    # Initialize tokenizer
    encoding = tiktoken.get_encoding("cl100k_base")

    # Custom separator hierarchy for security documentation
    separators = [
        "\n## ",      # Major sections
        "\n### ",     # Subsections
        "\n#### ",    # Sub-subsections
        "\n\n```",    # Code block starts
        "\n```\n",    # Code block ends
        "\n\n",       # Paragraph breaks
        "\n",         # Line breaks
        ". ",         # Sentences
        " "           # Words (last resort)
    ]

    # Create splitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,           # Token-based target
        chunk_overlap=100,        # Preserve context across chunks
        length_function=lambda x: len(encoding.encode(x)),
        separators=separators,
        keep_separator=True
    )

    # Extract and protect code blocks
    code_blocks = []
    protected_content = markdown_content

    # Find all code blocks
    code_pattern = r'```[\w]*\n(.*?)```'
    for match in re.finditer(code_pattern, markdown_content, re.DOTALL):
        code_blocks.append(match.group(0))
        # Replace with placeholder if code block is too long
        if len(encoding.encode(match.group(0))) > 500:
            protected_content = protected_content.replace(
                match.group(0),
                f"[CODE_BLOCK_{len(code_blocks)-1}]"
            )

    # Split content
    chunks = splitter.split_text(protected_content)

    # Restore code blocks
    final_chunks = []
    for chunk in chunks:
        for i, code_block in enumerate(code_blocks):
            chunk = chunk.replace(f"[CODE_BLOCK_{i}]", code_block)
        final_chunks.append(chunk)

    return final_chunks
```

### Overlap Strategy

**Overlap Size:** 100 tokens (approximately 75 words)

**Purpose:**
- Maintains continuity for queries that span chunk boundaries
- Ensures related commands in a sequence aren't isolated
- Preserves context for multi-step procedures

**Example Overlap Scenario:**
```
Chunk 1: "...Step 3: Run nmap scan\n```bash\nnmap -sV target.com\n```\n\n## Port 80 Enumeration"
                                                                              ↓ OVERLAP ↓
Chunk 2: "## Port 80 Enumeration\n\nAfter discovering open ports, use httpx to probe..."
```

### Handling Special Elements

**Code Blocks:**
- **Never split code blocks** - treat as atomic units
- If code block exceeds chunk size, create dedicated chunk containing only that code block plus minimal context (heading + 2 lines before/after)

**Tables:**
- Keep tables intact within single chunks
- If table is too large, split by rows but maintain header row in each chunk

**Lists:**
- Keep related list items together (e.g., all sub-items under a bullet point)
- Split long lists at top-level items only

**URLs and References:**
- Preserve complete URLs in chunks
- Keep reference-style links with their definitions

---

## 4. Embedding Model Selection

### Primary Recommendation: **text-embedding-3-small (OpenAI)**

**Specifications:**
- Dimensions: 1536 (default) or configurable down to 512
- Context window: 8191 tokens
- Cost: $0.02 per 1M tokens
- Performance: 62.3% on MTEB benchmark

**Justification:**
1. **Excellent for technical content** - trained on diverse code and documentation
2. **Multi-language support** - handles English and Chinese effectively
3. **Cost-effective** - ~120KB content = ~$0.003 for initial embedding
4. **Proven performance** - widely used for technical RAG systems
5. **Adjustable dimensions** - can reduce to 512 for faster inference if needed

**Usage Example:**

```python
from openai import OpenAI

client = OpenAI(api_key="your-api-key")

def embed_chunks(chunks, model="text-embedding-3-small", dimensions=1536):
    """
    Embed chunks using OpenAI's embedding model
    """
    embeddings = []

    # Batch embed for efficiency (max 2048 texts per request)
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i+batch_size]

        response = client.embeddings.create(
            input=batch,
            model=model,
            dimensions=dimensions  # Optional: reduce for faster search
        )

        embeddings.extend([item.embedding for item in response.data])

    return embeddings
```

### Alternative Option: **multilingual-e5-large (Open Source)**

**Specifications:**
- Dimensions: 1024
- Model size: 2.24 GB
- License: MIT (fully open source)
- MTEB score: ~64.5%

**Use When:**
- No API costs desired (fully local)
- Privacy concerns with cloud APIs
- Self-hosted deployment required

**Usage Example:**

```python
from sentence_transformers import SentenceTransformer

# Load model locally
model = SentenceTransformer('intfloat/multilingual-e5-large')

def embed_chunks_local(chunks):
    """
    Embed chunks using local multilingual model
    """
    # Prefix queries with "query: " and documents with "passage: "
    passages = [f"passage: {chunk}" for chunk in chunks]
    embeddings = model.encode(passages, normalize_embeddings=True)
    return embeddings
```

### Alternative for Chinese-Heavy Content: **bge-large-zh-v1.5**

**Specifications:**
- Dimensions: 1024
- Optimized for Chinese text
- MTEB Chinese score: 66.5%

**Use When:**
- Content is >70% Chinese
- Queries will primarily be in Chinese

---

## 5. Vector Database Selection

### Primary Recommendation: **Qdrant**

**Specifications:**
- Type: Open-source vector database
- Storage: Disk-based with memory-mapped files
- Indexing: HNSW (Hierarchical Navigable Small World)
- Filtering: Rich metadata filtering support
- Deployment: Can run locally or cloud-hosted

**Pros:**
- ✅ Perfect scale for this project (handles 10K-10M vectors efficiently)
- ✅ Excellent metadata filtering (tools_mentioned, language, file_path)
- ✅ Python client is mature and well-documented
- ✅ Built-in support for payload indexing
- ✅ Can run as single Docker container or Python library
- ✅ Hybrid search (dense + sparse vectors) support
- ✅ Active development and community

**Cons:**
- ❌ Requires running a server process (unless using in-memory mode)

**Implementation Example:**

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Initialize client (local or remote)
client = QdrantClient(path="./qdrant_storage")  # Local file-based
# OR
# client = QdrantClient(host="localhost", port=6333)  # Server mode

# Create collection
client.create_collection(
    collection_name="bug_bounty_docs",
    vectors_config=VectorParams(
        size=1536,  # Match embedding dimensions
        distance=Distance.COSINE
    )
)

# Index metadata fields for fast filtering
client.create_payload_index(
    collection_name="bug_bounty_docs",
    field_name="tools_mentioned",
    field_schema="keyword"
)

client.create_payload_index(
    collection_name="bug_bounty_docs",
    field_name="language",
    field_schema="keyword"
)

# Insert chunks with embeddings
points = []
for idx, (chunk, embedding, metadata) in enumerate(zip(chunks, embeddings, metadatas)):
    points.append(PointStruct(
        id=idx,
        vector=embedding,
        payload={
            "text": chunk,
            **metadata
        }
    ))

client.upsert(
    collection_name="bug_bounty_docs",
    points=points
)
```

### Alternative Option 1: **ChromaDB**

**Specifications:**
- Type: Embedded vector database
- Storage: DuckDB + Parquet files
- Indexing: HNSW
- Deployment: Python library (no server required)

**Pros:**
- ✅ Simplest setup (pip install chromadb)
- ✅ No server management required
- ✅ Great for prototyping and development
- ✅ Built-in embedding function support

**Cons:**
- ❌ Less mature than Qdrant for production
- ❌ Limited filtering capabilities compared to Qdrant
- ❌ Single-machine only (no distributed mode)

**Use When:**
- Rapid prototyping desired
- No server infrastructure available
- Project remains single-user/single-machine

**Setup Example:**

```python
import chromadb
from chromadb.config import Settings

# Initialize client
client = chromadb.PersistentClient(path="./chroma_storage")

# Create collection
collection = client.create_collection(
    name="bug_bounty_docs",
    metadata={"hnsw:space": "cosine"}
)

# Add documents
collection.add(
    ids=[f"chunk_{i}" for i in range(len(chunks))],
    embeddings=embeddings,
    documents=chunks,
    metadatas=metadatas
)

# Query
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=5,
    where={"tools_mentioned": "nmap"}  # Metadata filtering
)
```

### Alternative Option 2: **Milvus**

**Specifications:**
- Type: Cloud-native vector database
- Storage: Object storage (S3, MinIO) + local cache
- Indexing: Multiple index types (HNSW, IVF_FLAT, DISKANN)
- Deployment: Docker, Kubernetes, or Zilliz Cloud

**Pros:**
- ✅ Best for scaling beyond 10M vectors
- ✅ Excellent performance for large datasets
- ✅ Production-grade reliability
- ✅ Rich query capabilities

**Cons:**
- ❌ Overkill for this project size
- ❌ More complex setup and management
- ❌ Higher resource requirements

**Use When:**
- Planning to scale to millions of documents
- Need distributed deployment
- Enterprise-grade requirements

---

## 6. RAG Architecture Design

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Query Interface                       │
│              (Claude Code / CLI / Web Interface)            │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     Query Processor                          │
│  • Query expansion (synonyms for tools)                     │
│  • Language detection                                        │
│  • Tool name normalization (e.g., "mimikatz" → "mimikatz.exe") │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  Embedding Generator                         │
│             (OpenAI API / Local Model)                      │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Vector Database                            │
│                  (Qdrant / ChromaDB)                        │
│  • Semantic search (cosine similarity)                      │
│  • Metadata filtering (tools, language, file)              │
│  • Top-k retrieval (k=5-10)                                │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Re-ranker (Optional)                      │
│  • Cross-encoder scoring                                    │
│  • Keyword matching boost                                   │
│  • Recency weighting                                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  Context Assembler                           │
│  • Merge overlapping chunks                                 │
│  • Format for Claude Code prompt                            │
│  • Add source citations                                     │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    LLM Response                              │
│         (Claude with retrieved context)                     │
└─────────────────────────────────────────────────────────────┘
```

### Retrieval Strategy

**Top-K Retrieval:** k=5 chunks initially, expand to k=10 if confidence is low

**Similarity Threshold:** 0.65 cosine similarity minimum (adjustable)

**Query Preprocessing:**

```python
def preprocess_query(query):
    """
    Enhance query for better retrieval
    """
    # Normalize tool names
    tool_aliases = {
        "mimikatz": ["mimikatz", "mimikatz.exe"],
        "bloodhound": ["bloodhound", "bloodhound.py", "bloodhound-python"],
        "nmap": ["nmap", "zenmap"],
        "metasploit": ["metasploit", "msf", "msfconsole", "msfvenom"]
    }

    normalized_query = query.lower()
    for canonical, aliases in tool_aliases.items():
        for alias in aliases:
            if alias in normalized_query:
                normalized_query += f" {canonical}"

    return normalized_query
```

**Retrieval Function:**

```python
def retrieve_context(query, client, collection_name, top_k=5, min_score=0.65):
    """
    Retrieve relevant chunks for query
    """
    # Preprocess and embed query
    processed_query = preprocess_query(query)
    query_embedding = embed_text(processed_query)

    # Search with optional filters
    filters = {}

    # Detect if query mentions specific tool
    if "nmap" in query.lower():
        filters["tools_mentioned"] = "nmap"

    # Search
    results = client.search(
        collection_name=collection_name,
        query_vector=query_embedding,
        limit=top_k,
        score_threshold=min_score,
        query_filter=filters if filters else None
    )

    # Extract results
    contexts = []
    for result in results:
        contexts.append({
            "text": result.payload["text"],
            "score": result.score,
            "metadata": {
                "file": result.payload["file_name"],
                "section": result.payload["section_heading"],
                "tools": result.payload["tools_mentioned"]
            }
        })

    return contexts
```

### Re-ranking Approach (Optional but Recommended)

**Method:** Cross-encoder model for more accurate relevance scoring

**Model:** `cross-encoder/ms-marco-MiniLM-L-6-v2`

**Purpose:** Refine top-10 results to best top-5

**Implementation:**

```python
from sentence_transformers import CrossEncoder

# Load re-ranker
reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

def rerank_results(query, retrieved_chunks, top_k=5):
    """
    Re-rank retrieved chunks using cross-encoder
    """
    # Create query-document pairs
    pairs = [[query, chunk["text"]] for chunk in retrieved_chunks]

    # Score pairs
    scores = reranker.predict(pairs)

    # Sort by score
    ranked_results = sorted(
        zip(retrieved_chunks, scores),
        key=lambda x: x[1],
        reverse=True
    )

    return [item[0] for item in ranked_results[:top_k]]
```

### Hybrid Search Enhancement

**Combine dense (vector) + sparse (keyword) search:**

```python
def hybrid_search(query, client, collection_name, alpha=0.7):
    """
    Hybrid search combining vector and keyword matching
    alpha: weight for vector search (1-alpha for keyword)
    """
    # Vector search
    vector_results = retrieve_context(query, client, collection_name, top_k=10)

    # Keyword search (BM25)
    keyword_results = keyword_search(query, collection_name, top_k=10)

    # Combine scores
    combined = {}
    for result in vector_results:
        key = result["text"]
        combined[key] = alpha * result["score"]

    for result in keyword_results:
        key = result["text"]
        if key in combined:
            combined[key] += (1 - alpha) * result["score"]
        else:
            combined[key] = (1 - alpha) * result["score"]

    # Sort and return top results
    sorted_results = sorted(combined.items(), key=lambda x: x[1], reverse=True)
    return sorted_results[:5]
```

---

## 7. Implementation Steps

### Phase 1: Setup and Environment Preparation (Day 1)

**Step 1.1: Install Dependencies**

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install core dependencies
pip install \
    openai==1.12.0 \
    qdrant-client==1.7.3 \
    python-dotenv==1.0.1 \
    tiktoken==0.6.0 \
    mistune==3.0.2 \
    sentence-transformers==2.3.1 \
    langchain==0.1.8

# Optional: Install ChromaDB as alternative
pip install chromadb==0.4.22
```

**Step 1.2: Project Structure**

```
bug-bounty-rag/
├── .env                          # API keys
├── requirements.txt              # Dependencies
├── data/
│   └── raw/                      # Original markdown files
├── src/
│   ├── __init__.py
│   ├── config.py                 # Configuration
│   ├── preprocessing.py          # Data cleaning & chunking
│   ├── embeddings.py             # Embedding generation
│   ├── vector_store.py           # Vector DB operations
│   ├── retrieval.py              # Search & retrieval logic
│   └── query_interface.py        # User interface
├── qdrant_storage/               # Vector DB storage
├── scripts/
│   ├── build_index.py            # One-time indexing
│   └── query_cli.py              # CLI query tool
└── tests/
    ├── test_preprocessing.py
    └── test_retrieval.py
```

**Step 1.3: Configuration File**

```python
# src/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Keys
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

    # Paths
    RAW_DATA_PATH = "data/raw"
    VECTOR_DB_PATH = "./qdrant_storage"

    # Embedding Settings
    EMBEDDING_MODEL = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS = 1536

    # Chunking Settings
    CHUNK_SIZE = 600  # tokens
    CHUNK_OVERLAP = 100  # tokens

    # Vector DB Settings
    COLLECTION_NAME = "bug_bounty_docs"
    DISTANCE_METRIC = "cosine"

    # Retrieval Settings
    TOP_K = 5
    MIN_SIMILARITY_SCORE = 0.65
    USE_RERANKER = True
    RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
```

### Phase 2: Data Ingestion Pipeline (Day 1-2)

**Step 2.1: Implement Preprocessing Module**

```python
# src/preprocessing.py
import re
import tiktoken
from pathlib import Path
from typing import List, Dict
from langchain.text_splitter import RecursiveCharacterTextSplitter

class DocumentPreprocessor:
    def __init__(self, chunk_size=600, chunk_overlap=100):
        self.encoding = tiktoken.get_encoding("cl100k_base")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def process_directory(self, data_path: str) -> List[Dict]:
        """
        Process all markdown files in directory
        """
        documents = []
        for file_path in Path(data_path).glob("**/*.md"):
            docs = self.process_file(str(file_path))
            documents.extend(docs)
        return documents

    def process_file(self, file_path: str) -> List[Dict]:
        """
        Process single markdown file into chunks with metadata
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Clean content
        cleaned_content = self.clean_markdown(content)

        # Create chunks
        chunks = self.create_chunks(cleaned_content)

        # Add metadata
        documents = []
        for idx, chunk in enumerate(chunks):
            metadata = self.extract_metadata(file_path, chunk, idx)
            documents.append({
                "text": chunk,
                "metadata": metadata
            })

        return documents

    def clean_markdown(self, content: str) -> str:
        """Clean and normalize markdown content"""
        # Remove image references
        content = re.sub(r'!\[\[([^\]]+)\]\]', r'\1', content)
        content = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', r'\1', content)

        # Normalize line breaks
        content = re.sub(r'\n{3,}', '\n\n', content)

        return content

    def create_chunks(self, content: str) -> List[str]:
        """Create semantic chunks preserving code blocks"""
        separators = [
            "\n## ", "\n### ", "\n#### ",
            "\n\n```", "\n```\n",
            "\n\n", "\n", ". ", " "
        ]

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=lambda x: len(self.encoding.encode(x)),
            separators=separators,
            keep_separator=True
        )

        return splitter.split_text(content)

    def extract_metadata(self, file_path: str, chunk: str, idx: int) -> Dict:
        """Extract metadata from chunk"""
        # Tool detection
        tool_patterns = r'\b(naabu|httpx|nuclei|nmap|mimikatz|bloodhound|crackmapexec|kerbrute|impacket)\b'
        tools = list(set(re.findall(tool_patterns, chunk.lower())))

        # Language detection
        has_chinese = bool(re.search(r'[\u4e00-\u9fff]', chunk))
        has_english = bool(re.search(r'[a-zA-Z]', chunk))
        language = "mixed" if (has_chinese and has_english) else ("zh" if has_chinese else "en")

        # Section heading
        heading_match = re.search(r'^#{1,6}\s+(.+)$', chunk, re.MULTILINE)
        section = heading_match.group(1) if heading_match else "Unknown"

        return {
            "file_name": Path(file_path).name,
            "file_path": str(file_path),
            "section_heading": section,
            "tools_mentioned": tools,
            "language": language,
            "chunk_index": idx
        }
```

**Step 2.2: Implement Embedding Module**

```python
# src/embeddings.py
from openai import OpenAI
from typing import List
import numpy as np

class EmbeddingGenerator:
    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def embed_batch(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        """
        Embed texts in batches
        """
        embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]

            response = self.client.embeddings.create(
                input=batch,
                model=self.model
            )

            batch_embeddings = [item.embedding for item in response.data]
            embeddings.extend(batch_embeddings)

        return embeddings

    def embed_single(self, text: str) -> List[float]:
        """Embed single text"""
        response = self.client.embeddings.create(
            input=[text],
            model=self.model
        )
        return response.data[0].embedding
```

**Step 2.3: Implement Vector Store Module**

```python
# src/vector_store.py
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from typing import List, Dict

class VectorStore:
    def __init__(self, path: str, collection_name: str, vector_size: int = 1536):
        self.client = QdrantClient(path=path)
        self.collection_name = collection_name
        self.vector_size = vector_size

    def create_collection(self):
        """Create collection with proper configuration"""
        self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(
                size=self.vector_size,
                distance=Distance.COSINE
            )
        )

        # Create payload indexes
        self.client.create_payload_index(
            collection_name=self.collection_name,
            field_name="tools_mentioned",
            field_schema="keyword"
        )

        self.client.create_payload_index(
            collection_name=self.collection_name,
            field_name="language",
            field_schema="keyword"
        )

    def index_documents(self, documents: List[Dict], embeddings: List[List[float]]):
        """Index documents with embeddings"""
        points = []
        for idx, (doc, embedding) in enumerate(zip(documents, embeddings)):
            points.append(PointStruct(
                id=idx,
                vector=embedding,
                payload={
                    "text": doc["text"],
                    **doc["metadata"]
                }
            ))

        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
```

### Phase 3: Indexing Process (Day 2)

**Step 3.1: Build Index Script**

```python
# scripts/build_index.py
import sys
sys.path.append('src')

from config import Config
from preprocessing import DocumentPreprocessor
from embeddings import EmbeddingGenerator
from vector_store import VectorStore

def main():
    print("Starting indexing process...")

    # Step 1: Preprocess documents
    print("Step 1: Preprocessing documents...")
    preprocessor = DocumentPreprocessor(
        chunk_size=Config.CHUNK_SIZE,
        chunk_overlap=Config.CHUNK_OVERLAP
    )
    documents = preprocessor.process_directory(Config.RAW_DATA_PATH)
    print(f"Created {len(documents)} chunks from documents")

    # Step 2: Generate embeddings
    print("Step 2: Generating embeddings...")
    embedding_gen = EmbeddingGenerator(
        api_key=Config.OPENAI_API_KEY,
        model=Config.EMBEDDING_MODEL
    )
    texts = [doc["text"] for doc in documents]
    embeddings = embedding_gen.embed_batch(texts)
    print(f"Generated {len(embeddings)} embeddings")

    # Step 3: Index in vector database
    print("Step 3: Indexing in vector database...")
    vector_store = VectorStore(
        path=Config.VECTOR_DB_PATH,
        collection_name=Config.COLLECTION_NAME,
        vector_size=Config.EMBEDDING_DIMENSIONS
    )
    vector_store.create_collection()
    vector_store.index_documents(documents, embeddings)
    print("Indexing complete!")

if __name__ == "__main__":
    main()
```

**Run Indexing:**

```bash
python scripts/build_index.py
```

### Phase 4: Query Interface Development (Day 3)

**Step 4.1: Implement Retrieval Module**

```python
# src/retrieval.py
from typing import List, Dict
from embeddings import EmbeddingGenerator
from vector_store import VectorStore

class Retriever:
    def __init__(self, vector_store: VectorStore, embedding_gen: EmbeddingGenerator):
        self.vector_store = vector_store
        self.embedding_gen = embedding_gen

    def search(self, query: str, top_k: int = 5, min_score: float = 0.65) -> List[Dict]:
        """
        Search for relevant documents
        """
        # Embed query
        query_embedding = self.embedding_gen.embed_single(query)

        # Search
        results = self.vector_store.client.search(
            collection_name=self.vector_store.collection_name,
            query_vector=query_embedding,
            limit=top_k,
            score_threshold=min_score
        )

        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "text": result.payload["text"],
                "score": result.score,
                "file": result.payload["file_name"],
                "section": result.payload["section_heading"],
                "tools": result.payload.get("tools_mentioned", [])
            })

        return formatted_results
```

**Step 4.2: Create CLI Query Tool**

```python
# scripts/query_cli.py
import sys
sys.path.append('src')

from config import Config
from embeddings import EmbeddingGenerator
from vector_store import VectorStore
from retrieval import Retriever

def main():
    # Initialize components
    embedding_gen = EmbeddingGenerator(Config.OPENAI_API_KEY, Config.EMBEDDING_MODEL)
    vector_store = VectorStore(Config.VECTOR_DB_PATH, Config.COLLECTION_NAME)
    retriever = Retriever(vector_store, embedding_gen)

    print("Bug Bounty RAG System - Query Interface")
    print("="*50)

    while True:
        query = input("\nEnter your query (or 'quit' to exit): ")

        if query.lower() == 'quit':
            break

        # Search
        results = retriever.search(query, top_k=Config.TOP_K)

        # Display results
        print(f"\nFound {len(results)} relevant results:\n")
        for idx, result in enumerate(results, 1):
            print(f"Result {idx} (Score: {result['score']:.3f})")
            print(f"File: {result['file']}")
            print(f"Section: {result['section']}")
            print(f"Tools: {', '.join(result['tools'])}")
            print(f"\nContent:\n{result['text'][:300]}...")
            print("-"*50)

if __name__ == "__main__":
    main()
```

### Phase 5: Testing and Evaluation (Day 3-4)

**Step 5.1: Create Test Queries**

```python
# tests/test_queries.py
test_queries = [
    "How to enumerate LDAP users?",
    "What are the nmap commands for port scanning?",
    "如何使用mimikatz提取密码?",  # Chinese query
    "Show me nuclei vulnerability scanning examples",
    "Explain kerberost attack",
    "What tools can I use for SMB enumeration?",
    "PowerView commands for domain enumeration",
    "How to perform AS-REP roasting?",
    "Windows privilege escalation with mimikatz",
    "Port forwarding commands for pivoting"
]
```

**Step 5.2: Evaluation Metrics**

```python
# tests/evaluate.py
def evaluate_retrieval(queries: List[str], retriever: Retriever):
    """
    Evaluate retrieval quality
    """
    results = []

    for query in queries:
        retrieved = retriever.search(query, top_k=5)

        # Calculate metrics
        avg_score = sum(r["score"] for r in retrieved) / len(retrieved) if retrieved else 0
        has_relevant = any(r["score"] > 0.75 for r in retrieved)

        results.append({
            "query": query,
            "num_results": len(retrieved),
            "avg_score": avg_score,
            "has_relevant": has_relevant
        })

    return results
```

---

## 8. Performance Optimization

### Caching Strategies

**1. Query Embedding Cache:**

```python
from functools import lru_cache
import hashlib

class CachedEmbeddingGenerator(EmbeddingGenerator):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cache = {}

    def embed_single(self, text: str) -> List[float]:
        """Embed with caching"""
        # Create cache key
        cache_key = hashlib.md5(text.encode()).hexdigest()

        if cache_key in self.cache:
            return self.cache[cache_key]

        # Generate embedding
        embedding = super().embed_single(text)
        self.cache[cache_key] = embedding

        return embedding
```

**2. Result Cache (Redis):**

```python
import redis
import json

class CachedRetriever(Retriever):
    def __init__(self, *args, redis_host='localhost', redis_port=6379, **kwargs):
        super().__init__(*args, **kwargs)
        self.redis_client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        self.cache_ttl = 3600  # 1 hour

    def search(self, query: str, **kwargs) -> List[Dict]:
        """Search with Redis caching"""
        cache_key = f"query:{hashlib.md5(query.encode()).hexdigest()}"

        # Check cache
        cached = self.redis_client.get(cache_key)
        if cached:
            return json.loads(cached)

        # Perform search
        results = super().search(query, **kwargs)

        # Cache results
        self.redis_client.setex(cache_key, self.cache_ttl, json.dumps(results))

        return results
```

### Query Optimization Techniques

**1. Query Expansion:**

```python
def expand_query(query: str) -> str:
    """
    Expand query with synonyms and related terms
    """
    expansions = {
        "scan": ["scan", "enumerate", "probe", "discover"],
        "password": ["password", "credential", "hash", "secret"],
        "privilege": ["privilege", "escalation", "privesc", "root"],
        "exploit": ["exploit", "vulnerability", "CVE", "attack"]
    }

    expanded_terms = []
    for term, synonyms in expansions.items():
        if term in query.lower():
            expanded_terms.extend(synonyms)

    return f"{query} {' '.join(expanded_terms)}"
```

**2. Parallel Search:**

```python
import asyncio

async def parallel_search(queries: List[str], retriever: Retriever):
    """Execute multiple searches in parallel"""
    tasks = [retriever.search_async(q) for q in queries]
    results = await asyncio.gather(*tasks)
    return results
```

### Monitoring and Maintenance

**1. Query Analytics:**

```python
import logging
from datetime import datetime

class AnalyticsRetriever(Retriever):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.logger = logging.getLogger("retrieval_analytics")

    def search(self, query: str, **kwargs) -> List[Dict]:
        """Search with analytics logging"""
        start_time = datetime.now()

        results = super().search(query, **kwargs)

        duration = (datetime.now() - start_time).total_seconds()

        # Log analytics
        self.logger.info({
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "num_results": len(results),
            "avg_score": sum(r["score"] for r in results) / len(results) if results else 0,
            "duration_seconds": duration
        })

        return results
```

**2. Index Health Monitoring:**

```python
def check_index_health(vector_store: VectorStore):
    """
    Check vector database health
    """
    info = vector_store.client.get_collection(vector_store.collection_name)

    print(f"Collection: {info.name}")
    print(f"Total vectors: {info.vectors_count}")
    print(f"Indexed: {info.indexed_vectors_count}")
    print(f"Status: {info.status}")
```

---

## 9. Tools and Libraries

### Core Dependencies

```txt
# requirements.txt
openai==1.12.0                      # OpenAI embeddings
qdrant-client==1.7.3                # Vector database client
python-dotenv==1.0.1                # Environment management
tiktoken==0.6.0                     # Token counting
mistune==3.0.2                      # Markdown parsing
langchain==0.1.8                    # Text splitting utilities
sentence-transformers==2.3.1        # Optional: Local embeddings & re-ranking
numpy==1.26.3                       # Numerical operations
redis==5.0.1                        # Optional: Caching

# Development/Testing
pytest==7.4.4                       # Testing
black==23.12.1                      # Code formatting
mypy==1.8.0                         # Type checking
```

### Optional Tools

```txt
# Optional: Web interface
streamlit==1.30.0                   # Simple web UI
gradio==4.15.0                      # Alternative web UI

# Optional: Advanced features
ragas==0.1.0                        # RAG evaluation metrics
llama-index==0.9.45                 # Alternative RAG framework
```

### System Requirements

**Minimum:**
- Python 3.9+
- 4 GB RAM
- 2 GB disk space

**Recommended:**
- Python 3.10+
- 8 GB RAM
- 5 GB disk space (for local models if used)

---

## 10. Estimated Resources

### Initial Indexing

**Processing Time:**
- Document preprocessing: ~2 minutes
- Embedding generation (OpenAI API): ~5-10 minutes
- Vector indexing: ~1 minute
- **Total: ~10-15 minutes**

**Storage Requirements:**
- Raw documents: ~120 KB
- Chunks (text): ~150 KB
- Embeddings (1536-dim float32): ~9 MB (for ~1500 chunks)
- Vector DB overhead: ~5 MB
- **Total: ~15 MB**

### Query Performance

**Latency Breakdown:**
- Query embedding: ~100-200ms (OpenAI API)
- Vector search: ~10-50ms (Qdrant HNSW)
- Re-ranking (optional): ~50-100ms
- **Total: ~200-350ms per query**

**With Caching:**
- Cached query embedding: <1ms
- Cached results: <5ms
- **Total: <10ms for cached queries**

### Cost Estimates (OpenAI API)

**One-time Indexing:**
- ~1500 chunks × 400 tokens avg = 600K tokens
- Cost: 600K tokens × ($0.02 / 1M tokens) = **$0.012**

**Query Cost:**
- Average query: ~50 tokens
- Cost per query: 50 × ($0.02 / 1M) = **$0.000001**
- 1000 queries: **$0.001**

**Monthly Cost Estimate (100 queries/day):**
- Queries: 3000 × $0.000001 = **$0.003**
- Re-indexing (weekly): 4 × $0.012 = **$0.048**
- **Total: ~$0.05/month**

### Scalability Projections

**10x Scale (1,200 KB documents):**
- Chunks: ~15,000
- Embeddings: ~90 MB
- Indexing time: ~30-45 minutes
- Query latency: ~50-100ms (HNSW scales logarithmically)
- Storage: ~100 MB

**100x Scale (12 MB documents):**
- Consider distributed vector database (Milvus)
- Implement chunk deduplication
- Use batch processing for indexing
- Expected query latency: ~100-200ms

---

## Final Recommendations Summary

**For your bug bounty documentation project (~120KB, technical content):**

1. **Use Qdrant** for vector storage (local file-based mode)
2. **Use text-embedding-3-small** from OpenAI (cost-effective, excellent quality)
3. **Chunk size: 600 tokens** with 100 token overlap
4. **Semantic chunking** with code block preservation
5. **Top-k=5** with optional re-ranking
6. **Implement caching** for frequent queries
7. **Budget: <$1/month** for typical usage

**Implementation Timeline:**
- Day 1: Setup + preprocessing (4 hours)
- Day 2: Indexing pipeline (4 hours)
- Day 3: Query interface (4 hours)
- Day 4: Testing + optimization (2 hours)

**Total: ~14 hours of development time**
