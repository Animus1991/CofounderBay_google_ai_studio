import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CoverImage from './CoverImage';

describe('CoverImage', () => {
  it('shows the picture, then a placeholder when it fails to load', () => {
    render(<CoverImage src="https://example.com/x.jpg" alt="Pitch night" />);
    const img = screen.getByAltText('Pitch night');
    fireEvent.error(img);
    expect(screen.queryByAltText('Pitch night')).toBeNull();
    expect(screen.getByTestId('cover-placeholder')).toBeTruthy();
  });

  it('shows the placeholder when there is no address', () => {
    render(<CoverImage src="" alt="Pitch night" />);
    expect(screen.getByTestId('cover-placeholder')).toBeTruthy();
  });
});
