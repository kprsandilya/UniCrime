import json
from typing import Any

import aiohttp
import modal
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

vllm_image = (
    modal.Image.from_registry("nvidia/cuda:12.8.0-devel-ubuntu22.04", add_python="3.12")
    .entrypoint([])
    .uv_pip_install(
        "vllm==0.13.0",
        "huggingface-hub==0.36.0",
    )
    .env({"HF_XET_HIGH_PERFORMANCE": "1"})  # faster model transfers
)

# Lightweight image for the chat HTTP endpoint (no GPU).
chat_endpoint_image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "fastapi[standard]",
    "aiohttp",
)


MODEL_NAME = "Qwen/Qwen3-4B-Thinking-2507-FP8"
MODEL_REVISION = "953532f942706930ec4bb870569932ef63038fdf"  # avoid nasty surprises when repos update!


hf_cache_vol = modal.Volume.from_name("huggingface-cache", create_if_missing=True)
vllm_cache_vol = modal.Volume.from_name("vllm-cache", create_if_missing=True)

# Trade-off: True = faster cold start, slower inference (eager mode, no CUDA graphs).
# False = slower cold start, much faster inference (CUDA graphs + torch.compile).
# Set to False for better inference speed once the replica is warm.
FAST_BOOT = False

app = modal.App("example-vllm-inference")

N_GPU = 8
MINUTES = 60  # seconds
VLLM_PORT = 8000


@app.function(
    image=vllm_image,
    gpu=f"H100:{N_GPU}",
    scaledown_window=15 * MINUTES,  # how long should we stay up with no requests?
    timeout=10 * MINUTES,  # how long should we wait for container start?
    volumes={
        "/root/.cache/huggingface": hf_cache_vol,
        "/root/.cache/vllm": vllm_cache_vol,
    },
)
@modal.concurrent(  # how many requests can one replica handle? tune carefully!
    max_inputs=32
)
@modal.web_server(port=VLLM_PORT, startup_timeout=10 * MINUTES)
def serve():
    import subprocess

    cmd = [
        "vllm",
        "serve",
        "--uvicorn-log-level=info",
        MODEL_NAME,
        "--revision",
        MODEL_REVISION,
        "--served-model-name",
        MODEL_NAME,
        "llm",
        "--host",
        "0.0.0.0",
        "--port",
        str(VLLM_PORT),
    ]

    # enforce-eager disables both Torch compilation and CUDA graph capture
    # default is no-enforce-eager. see the --compilation-config flag for tighter control
    cmd += ["--enforce-eager" if FAST_BOOT else "--no-enforce-eager"]

    # assume multiple GPUs are for splitting up large matrix multiplications
    cmd += ["--tensor-parallel-size", str(N_GPU)]

    # Inference speed tuning (4B FP8 on H100 has plenty of headroom)
    if not FAST_BOOT:
        cmd += [
            "--gpu-memory-utilization", "0.95",   # more KV cache → fewer preemptions
            "--max-num-batched-tokens", "16384", # higher prefill batch → better throughput
        ]

    print(*cmd)

    subprocess.Popen(" ".join(cmd), shell=True)


# --- Chat endpoint: accept a prompt and return the model response ---

class ChatRequest(BaseModel):
    """POST body for the /chat endpoint."""

    prompt: str
    stream: bool = False  # if True, stream SSE; if False, return full completion JSON


@app.function(
    image=chat_endpoint_image,
    timeout=10 * MINUTES,  # allow time for vLLM cold start
)
@modal.fastapi_endpoint(label="llm-chat", docs=True)
def chat_api() -> FastAPI:
    """Expose an HTTP endpoint that forwards prompts to the deployed vLLM model."""

    api = FastAPI(
        title="UniCrime LLM Chat",
        description="Send a prompt to the deployed model. Optionally request a GraphQL query for crime data.",
    )

    @api.post("/chat")
    async def chat(request: ChatRequest) -> dict[str, Any]:
        """Accept a prompt and return the model's completion (or stream)."""
        vllm_url = await serve.get_web_url.aio()
        messages = [
            {"role": "user", "content": request.prompt},
        ]
        payload: dict[str, Any] = {
            "messages": messages,
            "model": MODEL_NAME,
            "stream": request.stream,
        }

        headers = {"Content-Type": "application/json"}
        if request.stream:
            headers["Accept"] = "text/event-stream"

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{vllm_url}/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=5 * MINUTES),
            ) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    raise HTTPException(
                        status_code=502,
                        detail=f"vLLM returned {resp.status}: {text[:500]}",
                    )
                if request.stream:
                    # Return streaming response (SSE)
                    async def stream():
                        async for line in resp.content:
                            yield line

                    return StreamingResponse(
                        stream(),
                        media_type="text/event-stream",
                        headers={"Cache-Control": "no-cache"},
                    )
                data = await resp.json()
                return data

    return api


@app.local_entrypoint()
async def test(test_timeout=10 * MINUTES, content=None, twice=True):
    url = await serve.get_web_url.aio()

    system_prompt = {
        "role": "system",
        "content": "You are a pirate who can't help but drop sly reminders that he went to Harvard.",
    }
    if content is None:
        content = "Explain the singular value decomposition."

    messages = [  # OpenAI chat format
        system_prompt,
        {"role": "user", "content": content},
    ]

    async with aiohttp.ClientSession(base_url=url) as session:
        print(f"Running health check for server at {url}")
        async with session.get("/health", timeout=test_timeout - 1 * MINUTES) as resp:
            up = resp.status == 200
        assert up, f"Failed health check for server at {url}"
        print(f"Successful health check for server at {url}")

        print(f"Sending messages to {url}:", *messages, sep="\n\t")
        await _send_request(session, "llm", messages)
        if twice:
            messages[0]["content"] = "You are Jar Jar Binks."
            print(f"Sending messages to {url}:", *messages, sep="\n\t")
            await _send_request(session, "llm", messages)


async def _send_request(
    session: aiohttp.ClientSession, model: str, messages: list
) -> None:
    # `stream=True` tells an OpenAI-compatible backend to stream chunks
    payload: dict[str, Any] = {"messages": messages, "model": model, "stream": True}

    headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}

    async with session.post(
        "/v1/chat/completions", json=payload, headers=headers
    ) as resp:
        async for raw in resp.content:
            resp.raise_for_status()
            # extract new content and stream it
            line = raw.decode().strip()
            if not line or line == "data: [DONE]":
                continue
            if line.startswith("data: "):  # SSE prefix
                line = line[len("data: ") :]

            chunk = json.loads(line)
            assert (
                chunk["object"] == "chat.completion.chunk"
            )  # or something went horribly wrong
            print(chunk["choices"][0]["delta"]["content"], end="")
    print()

