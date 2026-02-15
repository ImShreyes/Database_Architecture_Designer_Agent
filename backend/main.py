from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from models import GenerateSchemaRequest, GenerateSchemaResponse
from ai_service import ai_service

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0", "ai_provider": "openai" if ai_service.client else "mock"}

@app.post("/api/generate-schema", response_model=GenerateSchemaResponse)
async def generate_schema(request: GenerateSchemaRequest):
    try:
        # Generate schema using the AI Service (Real or Mock)
        generated_schema = ai_service.generate_schema(
            prompt=request.prompt, 
            dialect=request.dialect,
            additional_context=request.additionalContext
        )

        return GenerateSchemaResponse(schema=generated_schema, success=True)

    except Exception as e:
        print(f"Error generating schema: {e}")
        return GenerateSchemaResponse(success=False, error=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
