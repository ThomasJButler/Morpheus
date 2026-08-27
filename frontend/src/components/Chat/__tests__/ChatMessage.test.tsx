import React from 'react';
import { render } from '@testing-library/react';
import ChatMessage from '../ChatMessage';
import type { ChatMessage as ChatMessageType } from '@/lib/types';

const assistant = (content: string): ChatMessageType => ({
  id: 'a1',
  role: 'assistant',
  content,
  timestamp: new Date('2026-01-01'),
  citations: [],
});

describe('ChatMessage rendering of model output', () => {
  it('never renders an image, even when the answer carries markdown image syntax', () => {
    const { container } = render(
      <ChatMessage message={assistant('Look: ![tracker](http://evil.example/p.png) done [1]')} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('done [1]');
  });

  it('neutralises javascript: links', () => {
    const { container } = render(<ChatMessage message={assistant('[click](javascript:alert(1))')} />);
    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
  });
});
