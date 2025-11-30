'use client';

import { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'morpheus_session_id';

// Simple UUID v4 generator (no external dependency needed)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface UseSessionReturn {
  sessionId: string;
  isInitialized: boolean;
  isCleaningUp: boolean;
  resetSession: () => Promise<void>;
  getSessionHeader: () => Record<string, string>;
}

/**
 * Hook for managing browser session with Pinecone namespace isolation.
 * - Creates a unique session ID per browser session
 * - Stores in localStorage for persistence within the same browser
 * - Cleans up old data on session init
 */
export function useSession(): UseSessionReturn {
  const [sessionId, setSessionId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      // Check for existing session
      let currentSessionId = localStorage.getItem(SESSION_KEY);
      
      if (!currentSessionId) {
        // Create new session
        currentSessionId = generateUUID();
        localStorage.setItem(SESSION_KEY, currentSessionId);
        console.log('🆕 Created new session:', currentSessionId);
      } else {
        console.log('📂 Restored existing session:', currentSessionId);
      }
      
      setSessionId(currentSessionId);
      
      // Clean up the namespace on session init to ensure fresh state
      setIsCleaningUp(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/documents/cleanup`, {
          method: 'POST',
          headers: {
            'X-Session-ID': currentSessionId,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('🧹 Session cleanup result:', data);
        } else {
          console.warn('⚠️ Session cleanup failed:', response.statusText);
        }
      } catch (error) {
        console.error('❌ Error during session cleanup:', error);
        // Don't block initialization on cleanup failure
      } finally {
        setIsCleaningUp(false);
        setIsInitialized(true);
      }
    };

    initSession();
  }, []);

  // Reset session - creates a new session ID and cleans up
  const resetSession = useCallback(async () => {
    const newSessionId = generateUUID();
    localStorage.setItem(SESSION_KEY, newSessionId);
    setSessionId(newSessionId);
    
    // Clean up the new namespace
    setIsCleaningUp(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/documents/cleanup`, {
        method: 'POST',
        headers: {
          'X-Session-ID': newSessionId,
        },
      });
      console.log('🔄 Session reset to:', newSessionId);
    } catch (error) {
      console.error('Error during session reset cleanup:', error);
    } finally {
      setIsCleaningUp(false);
    }
  }, []);

  // Helper to get the session header for API calls
  const getSessionHeader = useCallback((): Record<string, string> => {
    if (sessionId) {
      return { 'X-Session-ID': sessionId };
    }
    return {};
  }, [sessionId]);

  return {
    sessionId,
    isInitialized,
    isCleaningUp,
    resetSession,
    getSessionHeader,
  };
}

export default useSession;
