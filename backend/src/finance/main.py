from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(title="Personal Finance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/upload")
async def upload_file(
    payload: ChunkPayload, 
    idempotency_key: str = Header(...), 
    db: Session = Depends(get_db)
):
    #TODO Check for idempotency key in database(do not upload repeated data)
    #TODO Process the uploaded file data here
    return {"status": "success", "message": f"Chunk {payload.chunk_index} saved"}
