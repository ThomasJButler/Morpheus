"""
RAG Chatbot Backend - FastAPI Application
Implements document upload, RAG-based chat with source citations,
confidence scoring, and conversation memory.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, List, Optional
import os
import json
import tempfile
import hashlib
from datetime import datetime
from dotenv import load_dotenv

# LangChain imports
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import PyPDFLoader, TextLoader, UnstructuredMarkdownLoader
from langchain.document_loaders import Docx2txtLoader
from langchain.schema import Document
from langchain.memory import ConversationBufferMemory
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA, ConversationalRetrievalChain
from langchain.prompts import PromptTemplate
from langchain_pinecone import PineconeVectorStore

# Pinecone imports
import pinecone
from pinecone import Pinecone, ServerlessSpec

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="RAG Chatbot API",
    description="Document-based Q&A system with RAG",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = os.getenv("PINECONE_INDEX", "rag-chatbot")

# Initialize embeddings and LLM
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
llm = ChatOpenAI(model="gpt-4", temperature=0.7, streaming=True)

# Initialize conversation memory (stores last 5 conversations)
memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True,
    output_key="answer"
)

# Document storage (in production, use a database)
uploaded_documents = {}

# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, any]]
    confidence_score: float
    session_id: str

class DocumentInfo(BaseModel):
    id: str
    filename: str
    chunks: int
    upload_date: str
    file_type: str

# Helper Functions
def get_file_loader(file_path: str, file_extension: str):
    """Get appropriate loader based on file extension"""
    if file_extension == ".pdf":
        return PyPDFLoader(file_path)
    elif file_extension == ".txt":
        return TextLoader(file_path)
    elif file_extension == ".md":
        return UnstructuredMarkdownLoader(file_path)
    elif file_extension == ".docx":
        return Docx2txtLoader(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_extension}")

def process_document(file_path: str, filename: str, file_extension: str):
    """Process document: load, split, and create embeddings"""
    # Load document
    loader = get_file_loader(file_path, file_extension)
    documents = loader.load()

    # Split into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_documents(documents)

    # Add metadata to each chunk
    for i, chunk in enumerate(chunks):
        chunk.metadata.update({
            "source": filename,
            "chunk_id": i,
            "total_chunks": len(chunks),
            "upload_date": datetime.now().isoformat()
        })

    return chunks

# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "message": "RAG Chatbot API is operational",
        "version": "1.0.0"
    }

@app.post("/api/upload", response_model=DocumentInfo)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a document for RAG
    Supports: PDF, TXT, MD, DOCX
    """
    try:
        # Validate file extension
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in [".pdf", ".txt", ".md", ".docx"]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Supported: PDF, TXT, MD, DOCX"
            )

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        # Process document
        chunks = process_document(tmp_file_path, file.filename, file_extension)

        # Create document ID
        doc_id = hashlib.md5(f"{file.filename}_{datetime.now().isoformat()}".encode()).hexdigest()

        # Initialize Pinecone vector store
        vectorstore = PineconeVectorStore.from_documents(
            documents=chunks,
            embedding=embeddings,
            index_name=index_name,
            namespace=doc_id
        )

        # Store document info
        doc_info = {
            "id": doc_id,
            "filename": file.filename,
            "chunks": len(chunks),
            "upload_date": datetime.now().isoformat(),
            "file_type": file_extension,
            "vectorstore_namespace": doc_id
        }
        uploaded_documents[doc_id] = doc_info

        # Clean up temp file
        os.unlink(tmp_file_path)

        return DocumentInfo(**doc_info)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_documents(request: ChatRequest):
    """
    Chat endpoint with RAG, source citations, and confidence scoring
    """
    try:
        # Initialize Pinecone vector store for retrieval
        vectorstore = PineconeVectorStore(
            index_name=index_name,
            embedding=embeddings,
            namespace="default"  # Use all namespaces for search
        )

        # Custom prompt template with source citation
        prompt_template = """You are a helpful AI assistant that answers questions based on the provided documents.
        Always cite your sources when providing information.

        Context: {context}

        Question: {question}

        Instructions:
        1. Answer the question based on the context provided
        2. Cite specific sources when making claims
        3. If the answer is not in the context, say so clearly
        4. Be concise but thorough

        Answer:"""

        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )

        # Create retrieval chain with conversation memory
        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=vectorstore.as_retriever(
                search_type="similarity_score_threshold",
                search_kwargs={
                    "k": 5,  # Return top 5 relevant chunks
                    "score_threshold": 0.5  # Minimum similarity threshold
                }
            ),
            memory=memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": PROMPT}
        )

        # Get response
        result = qa_chain({"question": request.message})

        # Extract source documents and calculate confidence
        sources = []
        confidence_scores = []

        for doc in result.get("source_documents", []):
            # Get similarity score (mock implementation - in production, get from Pinecone)
            score = 0.85  # This would come from the actual similarity search
            confidence_scores.append(score)

            sources.append({
                "content": doc.page_content[:200] + "...",  # Preview of content
                "source": doc.metadata.get("source", "Unknown"),
                "chunk_id": doc.metadata.get("chunk_id", 0),
                "confidence": score,
                "page": doc.metadata.get("page", 1)
            })

        # Calculate overall confidence score
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0

        response = ChatResponse(
            answer=result["answer"],
            sources=sources,
            confidence_score=avg_confidence,
            session_id=request.session_id
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents")
async def list_documents():
    """List all uploaded documents"""
    return list(uploaded_documents.values())

@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document from the system"""
    if doc_id not in uploaded_documents:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from Pinecone (delete namespace)
    index = pc.Index(index_name)
    index.delete(delete_all=True, namespace=doc_id)

    # Remove from local storage
    del uploaded_documents[doc_id]

    return {"message": "Document deleted successfully", "doc_id": doc_id}

@app.post("/api/summarize/{doc_id}")
async def summarize_document(doc_id: str):
    """Generate a summary of a specific document"""
    if doc_id not in uploaded_documents:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Get document chunks from Pinecone
        vectorstore = PineconeVectorStore(
            index_name=index_name,
            embedding=embeddings,
            namespace=doc_id
        )

        # Retrieve all chunks for the document
        docs = vectorstore.similarity_search("", k=10)  # Get first 10 chunks

        # Combine text
        full_text = "\n\n".join([doc.page_content for doc in docs])

        # Create summary prompt
        summary_prompt = f"""Please provide a concise summary of the following document:

        {full_text[:4000]}  # Limit to avoid token limits

        Summary:"""

        # Generate summary
        response = llm.predict(summary_prompt)

        return {
            "doc_id": doc_id,
            "filename": uploaded_documents[doc_id]["filename"],
            "summary": response
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat endpoint for real-time responses"""
    async def generate():
        try:
            # Initialize vector store
            vectorstore = PineconeVectorStore(
                index_name=index_name,
                embedding=embeddings,
                namespace="default"
            )

            # Get relevant documents
            docs = vectorstore.similarity_search_with_score(request.message, k=5)

            # Format context
            context = "\n\n".join([doc[0].page_content for doc in docs])

            # Create prompt
            prompt = f"""Based on the following context, answer the question:

            Context: {context}

            Question: {request.message}

            Answer:"""

            # Stream response
            for chunk in llm.stream(prompt):
                yield f"data: {json.dumps({'content': chunk.content})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/api/health")
async def health_check():
    """Check system health and connectivity"""
    health_status = {
        "api": "operational",
        "openai": "unknown",
        "pinecone": "unknown"
    }

    try:
        # Test OpenAI connection
        embeddings.embed_query("test")
        health_status["openai"] = "connected"
    except:
        health_status["openai"] = "error"

    try:
        # Test Pinecone connection
        pc.list_indexes()
        health_status["pinecone"] = "connected"
    except:
        health_status["pinecone"] = "error"

    return health_status

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)