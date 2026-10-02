from datetime import date
from typing import Optional

from pydantic import BaseModel


class RegulatorCreate(BaseModel):
    name: str
    short_code: Optional[str] = None
    description: Optional[str] = None


class RegulatorOut(BaseModel):
    id: str
    name: str
    short_code: Optional[str]
    description: Optional[str]

    class Config:
        from_attributes = True


class JurisdictionCreate(BaseModel):
    name: str
    country_code: Optional[str] = None


class JurisdictionOut(BaseModel):
    id: str
    name: str
    country_code: Optional[str]

    class Config:
        from_attributes = True


class RegulationCreate(BaseModel):
    regulator_id: str
    jurisdiction_id: str
    title: str
    code: Optional[str] = None
    summary: Optional[str] = None


class RegulationOut(BaseModel):
    id: str
    regulator_id: str
    jurisdiction_id: str
    title: str
    code: Optional[str]
    summary: Optional[str]
    is_demo_data: bool

    class Config:
        from_attributes = True


class RegulationVersionCreate(BaseModel):
    regulation_id: str
    version_label: str
    publication_date: Optional[date] = None
    effective_date: Optional[date] = None
    is_current: bool = False


class RegulationVersionOut(BaseModel):
    id: str
    regulation_id: str
    version_label: str
    publication_date: Optional[date]
    effective_date: Optional[date]
    is_current: bool

    class Config:
        from_attributes = True
