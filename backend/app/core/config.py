"""
Core configuration module
Loads settings from environment variables
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """
    
    # Pydantic v2 configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"  # Ignore extra fields from environment
    )
    
    # Application
    APP_NAME: str = "Drone Mission Control API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS - Add your Netlify domain here after deployment
    CORS_ORIGINS: List[str] = [
        # Local development
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        # Production - Netlify (update with your actual domain)
        # "https://your-app.netlify.app",
        # "https://deploy-preview-*.netlify.app",  # For preview deployments
        # "https://*.netlify.app",  # All Netlify subdomains
    ]
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: List[str] = ["*"]
    CORS_HEADERS: List[str] = ["*"]

    # Simulation
    SIMULATION_UPDATE_RATE: int = 60  # Hz
    SIMULATION_BROADCAST_RATE: int = 10  # Hz
    DEFAULT_DRONE_SPEED: float = 15.0  # m/s
    
    # Logging
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    This ensures settings are loaded only once
    """
    return Settings()


# Convenience accessor
settings = get_settings()
