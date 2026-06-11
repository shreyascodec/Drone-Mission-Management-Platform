"""
Logging configuration
"""

import logging
import sys
from app.core.config import settings


def setup_logging():
    """
    Configure application logging
    """
    
    # Create formatter
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    root_logger.addHandler(console_handler)
    
    # Application logger
    app_logger = logging.getLogger("app")
    app_logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    
    return app_logger


# Create logger instance
logger = setup_logging()
