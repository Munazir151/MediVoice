from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


DocumentType = Literal['prescription', 'report']
LanguageType = Literal['English', 'Hindi', 'Kannada', 'Marathi', 'Bengali', 'Tamil', 'Auto']
InteractionSeverity = Literal['LOW', 'MEDIUM', 'HIGH']
TestStatus = Literal['NORMAL', 'ABNORMAL']


class PatientInfo(BaseModel):
    name: str = ''
    age: str = ''
    gender: str = ''


class ClinicalFindingItem(BaseModel):
    title: str = ''
    explanation: str = ''


class MedicineItem(BaseModel):
    name: str = ''
    dose: str = ''
    frequency: str = ''
    purpose: str = ''
    what_it_is: str = ''
    what_it_does: str = ''


class TestValueItem(BaseModel):
    parameter: str = ''
    value: str = ''
    range: str = ''
    unit: str = ''
    explanation: str = ''
    status: TestStatus = 'NORMAL'


class InteractionItem(BaseModel):
    drug1: str = ''
    drug2: str = ''
    severity: InteractionSeverity = 'LOW'


class MedicalReportAnalysisResponse(BaseModel):
    patient_info: PatientInfo = Field(default_factory=PatientInfo)
    health_summary: str = ''
    clinical_findings: list[ClinicalFindingItem] = Field(default_factory=list)
    medicines: list[MedicineItem] = Field(default_factory=list)
    tests: list[TestValueItem] = Field(default_factory=list)
    interactions: list[InteractionItem] = Field(default_factory=list)
    summary: str = ''
    translated_summary: str = ''
