"""
Health check models
"""

from pydantic import BaseModel
from typing import Optional


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    database: Optional[str] = None
