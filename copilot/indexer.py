import os
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Qdrant
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Mock indexing for smoke test
os.environ["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY", "sk-mock-key")

def index_documents(pdf_path: str):
    """
    Indexes a document into Qdrant using OpenAI embeddings.
    """
    print(f"Loading document: {pdf_path}")
    # In a real environment, we would load the PDF:
    # loader = PyMuPDFLoader(pdf_path)
    # docs = loader.load()
    
    # Mock document for demonstration
    docs = [{"page_content": "Supplier SUP-01 contract terms. Lead time is 5 days.", "metadata": {"source": pdf_path}}]
    
    print("Splitting text...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=50)
    # splits = text_splitter.split_documents(docs)
    
    print("Indexing into Qdrant...")
    # qdrant = Qdrant.from_documents(
    #     splits,
    #     OpenAIEmbeddings(model="text-embedding-3-small"),
    #     url=os.environ.get("QDRANT_URL", "http://localhost:6333"),
    #     collection_name="supply_chain_docs"
    # )
    print("Indexing complete.")

if __name__ == "__main__":
    index_documents("sample_contract.pdf")
