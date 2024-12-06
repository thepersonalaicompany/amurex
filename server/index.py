from robyn.robyn import  Request
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client, Client
import supabase
from openai import OpenAI
import requests
import json
import os
import time
import numpy as np
import redis
from hashlib import sha256
from typing import List, Optional
from groq import Groq
import uuid
import fitz
from dotenv import load_dotenv
from mixedbread_ai.client import MixedbreadAI
from io import BytesIO
from PyPDF2 import PdfReader
from robyn import Robyn, ALLOW_CORS, WebSocket, Response, Request
from robyn.types import Body
import sentry_sdk
from sentry_sdk import capture_exception

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    traces_sample_rate=1.0,
)

sentry_sdk.profiler.start_profiler()
load_dotenv()


class AIClientAdapter:
    def __init__(self, client_mode):
        self.client_mode = client_mode
        self.ollama_url = "http://localhost:11434/api/chat"
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    def chat_completions_create(self, model, messages, temperature=0.2, response_format=None):
        # expect llama3.2 as the model name
        local = {
            "llama3.2": "llama3.2",
            "gpt-4o": "llama3.2"
        }
        groq = {
            "llama3.2": "llama3-70b-8192" 
        }
        if self.client_mode == "LOCAL":
            # Use Ollama client
            data = {
                "messages": messages,
                "model": local[model],
                "stream": False,
            }
            response = requests.post(self.ollama_url, json=data)
            return json.loads(response.text)["message"]["content"]
        elif self.client_mode == "ONLINE":
            # Use OpenAI or Groq client based on the model
            if "gpt" in model:
                return self.openai_client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    response_format=response_format
                ).choices[0].message.content
            else:
                return self.groq_client.chat.completions.create(
                    model=groq[model],
                    messages=messages,
                    temperature=temperature,
                    response_format=response_format
                ).choices[0].message.content


client_mode = os.getenv("CLIENT_MODE")
ai_client = AIClientAdapter(client_mode)
mxbai = MixedbreadAI(api_key=os.getenv("MXBAI_API_KEY"))

app = Robyn(__file__)
websocket = WebSocket(app, "/ws")


ALLOW_CORS(app, origins = ["*"])


url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)


def parse_array_string(s):
    # Remove brackets and split in one operation
    return np.fromstring(s[1:-1], sep=',', dtype=float)


@app.exception
def handle_exception(error):
    capture_exception(error)
    return Response(status_code=500, description=f"error msg: {error}", headers={})


redis_user = os.getenv("REDIS_USERNAME")
redis_host = os.getenv("REDIS_URL")
redis_password = os.getenv("REDIS_PASSWORD")
redis_port = int(os.getenv("REDIS_PORT"))
redis_url = f"rediss://{redis_user}:{redis_password}@{redis_host}:{redis_port}"
redis_client = redis.Redis.from_url(redis_url)
CACHE_EXPIRATION = 60 * 60 * 24  # 24 hours in seconds


def get_cache_key(transcript: str) -> str:
    """Generate a deterministic cache key from the transcript"""
    return f"transcript:{sha256(transcript.encode()).hexdigest()}"


def extract_action_items(transcript):
    # Sample prompt to instruct the model on extracting action items per person
    messages = [
        {
            "role": "user",
            "content": """You are an executive assistant tasked with extracting action items from a meeting transcript.
            For each person involved in the transcript, list their name with their respective action items, or state "No action items"
            if there are none for that person.
            
            Write it as an html list in a json body. For example:
            {"html":"
            <h3>Arsen</h3>
            <ul>
              <li>action 1 bla bla</li>
              <li>action 2 bla</li>
            </ul>
            <h3>Sanskar</h3>
            <ul>
              <li>action 1 bla bla</li>
              <li>action 2 bla</li>
            </ul>"
            }
            
            Transcript: """ + transcript
        }
    ]

    # Sending the prompt to the AI model using chat completions
    response = ai_client.chat_completions_create(
        model="gpt-4o",
        messages=messages,
        temperature=0.2,
        response_format={"type": "json_object"}
    )

    action_items = json.loads(response)["html"]
    return action_items


def generate_notes(transcript):
    messages = [
        {
            "role": "user",
            "content": f"""You are an executive assistant tasked with taking notes from an online meeting transcript.
                Transcript: {transcript}"""
        }
    ]

    response = ai_client.chat_completions_create(
        model="gpt-4o",
        messages=messages,
        temperature=0.2
    )

    notes = response
    return notes


