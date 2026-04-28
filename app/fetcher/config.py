from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    fetch_coordinator_interval: int = 60  # seconds
    embedding_coordinator_interval: int = 300  # seconds (5 minutes)
    tag_extraction_coordinator_interval: int = 300  # seconds (5 minutes)
    ner_coordinator_interval: int = 300  # seconds (5 minutes)
    profile_coordinator_interval: int = 3600  # seconds (1 hour)
    og_image_backfill_interval: int = 300  # seconds (5 minutes)
    log_level: str = "INFO"

    # Model names
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    ner_ckip_model: str = "albert-base"  # used for both NER chunker and word segmenter
    ner_spacy_model: str = "en_core_web_sm"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
