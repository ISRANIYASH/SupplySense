from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Qdrant
from langchain.prompts import PromptTemplate
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
import os

os.environ["OPENAI_API_KEY"] = os.environ.get("OPENAI_API_KEY", "sk-mock-key")

def setup_rag_chain():
    # Mock LLM and Embeddings for smoke test
    llm = ChatOpenAI(model="gpt-4o", temperature=0.2)
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    # Connect to Qdrant (or use a mock)
    # qdrant = Qdrant.from_existing_collection(
    #     embedding=embeddings,
    #     collection_name="supply_chain_docs",
    #     url=os.environ.get("QDRANT_URL", "http://localhost:6333")
    # )
    # retriever = qdrant.as_retriever(search_kwargs={"k": 5})

    # Mock Retriever
    class MockRetriever:
        def invoke(self, query):
            from langchain.schema import Document
            return [Document(page_content="Mock context for: " + query)]
    retriever = MockRetriever()

    system_prompt = (
        "You are SupplySense AI Copilot — an expert supply chain analyst with access to all company data. "
        "Answer questions accurately based on the provided context. For data queries, always cite the source and date. "
        "For recommendations, explain your reasoning. Generate charts when asked (return Chart.js config JSON). "
        "Generate PDF reports when asked (return structured data). Always respond in the same language as the user.\n\n"
        "Context: {context}"
    )

    prompt = PromptTemplate.from_template(system_prompt)
    document_chain = create_stuff_documents_chain(llm, prompt)
    retrieval_chain = create_retrieval_chain(retriever, document_chain)
    
    return retrieval_chain

if __name__ == "__main__":
    chain = setup_rag_chain()
    print("RAG Chain initialized.")
