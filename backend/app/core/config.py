"""
Configuration management using Pydantic Settings.
Loads environment variables and provides typed configuration access.
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Uses Pydantic for validation and type safety.
    """

    # API Keys - Anthropic/OpenAI are optional since users provide via frontend
    anthropic_api_key: Optional[str] = Field(default=None, description="Anthropic API key for Claude (optional - users provide via frontend)")
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key for embeddings")
    pinecone_api_key: str = Field(..., description="Pinecone API key")

    # Pinecone Configuration
    pinecone_environment: str = Field(
        default="us-west1-gcp", description="Pinecone environment"
    )
    pinecone_index_name: str = Field(
        default="morpheus", description="Pinecone index name"
    )
    pinecone_dimension: int = Field(default=1536, description="Embedding dimension")

    # Model Configuration
    anthropic_model: str = Field(
        default="claude-3-5-sonnet-20241022", description="Claude model to use"
    )
    embedding_model: str = Field(
        default="text-embedding-3-large", description="OpenAI embedding model"
    )

    # RAG Configuration
    max_chunk_size: int = Field(default=1000, description="Maximum chunk size")
    chunk_overlap: int = Field(default=200, description="Chunk overlap")
    top_k_results: int = Field(default=10, description="Top K results to retrieve")
    min_relevance_score: float = Field(
        default=0.3, description="Minimum relevance score"
    )

    # Document Processing
    supported_file_types: str = Field(
        default="pdf,txt,md,docx", description="Comma-separated supported file types"
    )
    max_file_size_mb: int = Field(
        default=50, description="Maximum file size in MB"
    )

    # API Configuration
    api_host: str = Field(default="0.0.0.0", description="API host")
    api_port: int = Field(default=8000, description="API port")
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        description="Allowed CORS origins",
    )

    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    log_file: str = Field(default="logs/app.log", description="Log file path")

    # Optional Development Settings
    debug: bool = Field(default=False, description="Debug mode")
    reload: bool = Field(default=False, description="Auto-reload on code changes")

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def supported_file_types_list(self) -> List[str]:
        """Parse supported file types string into list."""
        return [ft.strip().lower() for ft in self.supported_file_types.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to ensure settings are loaded only once.

    Returns:
        Settings: Application settings
    """
    return Settings()


# Convenience export
settings = get_settings()
