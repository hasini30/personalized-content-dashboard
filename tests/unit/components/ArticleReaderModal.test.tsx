import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { ArticleReaderModal } from '@/components/cards/ArticleReaderModal';
import { renderWithProviders } from '../../test-utils';
import { ContentItem } from '@/types/content';

describe('ArticleReaderModal Component', () => {
  const sampleArticle: ContentItem = {
    id: 'news-quantum-deep',
    source: 'news',
    title: 'Quantum Advantage in Room-Temperature Superconductors',
    description: 'Researchers achieved stable coherence without liquid helium refrigeration.',
    content:
      'Paragraph 1: In a groundbreaking laboratory experiment, physicists demonstrated quantum coherence at ambient pressure.\n\nParagraph 2: The implications for lossless energy grids and compact quantum processors are unprecedented.',
    simplifiedOverview:
      'Scientists have found a way to run super-fast quantum computers without needing giant, freezing cooling tanks.',
    simplifiedSummary: {
      simpleOverview:
        'Scientists have found a way to run super-fast quantum computers without needing giant, freezing cooling tanks.',
      bulletPoints: [
        'What happened: New materials allow quantum processors to stay stable at room temperature.',
        'Why it matters: Quantum computers can become much smaller, cheaper, and use less electricity.',
        'What to expect next: Research teams are fabricating prototype chips for real-world tests.',
      ],
      whyItMatters:
        'Paves the way for everyday portable quantum computers and lossless power grids.',
    },
    url: 'https://example.com/quantum-deep',
    category: 'science',
    publishedAt: '2026-03-03T12:00:00Z',
    author: 'Dr. Jane Cooper',
    hashtags: ['quantum', 'physics'],
    isDemo: true,
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = renderWithProviders(
      <ArticleReaderModal item={sampleArticle} isOpen={false} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders understandable summary in plain English with key takeaways by default', () => {
    renderWithProviders(
      <ArticleReaderModal item={sampleArticle} isOpen={true} onClose={jest.fn()} />
    );

    // Headline & metadata
    expect(
      screen.getByText('Quantum Advantage in Room-Temperature Superconductors')
    ).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Cooper')).toBeInTheDocument();
    expect(screen.getByText(/1 min easy summary/i)).toBeInTheDocument();

    // Understandable plain English section
    expect(screen.getByText(/In Plain English/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Scientists have found a way to run super-fast quantum computers without needing giant, freezing cooling tanks./i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Key Takeaways/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /New materials allow quantum processors to stay stable at room temperature./i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Why this matters to you:/i)).toBeInTheDocument();

    // ZERO publisher redirect buttons
    expect(screen.queryByText(/visit publisher/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to feed/i })).toBeInTheDocument();
  });

  it('switches between Understandable Summary and Detailed Story tabs', () => {
    renderWithProviders(
      <ArticleReaderModal item={sampleArticle} isOpen={true} onClose={jest.fn()} />
    );

    // Initially in summary mode
    expect(screen.getByText(/In Plain English/i)).toBeInTheDocument();

    // Click Detailed Story tab
    const detailedTab = screen.getByRole('button', { name: /detailed story/i });
    fireEvent.click(detailedTab);

    // Full article body is now visible with structured sections
    expect(screen.getByText(/In a groundbreaking laboratory experiment/i)).toBeInTheDocument();
    expect(screen.getByText(/The implications for lossless energy grids/i)).toBeInTheDocument();

    // Verify there is NO duplicate "Summary Lead" box
    expect(screen.queryByText('Summary Lead')).not.toBeInTheDocument();

    // Click back to summary
    const summaryBtn = screen.getByRole('button', {
      name: /switch back to plain english summary/i,
    });
    fireEvent.click(summaryBtn);
    expect(screen.getByText(/In Plain English/i)).toBeInTheDocument();
  });

  it('renders comprehensive multi-section report without duplicating short descriptions', () => {
    const shortArticle: ContentItem = {
      id: 'news-short-stream',
      source: 'news',
      title: 'Global Semiconductor Consortium Unveils 1nm Test Platform',
      description: 'Pilot production lines demonstrate operational gate-all-around architectures.',
      url: 'https://example.com/semiconductor-1nm',
      category: 'technology',
      publishedAt: '2026-03-03T12:00:00Z',
      author: 'Semiconductor Digest',
      isDemo: true,
    };

    renderWithProviders(
      <ArticleReaderModal item={shortArticle} isOpen={true} onClose={jest.fn()} />
    );

    const detailedTab = screen.getByRole('button', { name: /detailed story/i });
    fireEvent.click(detailedTab);

    // Verifies structured sections are generated and no duplicate summary lead exists
    expect(screen.getByText(/Core Developments & Verified Facts/i)).toBeInTheDocument();
    expect(screen.getByText(/Technical Context & Background/i)).toBeInTheDocument();
    expect(screen.getByText(/Industry Reactions & Real-World Impact/i)).toBeInTheDocument();
    expect(screen.getByText(/Next Milestones & Future Outlook/i)).toBeInTheDocument();
    expect(screen.queryByText('Summary Lead')).not.toBeInTheDocument();
  });

  it('handles closing via close button and Escape key', () => {
    const onClose = jest.fn();
    renderWithProviders(
      <ArticleReaderModal item={sampleArticle} isOpen={true} onClose={onClose} />
    );

    const closeBtn = screen.getByRole('button', { name: /close reader/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('toggles favorite status from within reader modal', () => {
    const { store } = renderWithProviders(
      <ArticleReaderModal item={sampleArticle} isOpen={true} onClose={jest.fn()} />
    );

    const favBtn = screen.getByRole('button', { name: /save to favorites/i });
    fireEvent.click(favBtn);

    expect(store.getState().favorites.items).toHaveLength(1);
    expect(store.getState().favorites.items[0].id).toBe('news-quantum-deep');
  });

  it('toggles font size between base and large', () => {
    renderWithProviders(
      <ArticleReaderModal item={sampleArticle} isOpen={true} onClose={jest.fn()} />
    );

    const fontBtn = screen.getByRole('button', { name: /a\+/i });
    fireEvent.click(fontBtn);
    expect(screen.getByRole('button', { name: /a\-/i })).toBeInTheDocument();
  });
});
