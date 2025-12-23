'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Button from '../UI/Button';

interface InputBarProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function InputBar({
  onSendMessage,
  disabled = false,
  placeholder = 'Ask me about your documents... (Cmd+K to focus)',
}: InputBarProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      // Reset height after sending
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Keyboard shortcut: Cmd+K or Ctrl+K to focus
  useEffect(() => {
    const handleKeyboardShortcut = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, []);

  const characterCount = message.length;
  const characterLimit = 2000;
  const isNearLimit = characterCount > characterLimit * 0.8;
  const isOverLimit = characterCount > characterLimit;

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 relative group">
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={characterLimit}
          rows={1}
          className={`
            w-full px-4 py-3 sm:px-5 sm:py-3 rounded-lg font-mono text-base
            bg-glass-bg border-2 border-glass-border text-matrix-white
            placeholder:text-matrix-white/50
            focus:outline-none focus:border-matrix-green
            transition-all duration-300 ease-out
            resize-none overflow-y-auto
            min-h-[56px] sm:min-h-[64px] max-h-[200px]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isFocused ? 'shadow-lg shadow-matrix-green/20' : ''}
            ${isOverLimit ? 'border-red-500/50 focus:border-red-500' : ''}
          `}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0, 255, 0, 0.3) transparent',
          }}
        />

        {/* Enhanced character counter with visual feedback */}
        <div
          className={`
            absolute bottom-3 right-3 px-2 py-1 rounded-md
            text-xs font-mono transition-all duration-200
            ${isOverLimit
              ? 'text-red-400 bg-red-500/10 border border-red-500/30'
              : isNearLimit
              ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30'
              : 'text-matrix-white/40 bg-transparent border border-transparent'
            }
          `}
        >
          {characterCount}/{characterLimit}
        </div>

        {/* Focus indicator - subtle glow line at bottom */}
        <div
          className={`
            absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-matrix-green to-transparent
            transition-opacity duration-300
            ${isFocused ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)',
          }}
        />
      </div>

      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim() || isOverLimit}
        variant="primary"
        size="lg"
        className="min-w-[56px] sm:min-w-[100px] h-[56px] sm:h-[64px] font-semibold text-base shadow-lg hover:shadow-xl hover:shadow-matrix-green/30 transition-all duration-300"
      >
        {disabled ? (
          <span className="flex items-center gap-2">
            <span className="loading-pulse" />
            <span className="loading-pulse" />
            <span className="loading-pulse" />
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="hidden sm:inline">SEND</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-6 h-6 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-0.5"
            >
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </span>
        )}
      </Button>
    </div>
  );
}