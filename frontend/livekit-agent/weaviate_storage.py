import os
import json
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime
import weaviate
from weaviate.classes.config import Property, DataType


class WeaviateInterviewStorage:
    """Handles storage and retrieval of interview data in Weaviate."""
    
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Weaviate client connection."""
        try:
            weaviate_url = os.environ.get("WEAVIATE_URL", "http://localhost:8080")
            api_key = os.environ.get("WEAVIATE_API_KEY")
            
            if api_key:
                self.client = weaviate.connect_to_weaviate_cloud(
                    cluster_url=weaviate_url,
                    auth_credentials=weaviate.auth.AuthApiKey(api_key)
                )
            else:
                self.client = weaviate.connect_to_local()
            
            self._ensure_collections()
            print("Connected to Weaviate successfully")
            
        except Exception as e:
            print(f"Failed to connect to Weaviate: {e}")
            self.client = None
    
    def _ensure_collections(self):
        """Ensure required collections exist."""
        if not self.client:
            return
        
        # Interview Insights Collection
        if not self.client.collections.exists("InterviewInsights"):
            self.client.collections.create(
                name="InterviewInsights",
                properties=[
                    Property(name="insight", data_type=DataType.TEXT),
                    Property(name="category", data_type=DataType.TEXT),
                    Property(name="session_id", data_type=DataType.TEXT),
                    Property(name="timestamp", data_type=DataType.DATE),
                    Property(name="participant_email", data_type=DataType.TEXT),
                ]
            )
        
        # Interview Sessions Collection
        if not self.client.collections.exists("InterviewSessions"):
            self.client.collections.create(
                name="InterviewSessions",
                properties=[
                    Property(name="session_id", data_type=DataType.TEXT),
                    Property(name="research_goal", data_type=DataType.TEXT),
                    Property(name="participant_email", data_type=DataType.TEXT),
                    Property(name="start_time", data_type=DataType.DATE),
                    Property(name="end_time", data_type=DataType.DATE),
                    Property(name="duration_minutes", data_type=DataType.NUMBER),
                    Property(name="key_findings", data_type=DataType.TEXT_ARRAY),
                    Property(name="summary", data_type=DataType.TEXT),
                ]
            )
    
    async def store_insight(self, insight_data: Dict[str, Any]) -> bool:
        """Store an interview insight."""
        if not self.client:
            print("Weaviate client not available, logging insight instead")
            print(f"Insight: {json.dumps(insight_data, indent=2)}")
            return False
        
        try:
            collection = self.client.collections.get("InterviewInsights")
            collection.data.insert(insight_data)
            print(f"Stored insight: {insight_data['insight']}")
            return True
        except Exception as e:
            print(f"Failed to store insight: {e}")
            return False
    
    async def store_session_summary(self, summary_data: Dict[str, Any]) -> bool:
        """Store interview session summary."""
        if not self.client:
            print("Weaviate client not available, logging summary instead")
            print(f"Summary: {json.dumps(summary_data, indent=2)}")
            return False
        
        try:
            collection = self.client.collections.get("InterviewSessions")
            collection.data.insert(summary_data)
            print(f"Stored session summary for: {summary_data['session_id']}")
            return True
        except Exception as e:
            print(f"Failed to store session summary: {e}")
            return False
    
    async def get_session_insights(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieve all insights for a session."""
        if not self.client:
            return []
        
        try:
            collection = self.client.collections.get("InterviewInsights")
            response = collection.query.get(
                where={"path": ["session_id"], "operator": "Equal", "valueText": session_id}
            )
            return [item.properties for item in response.objects]
        except Exception as e:
            print(f"Failed to retrieve insights: {e}")
            return []
    
    async def search_insights(self, query: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search insights by text query."""
        if not self.client:
            return []
        
        try:
            collection = self.client.collections.get("InterviewInsights")
            
            where_filter = None
            if category:
                where_filter = {"path": ["category"], "operator": "Equal", "valueText": category}
            
            response = collection.query.near_text(
                query=query,
                where=where_filter,
                limit=10
            )
            return [item.properties for item in response.objects]
        except Exception as e:
            print(f"Failed to search insights: {e}")
            return []
    
    def close(self):
        """Close Weaviate connection."""
        if self.client:
            self.client.close()


# Global instance
weaviate_storage = WeaviateInterviewStorage()