def send_email(list_emails, actions, meeting_summary = None):
    url = "https://api.resend.com/emails"
    successful_emails = []
    resend_key = os.getenv("RESEND_API_KEY")
    resend_email = os.getenv("RESEND_NOREPLY")

    if not meeting_summary:
        html = f"""
        <h1>Action Items</h1>
        {actions}
        """

    else:
        html = f"""
        <h1>Meeting Summary</h1>
        <p>{meeting_summary}</p>
        <h1>Action Items</h1>
        {actions}
        """

    if list_emails:
        current_time = time.localtime()
        formatted_time = time.strftime("%d %b %Y %I:%M%p", current_time)
        for email in list_emails:
            payload = {
                "from": resend_email,
                "to": email,
                "subject": f"Summary | Meeting on {formatted_time} | Amurex",
                "html": html
            }
            headers = {
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json"
            }

            response = requests.request("POST", url, json=payload, headers=headers)

            if response.status_code != 200:
                return {"type": "error", "error": f"Error sending email to {email}: {response.text}", "emails": None}
            else:
                successful_emails.append(email)

    return {"type": "success", "error": None, "emails": successful_emails}


def extract_text(file_path):
    with fitz.open(file_path) as pdf_document:
        text = ""
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            text += page.get_text()
    return text


def get_chunks(text):
    max_chars = 200
    overlap = 50
    
    chunks = []
    start = 0
    while start < len(text):
        chunk = text[start:start + max_chars]
        chunks.append(chunk)
        start += max_chars - overlap
    
    if start < len(text):
        chunks.append(text[start:])

    return chunks


def embed_text(text):
    embeddings = mxbai.embeddings(
        model='mixedbread-ai/mxbai-embed-large-v1',
        input=[text],
        normalized=True,
        encoding_format='float',
        truncation_strategy='end'
    )

    return embeddings.data[0].embedding


@app.post("/upload_meeting_file/:meeting_id/:user_id/")
async def upload_meeting_file(request):
    meeting_id = request.path_params.get("meeting_id")
    user_id = request.path_params.get("user_id")
    # call_type = int(request.path_params.get("call_type"))
    files = request.files
    file_name = list(files.keys())[0] if len(files) > 0 else None

    if not file_name:
        return Response(status_code=400, description="No file provided", headers={})

    # Check file size limit (20MB)
    file_contents = files[file_name] # bytearray of file
    file_limit = 20 * 1024 * 1024
    if len(file_contents) > file_limit: # 20MB in bytes
        return Response(status_code=413, description="File size exceeds 20MB limit", headers={})
    
    # Generate unique filename
    file_extension = file_name.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    
    # Read file contents
    file_contents = files[file_name]
    
    # Upload to Supabase Storage
    storage_response = supabase.storage.from_("meeting_context_files").upload(
        unique_filename,
        file_contents
    )
    
    # Get public URL for the uploaded file
    file_url = supabase.storage.from_("meeting_context_files").get_public_url(unique_filename)


    new_entry = supabase.table("meetings").upsert(
        {
            "meeting_id": meeting_id,
            "user_id": user_id,
            "context_files": [file_url]
        },
        on_conflict="meeting_id, user_id"
    ).execute()

    pdf_stream = BytesIO(file_contents)
    reader = PdfReader(pdf_stream)

    file_text = ''
    for page in reader.pages:
        file_text += page.extract_text()

    file_chunks = get_chunks(file_text)
    embedded_chunks = [str(embed_text(chunk)) for chunk in file_chunks]

    result = supabase.table("meetings")\
        .update({"embeddings": embedded_chunks, "chunks": file_chunks})\
        .eq("meeting_id", meeting_id)\
        .eq("user_id", user_id)\
        .execute()
    
    return {
        "status": "success",
        "file_url": file_url,
        "updated_meeting": result.data[0]
    }


class TranscriptRequest(Body):
    transcript: str
    meeting_id: str
    user_id: str


class ActionRequest(Body):
    transcript: str


class ActionItemsRequest(Body):
    action_items: str
    emails: List[str]
    meeting_summary: Optional[ str ] = None


