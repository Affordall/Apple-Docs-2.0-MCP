import type { Mock } from 'vitest';

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/utils/wwdc-data-source.js');

import {
  loadGlobalMetadata,
  loadTopicIndex,
  loadYearIndex,
  loadVideoData,
} from '../../src/utils/wwdc-data-source.js';

describe('WWDC Data Source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadGlobalMetadata', () => {
    it('should load global metadata', async () => {
      const mockMetadata = {
        topics: ['topic1', 'topic2'],
        years: ['2023', '2024'],
        statistics: { totalVideos: 100 },
      };

      (loadGlobalMetadata as Mock).mockResolvedValue(mockMetadata);

      const result = await loadGlobalMetadata();

      expect(result).toEqual(mockMetadata);
      expect(loadGlobalMetadata).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (loadGlobalMetadata as Mock).mockRejectedValue(
        new Error('Failed to load WWDC metadata. Please ensure the package is properly installed.')
      );

      await expect(loadGlobalMetadata()).rejects.toThrow(
        'Failed to load WWDC metadata'
      );
    });
  });

  describe('loadTopicIndex', () => {
    it('should load topic index', async () => {
      const mockTopicIndex = {
        id: 'swiftui',
        name: 'SwiftUI',
        videos: ['10001', '10002'],
      };

      (loadTopicIndex as Mock).mockResolvedValue(mockTopicIndex);

      const result = await loadTopicIndex('swiftui');

      expect(result).toEqual(mockTopicIndex);
      expect(loadTopicIndex).toHaveBeenCalledWith('swiftui');
    });

    it('should handle non-existent topic', async () => {
      (loadTopicIndex as Mock).mockRejectedValue(
        new Error('Topic not found: invalid-topic')
      );

      await expect(loadTopicIndex('invalid-topic')).rejects.toThrow(
        'Topic not found: invalid-topic'
      );
    });
  });

  describe('loadYearIndex', () => {
    it('should load year index', async () => {
      const mockYearIndex = {
        year: '2024',
        videos: ['10001', '10002'],
        topics: ['SwiftUI', 'UIKit'],
      };

      (loadYearIndex as Mock).mockResolvedValue(mockYearIndex);

      const result = await loadYearIndex('2024');

      expect(result).toEqual(mockYearIndex);
      expect(loadYearIndex).toHaveBeenCalledWith('2024');
    });

    it('should handle non-existent year', async () => {
      (loadYearIndex as Mock).mockRejectedValue(
        new Error('Year not found: 2099')
      );

      await expect(loadYearIndex('2099')).rejects.toThrow(
        'Year not found: 2099'
      );
    });
  });

  describe('loadVideoData', () => {
    it('should load individual video data', async () => {
      const mockVideo = {
        id: '10001',
        title: 'SwiftUI Essentials',
        year: '2024',
        duration: '20 min',
        topics: ['SwiftUI'],
      };

      (loadVideoData as Mock).mockResolvedValue(mockVideo);

      const result = await loadVideoData('2024', '10001');

      expect(result).toEqual(mockVideo);
      expect(loadVideoData).toHaveBeenCalledWith('2024', '10001');
    });

    it('should handle non-existent video', async () => {
      (loadVideoData as Mock).mockRejectedValue(
        new Error('Video not found: 2024-99999')
      );

      await expect(loadVideoData('2024', '99999')).rejects.toThrow(
        'Video not found: 2024-99999'
      );
    });
  });
});