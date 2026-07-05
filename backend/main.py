from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import data_processor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class RequestParams(BaseModel):
    region_bounds: list
    time_window: str
    acceleration_enabled: bool

@app.post("/api/backend/analyze")
def analyze(params: RequestParams):
    return data_processor.run_analysis(params.region_bounds, params.time_window, params.acceleration_enabled)