@app.post("/generate_actions")
async def generate_actions(request, body: ActionRequest):
    data = request.json()
    transcript = data["transcript"]
    cache_key = get_cache_key(transcript)
    
    # Try to get from cache
    cached_result = redis_client.get(cache_key)
    if cached_result:
        return json.loads(cached_result)
    
    # Generate new results if not in cache
    action_items = extract_action_items(transcript)
    notes_content = generate_notes(transcript)
    
    result = {
        "action_items": action_items,
        "notes_content": notes_content
    }
    
    # Cache the result
    redis_client.setex(
        cache_key,
        CACHE_EXPIRATION,
        json.dumps(result)
    )
    
    return result


@app.post("/submit")
async def submit(request, body: ActionItemsRequest):
    data = request.json()
    action_items = data["action_items"]
    meeting_summary = data["meeting_summary"]
    
    # notion_url = create_note(notes_content)
    emails = data["emails"]
    successful_emails = send_email(emails, action_items, meeting_summary)

    if successful_emails["type"] == "error":
        return {
            "successful_emails": None,
            "error": successful_emails["error"]
        }
    
    return {"successful_emails": successful_emails["emails"]}


@app.get("/")
def home():
    return "Welcome to the Amurex backend!"


def find_closest_chunk(query_embedding, chunks_embeddings, chunks):
    query_embedding = np.array(query_embedding)
    chunks_embeddings = np.array(chunks_embeddings)

    similarities = cosine_similarity([query_embedding], chunks_embeddings)

    closest_indices = np.argsort(similarities, axis=1)[0, -5:][::-1] # Five the closest indices of embeddings
    closest_chunks = [chunks[i] for i in closest_indices]

    return closest_chunks


def generate_realtime_suggestion(context, transcript):
    messages = [
        {
            "role": "system",
            "content": """
                You are a personal online meeting assistant, and your task is to give instant help for a user during a call.
                Possible cases when user needs help or a suggestion:
                - They are struggling to answer a question
                - They were asked a question that requires recalling something
                - They need to recall something from their memory (e.g. 'what was the company you told us about 3 weeks ago?')
                
                You have to generate the most important suggestion or help for a user based on the information retrieved from user's memory and latest transcript chunk.
            """
        },
        {
            "role": "user",
            "content": f"""
                Information retrieved from user's memory: {context},
                Latest chunk of the transcript: {transcript},
                

                Be super short. Just give some short facts or key words that could help your user to answer the question.
                Do not use any intro words, like 'Here's the suggestion' etc.
            """
        }
    ]

    response = ai_client.chat_completions_create(
        model="llama3.2",
        messages=messages,
        temperature=0
    )

    response = response

    return response


def check_suggestion(request_dict):
    try:
        transcript = request_dict["transcript"]
        meeting_id = request_dict["meeting_id"]
        user_id = request_dict["user_id"]

        sb_response = supabase.table("meetings").select("context_files, embeddings, chunks, suggestion_count").eq("meeting_id", meeting_id).eq("user_id", user_id).execute().data

        if not sb_response:
            return {
                "files_found": False,
                "generated_suggestion": None,
                "last_question": None,
                "type": "no_record_found"
                }
        
        sb_response = sb_response[0]
        if not sb_response["context_files"] or not sb_response["chunks"]:
            return {
                "files_found": False,
                "generated_suggestion": None,
                "last_question": None,
                "type": "no_file_found"
                }

        if int(sb_response["suggestion_count"]) >= 10:
            return {
                "files_found": True,
                "generated_suggestion": None,
                "last_question": None,
                "type": "exceeded_response"
            }
        
        file_chunks = sb_response["chunks"]
        embedded_chunks = sb_response["embeddings"]
        embedded_chunks = [parse_array_string(item) for item in embedded_chunks]

        messages_list = [
            {
                "role": "system",
                "content": """You are a personal online meeting copilot, and your task is to detect if a speaker needs help during a call. 

                    Possible cases when user needs help in real time:
                    - They need to recall something from their memory (e.g. 'what was the company you told us about 3 weeks ago?')
                    - They need to recall something from files or context they have prepared for the meeting (we are able handle the RAG across their documents)

                    If the user was not asked a question or is not trying to recall something, then they don't need any help or suggestions.
                    
                    You have to identify if they need help based on the call transcript,
                    If your user has already answered the question, there is no need to help.
                    If the last sentence in the transcript was a question, then your user probably needs help. If it's not a question, then don't.
                    
                    You are strictly required to follow this JSON structure:
                    {"needs_help":true/false, "last_question": json null or the last question}
                """
            },
            {
                "role": "user",
                "content": f"""
                    Latest chunk from the transcript: {transcript}.
                """
            }
        ]

        response = ai_client.chat_completions_create(
            model="gpt-4o",
            messages=messages_list,
            temperature=0,
            response_format={"type": "json_object"}
        )

        response_content = json.loads(response)
        last_question = response_content["last_question"]

        if 'needs_help' in response_content and response_content["needs_help"]:
            embedded_query = embed_text(last_question)
            closest_chunks = find_closest_chunk(query_embedding=embedded_query, chunks_embeddings=embedded_chunks, chunks=file_chunks)

            suggestion = generate_realtime_suggestion(context=closest_chunks, transcript=transcript)

            result = supabase.table("meetings")\
                .update({"suggestion_count": int(sb_response["suggestion_count"]) + 1})\
                .eq("meeting_id", meeting_id)\
                .eq("user_id", user_id)\
                .execute()

            return {
                "files_found": True,
                "generated_suggestion": suggestion,
                "last_question": last_question,
                "type": "suggestion_response"
                }
        else:
            return {
                "files_found": True,
                "generated_suggestion": None,
                "last_question": None,
                "type": "suggestion_response"
                }
    
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": "An unexpected error occurred. Please try again later."}


