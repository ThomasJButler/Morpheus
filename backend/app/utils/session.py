"""
Session management for multi-turn conversations.

Provides in-memory session storage with automatic cleanup.
For production, this could be replaced with Redis or database storage.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional

from app.models.chat import Citation, Session

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages conversation sessions with automatic cleanup.

    Uses in-memory storage suitable for development and moderate traffic.
    For production with multiple instances, consider Redis or similar.
    """

    def __init__(self, ttl_minutes: int = 60):
        """
        Initialise session manager.

        Args:
            ttl_minutes: Session time-to-live in minutes
        """
        self._sessions: Dict[str, Session] = {}
        self._ttl_minutes = ttl_minutes
        logger.info(f"SessionManager initialised with {ttl_minutes}min TTL")

    def create_session(
        self,
        metadata: Optional[dict] = None,
    ) -> Session:
        """
        Create a new conversation session.

        Args:
            metadata: Optional metadata to attach

        Returns:
            New session object
        """
        session_id = str(uuid.uuid4())

        session = Session(
            session_id=session_id,
            metadata=metadata or {},
        )

        self._sessions[session_id] = session

        logger.info(f"Created session: {session_id}")
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        """
        Retrieve session by ID.

        Args:
            session_id: Session identifier

        Returns:
            Session if found and not expired, None otherwise
        """
        session = self._sessions.get(session_id)

        if not session:
            return None

        # Check if expired
        if self._is_expired(session):
            logger.info(f"Session expired: {session_id}")
            self.delete_session(session_id)
            return None

        return session

    def update_session(self, session: Session):
        """
        Update existing session.

        Args:
            session: Session to update
        """
        session.updated_at = datetime.now()
        self._sessions[session.session_id] = session

    def delete_session(self, session_id: str):
        """
        Delete session by ID.

        Args:
            session_id: Session identifier
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"Deleted session: {session_id}")

    def add_message_to_session(
        self,
        session_id: str,
        role: str,
        content: str,
        citations: Optional[list[Citation]] = None,
    ) -> Optional[Session]:
        """
        Add a message to an existing session.

        Args:
            session_id: Session identifier
            role: Message role ('user' or 'assistant')
            content: Message content
            citations: Optional citations

        Returns:
            Updated session if found, None otherwise
        """
        session = self.get_session(session_id)

        if not session:
            logger.warning(f"Session not found: {session_id}")
            return None

        session.add_message(role, content, citations)
        self.update_session(session)

        return session

    def get_or_create_session(
        self,
        session_id: Optional[str] = None,
    ) -> Session:
        """
        Get existing session or create new one.

        Args:
            session_id: Optional session ID to retrieve

        Returns:
            Existing or new session
        """
        if session_id:
            session = self.get_session(session_id)
            if session:
                return session

        # Create new session
        return self.create_session()

    def cleanup_expired_sessions(self):
        """
        Remove expired sessions from storage.

        Should be called periodically by background task.
        """
        expired = []

        for session_id, session in self._sessions.items():
            if self._is_expired(session):
                expired.append(session_id)

        for session_id in expired:
            self.delete_session(session_id)

        if expired:
            logger.info(f"Cleaned up {len(expired)} expired sessions")

    def _is_expired(self, session: Session) -> bool:
        """
        Check if session has expired.

        Args:
            session: Session to check

        Returns:
            True if expired, False otherwise
        """
        expiry_time = session.updated_at + timedelta(minutes=self._ttl_minutes)
        return datetime.now() > expiry_time

    def get_session_count(self) -> int:
        """
        Get current number of active sessions.

        Returns:
            Number of sessions in storage
        """
        return len(self._sessions)

    def get_session_stats(self) -> dict:
        """
        Get statistics about active sessions.

        Returns:
            Dictionary with session statistics
        """
        total = len(self._sessions)
        expired = sum(1 for s in self._sessions.values() if self._is_expired(s))

        total_messages = sum(len(s.messages) for s in self._sessions.values())

        return {
            "total_sessions": total,
            "active_sessions": total - expired,
            "expired_sessions": expired,
            "total_messages": total_messages,
            "ttl_minutes": self._ttl_minutes,
        }


# Global session manager instance
_session_manager: Optional[SessionManager] = None


def get_session_manager(ttl_minutes: int = 60) -> SessionManager:
    """
    Get global session manager instance.

    Args:
        ttl_minutes: Session TTL (only used on first call)

    Returns:
        SessionManager instance
    """
    global _session_manager

    if _session_manager is None:
        _session_manager = SessionManager(ttl_minutes=ttl_minutes)

    return _session_manager


# Convenience functions
def create_session() -> Session:
    """
    Quick session creation.

    Returns:
        New session
    """
    manager = get_session_manager()
    return manager.create_session()


def get_session(session_id: str) -> Optional[Session]:
    """
    Quick session retrieval.

    Args:
        session_id: Session identifier

    Returns:
        Session if found, None otherwise
    """
    manager = get_session_manager()
    return manager.get_session(session_id)


def add_message(
    session_id: str,
    role: str,
    content: str,
    citations: Optional[list[Citation]] = None,
) -> Optional[Session]:
    """
    Quick message addition.

    Args:
        session_id: Session identifier
        role: Message role
        content: Message content
        citations: Optional citations

    Returns:
        Updated session if found
    """
    manager = get_session_manager()
    return manager.add_message_to_session(session_id, role, content, citations)
