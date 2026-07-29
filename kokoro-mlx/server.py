"""Local MLX-based Kokoro TTS server.

Speaks the same request/response shape as the Docker kokoro-fastapi
container's /dev/captioned_speech endpoint (see lib/audio/kokoro.ts), so the
rest of the pipeline needs zero changes to point at this instead — just set
KOKORO_BASE_URL to wherever this is running.

Word-level timestamps aren't available from mlx-audio's generate() (only a
lower-level pred_dur per phoneme, which needs the same phoneme->word
alignment kokoro-fastapi does internally). Every currently-shipped feature
that reads SectionAudio.words already operates at passage granularity (live
word highlighting is separately disabled — see BookContent.tsx), so this
returns one timestamp entry spanning the whole chunk rather than per word.
"""

import base64
import subprocess
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

MODEL_ID = "mlx-community/Kokoro-82M-bf16"
LANG_CODE = "a"  # American English — matches the af_* voices already in use.
DEFAULT_SAMPLE_RATE = 24000

_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    from mlx_audio.tts.utils import load_model

    _model = load_model(MODEL_ID)
    yield


app = FastAPI(lifespan=lifespan)


class CaptionedSpeechRequest(BaseModel):
    model: str = "kokoro"
    input: str
    voice: str = "af_heart"
    response_format: str = "mp3"
    stream: bool = False


def encode_mp3(pcm: np.ndarray, sample_rate: int) -> bytes:
    pcm16 = (np.clip(pcm, -1.0, 1.0) * 32767).astype("<i2").tobytes()
    proc = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-f", "s16le", "-ar", str(sample_rate), "-ac", "1", "-i", "pipe:0",
            "-f", "mp3", "pipe:1",
        ],
        input=pcm16,
        capture_output=True,
        check=True,
    )
    return proc.stdout


@app.post("/dev/captioned_speech")
async def captioned_speech(req: CaptionedSpeechRequest):
    chunks: list[np.ndarray] = []
    sample_rate = DEFAULT_SAMPLE_RATE
    for result in _model.generate(text=req.input, voice=req.voice, speed=1.0, lang_code=LANG_CODE):
        chunks.append(np.array(result.audio, dtype=np.float32))
        sample_rate = result.sample_rate or sample_rate

    pcm = np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.float32)
    duration_s = len(pcm) / sample_rate if sample_rate else 0.0
    mp3_bytes = encode_mp3(pcm, sample_rate)

    return {
        "audio": base64.b64encode(mp3_bytes).decode("ascii"),
        "timestamps": [{"word": req.input, "start_time": 0.0, "end_time": duration_s}],
    }


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_ID}