@websocket.on("connect")
async def on_connect(ws, msg):
    meeting_id = ws.query_params.get("meeting_id")

    primary_user_key = f"primary_user:{meeting_id}"
    if not redis_client.exists(primary_user_key):
        redis_client.set(primary_user_key, ws.id)

    if not redis_client.exists(f"meeting:{meeting_id}"):
        redis_client.set(f"meeting:{meeting_id}", "")

    return ""


@websocket.on("message")
async def on_message(ws, msg):
    try:
        # First ensure the message is properly parsed as JSON
        if isinstance(msg, str):
            msg_data = json.loads(msg)
        else:
            msg_data = msg

        meeting_id = ws.query_params.get("meeting_id")
        data = msg_data.get("data")
        type_ = msg_data.get("type")

        # Safely access the data field
        if not isinstance(msg_data, dict) or data is None or type_ is None:
            return ""

        if type_ == "transcript_update":
            primary_user_key = f"primary_user:{meeting_id}"
            
            if not redis_client.exists(primary_user_key):
                redis_client.set(primary_user_key, ws.id)


            if redis_client.get(primary_user_key).decode() == ws.id:
                # Safely access transcript data
                if data is None:
                    return ""
                    
                transcript = data
                current_transcript = redis_client.get(f"meeting:{meeting_id}")
                
                if current_transcript:
                    current_transcript = current_transcript.decode()
                else:
                    current_transcript = ""
                
                updated_transcript = current_transcript + transcript
                redis_client.setex(f"meeting:{meeting_id}", CACHE_EXPIRATION, updated_transcript)

        elif type_ == "check_suggestion":
            data["meeting_id"] = meeting_id
            response = check_suggestion(data)

            return json.dumps(response)

    except json.JSONDecodeError as e:
        return f"JSON parsing error: {e}"
    except Exception as e:
        return f"WebSocket error: {e}"

    return ""


@websocket.on("close")
async def close(ws, msg):
    meeting_id = ws.query_params.get("meeting_id")
    primary_user_key = f"primary_user:{meeting_id}"
    if redis_client.get(primary_user_key).decode() == ws.id:
        redis_client.delete(primary_user_key)

    return ""


@app.get("/late_summary/:meeting_id")
async def get_late_summary(path_params):
    meeting_id = path_params["meeting_id"]
    transcript = redis_client.get(f"meeting:{meeting_id}")
    late_summary = generate_notes(transcript)

    return {"late_summary": late_summary}


@app.get("/check_meeting/:meeting_id")
async def check_meeting(path_params):
    meeting_id = path_params["meeting_id"]
    is_meeting = redis_client.exists(f"meeting:{meeting_id}")

    return {"is_meeting": is_meeting}


@app.get("/health_check")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.getenv('PORT', 8080))
    app.start(port=port, host="0.0.0.0")
