from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..models.job_round import RoundType


class JobRoundCreate(BaseModel):
    round_number: Optional[int] = None
    name: str
    round_type: RoundType
    description: Optional[str] = None
    test_url: Optional[str] = None
    meeting_url: Optional[str] = None
    venue: Optional[str] = None
    access_code: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class JobRoundsBatchCreate(BaseModel):
    rounds: List[JobRoundCreate]


class JobRoundLogisticsUpdate(BaseModel):
    name: Optional[str] = None
    round_type: Optional[RoundType] = None
    description: Optional[str] = None
    test_url: Optional[str] = None
    meeting_url: Optional[str] = None
    venue: Optional[str] = None
    access_code: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class CandidateSlotAssignment(BaseModel):
    application_id: int
    scheduled_slot: datetime


class RoundShortlistRequest(BaseModel):
    shortlisted_application_ids: List[int]
    candidate_slots: Optional[List[CandidateSlotAssignment]] = None
    next_round_logistics: Optional[JobRoundLogisticsUpdate] = None


class JobRoundResponse(BaseModel):
    id: int
    job_id: int
    round_number: int
    name: str
    round_type: str
    description: Optional[str] = None
    test_url: Optional[str] = None
    meeting_url: Optional[str] = None
    venue: Optional[str] = None
    access_code: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    candidate_count: Optional[int] = 0

    class Config:
        from_attributes = True
