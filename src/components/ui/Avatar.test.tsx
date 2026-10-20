import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Avatar from './Avatar';

describe('Avatar', () => {
 it('renders initials when src is empty', () => {
  render(<Avatar src="" fallback="Marcus Thorne" />);
  expect(screen.getByText('MT')).toBeTruthy();
  expect(document.querySelector('img')).toBeNull();
 });

 it('renders an img when a real src is given', () => {
  render(<Avatar src="https://example.com/face.jpg" fallback="Marcus Thorne" />);
  const img = document.querySelector('img');
  expect(img).not.toBeNull();
  expect(img?.src).toBe('https://example.com/face.jpg');
 });
});
