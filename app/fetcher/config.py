from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    fetch_coordinator_interval: int = 60  # seconds
    embedding_coordinator_interval: int = 300  # seconds (5 minutes)
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
