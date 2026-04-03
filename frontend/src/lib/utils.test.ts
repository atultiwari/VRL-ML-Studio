import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('resolves tailwind conflicts — last wins', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'skipped', 'included')).toBe('base included')
  })

  it('handles undefined gracefully', () => {
    expect(cn('base', undefined)).toBe('base')
  })
})
