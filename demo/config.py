# Demo Configuration for RAG System Testing
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class DemoConfig:
    """Configuration for RAG demo and testing"""

    # API Keys
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

    # Paths
    PROJECT_ROOT = Path(__file__).parent.parent
    RAW_DATA_PATH = PROJECT_ROOT / "data" / "raw"
    VECTOR_DB_PATH = PROJECT_ROOT / "qdrant_storage"
    CHROMA_DB_PATH = PROJECT_ROOT / "chroma_storage"
    KNOWLEDGE_DB_PATH = PROJECT_ROOT / "data" / "knowledge.db"
    TEST_DATA_PATH = PROJECT_ROOT / "demo" / "test_data"

    # Embedding Settings
    EMBEDDING_MODEL = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS = 1536

    # Chunking Settings
    CHUNK_SIZE = 600  # tokens
    CHUNK_OVERLAP = 100  # tokens

    # Vector DB Settings (Qdrant)
    COLLECTION_NAME = "bug_bounty_docs"
    DISTANCE_METRIC = "cosine"

    # ChromaDB Settings
    CHROMA_COLLECTION_NAME = "bug_bounty_docs_chroma"

    # Retrieval Settings
    TOP_K = 5
    MIN_SIMILARITY_SCORE = 0.65
    USE_RERANKER = False  # Set to True to enable re-ranking
    RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # Knowledge MCP Server Settings
    KNOWLEDGE_SERVER_HOST = "localhost"
    KNOWLEDGE_SERVER_PORT = 6333

    @classmethod
    def ensure_directories(cls):
        """Create necessary directories if they don't exist"""
        cls.RAW_DATA_PATH.mkdir(parents=True, exist_ok=True)
        cls.VECTOR_DB_PATH.mkdir(parents=True, exist_ok=True)
        cls.CHROMA_DB_PATH.mkdir(parents=True, exist_ok=True)
        cls.TEST_DATA_PATH.mkdir(parents=True, exist_ok=True)
        (cls.PROJECT_ROOT / "data").mkdir(parents=True, exist_ok=True)

    @classmethod
    def validate_config(cls) -> bool:
        """Validate configuration"""
        if not cls.OPENAI_API_KEY:
            print("⚠️  Warning: OPENAI_API_KEY not set in environment")
            return False
        return True
