import { describe, it, expect } from 'vitest';
/**
 * A framework's name folded for comparison; the names themselves come from Apple's technologies list.
 */
import { frameworkKey } from '../../src/tools/list-technologies.js';

describe('frameworkKey', () => {
  it('drops case, spaces, dashes and underscores, so each spelling of a name compares equal', () => {
    for (const typed of ['swiftui', 'SWIFTUI', 'swift-ui', 'swift_ui', ' SwiftUI ', 'swift ui']) {
      expect(frameworkKey(typed)).toBe('swiftui');
    }
    expect(frameworkKey('Foundation Models')).toBe(frameworkKey('foundationmodels'));
  });
});
