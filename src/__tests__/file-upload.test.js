// File upload system tests for Amurex Extension
// Tests file validation, upload service, and upload store integration

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fileUploadService, UploadProgress } from '../lib/file-upload.js';
import {
  formatFileSize,
  getFileExtension,
  getValidationSummary,
  isPdfFile,
  validateFile,
  validateFiles,
} from '../lib/file-validation.js';
import { useUploadStore } from '../store/uploadStore.js';

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  constructor() {
    this.upload = {
      addEventListener: vi.fn(),
    };
    this.addEventListener = vi.fn();
    this.open = vi.fn();
    this.send = vi.fn();
    this.status = 200;
    this.responseText = '{"success": true}';
    this.timeout = 0;
  }
}

// Mock global XMLHttpRequest
global.XMLHttpRequest = MockXMLHttpRequest;

// Mock chrome storage
global.chrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue(),
    },
  },
};

// Mock File constructor
global.File = class MockFile {
  constructor(name, size, type) {
    this.name = name;
    this.size = size;
    this.type = type;
  }
};

describe('File Upload System', () => {
  beforeEach(() => {
    // Reset stores
    useUploadStore.getState().reset();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    useUploadStore.getState().reset();
  });

  describe('File Validation', () => {
    it('should validate PDF files correctly', () => {
      const pdfFile = new File('test.pdf', 1024, 'application/pdf');
      const result = validateFile(pdfFile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-PDF files', () => {
      const textFile = new File('test.txt', 1024, 'text/plain');
      const result = validateFile(textFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Only PDF files are supported');
    });

    it('should reject empty files', () => {
      const emptyFile = new File('empty.pdf', 0, 'application/pdf');
      const result = validateFile(emptyFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty or corrupted');
    });

    it('should validate multiple files', () => {
      const files = [
        new File('test1.pdf', 1024, 'application/pdf'),
        new File('test2.pdf', 2048, 'application/pdf'),
      ];

      const result = validateFiles(files);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed valid and invalid files', () => {
      const files = [
        new File('test1.pdf', 1024, 'application/pdf'),
        new File('test2.txt', 1024, 'text/plain'),
      ];

      const result = validateFiles(files);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should detect PDF files correctly', () => {
      const pdfFile = new File('test.pdf', 1024, 'application/pdf');
      const textFile = new File('test.txt', 1024, 'text/plain');

      expect(isPdfFile(pdfFile)).toBe(true);
      expect(isPdfFile(textFile)).toBe(false);
    });

    it('should extract file extensions correctly', () => {
      expect(getFileExtension('test.pdf')).toBe('.pdf');
      expect(getFileExtension('test.txt')).toBe('.txt');
      expect(getFileExtension('test')).toBe('');
    });

    it('should provide validation summary', () => {
      const files = [
        new File('test1.pdf', 1024, 'application/pdf'),
        new File('test2.pdf', 2048, 'application/pdf'),
      ];

      const summary = getValidationSummary(files);

      expect(summary.totalFiles).toBe(2);
      expect(summary.validFiles).toBe(2);
      expect(summary.invalidFiles).toBe(0);
      expect(summary.isValid).toBe(true);
    });
  });

  describe('Upload Progress', () => {
    it('should create upload progress correctly', () => {
      const progress = new UploadProgress('file1', 'test.pdf', 1024);

      expect(progress.fileId).toBe('file1');
      expect(progress.fileName).toBe('test.pdf');
      expect(progress.totalSize).toBe(1024);
      expect(progress.uploadedSize).toBe(0);
      expect(progress.percentage).toBe(0);
      expect(progress.status).toBe('pending');
    });

    it('should update progress correctly', () => {
      const progress = new UploadProgress('file1', 'test.pdf', 1024);

      progress.updateProgress(512);

      expect(progress.uploadedSize).toBe(512);
      expect(progress.percentage).toBe(50);
    });

    it('should set status correctly', () => {
      const progress = new UploadProgress('file1', 'test.pdf', 1024);

      progress.setStatus('uploading');

      expect(progress.status).toBe('uploading');
      expect(progress.startTime).not.toBeNull();
    });

    it('should format progress info correctly', () => {
      const progress = new UploadProgress('file1', 'test.pdf', 1024);
      progress.updateProgress(512);
      progress.setStatus('uploading');

      const formatted = progress.getFormattedProgress();

      expect(formatted.fileId).toBe('file1');
      expect(formatted.fileName).toBe('test.pdf');
      expect(formatted.percentage).toBe(50);
      expect(formatted.uploadedSize).toBe('512 Bytes');
      expect(formatted.totalSize).toBe('1 KB');
      expect(formatted.status).toBe('uploading');
    });
  });

  describe('Upload Store', () => {
    it('should add files to upload queue', () => {
      const file = new File('test.pdf', 1024, 'application/pdf');

      useUploadStore.getState().addFile(file);

      const state = useUploadStore.getState();
      expect(state.files).toHaveLength(1);
      expect(state.files[0].name).toBe('test.pdf');
      expect(state.files[0].status).toBe('pending');
    });

    it('should remove files from upload queue', () => {
      const file = new File('test.pdf', 1024, 'application/pdf');

      useUploadStore.getState().addFile(file);
      const fileId = useUploadStore.getState().files[0].id;

      useUploadStore.getState().removeFile(fileId);

      const state = useUploadStore.getState();
      expect(state.files).toHaveLength(0);
    });

    it('should update file status', () => {
      const file = new File('test.pdf', 1024, 'application/pdf');

      useUploadStore.getState().addFile(file);
      const fileId = useUploadStore.getState().files[0].id;

      useUploadStore.getState().setFileStatus(fileId, 'uploading');

      const state = useUploadStore.getState();
      expect(state.files[0].status).toBe('uploading');
    });

    it('should track upload progress', () => {
      const file = new File('test.pdf', 1024, 'application/pdf');

      useUploadStore.getState().addFile(file);
      const fileId = useUploadStore.getState().files[0].id;

      const progress = {
        fileId,
        percentage: 50,
        uploadedSize: 512,
        totalSize: 1024,
        status: 'uploading',
      };

      useUploadStore.getState().updateProgress(fileId, progress);

      const state = useUploadStore.getState();
      expect(state.uploadProgress[fileId]).toEqual(progress);
    });

    it('should get files by status', () => {
      const file1 = new File('test1.pdf', 1024, 'application/pdf');
      const file2 = new File('test2.pdf', 2048, 'application/pdf');

      useUploadStore.getState().addFile(file1);
      useUploadStore.getState().addFile(file2);

      const fileId1 = useUploadStore.getState().files[0].id;
      const fileId2 = useUploadStore.getState().files[1].id;

      useUploadStore.getState().setFileStatus(fileId1, 'uploading');
      useUploadStore.getState().setFileStatus(fileId2, 'completed');

      const pendingFiles = useUploadStore.getState().getPendingFiles();
      const uploadingFiles = useUploadStore.getState().getUploadingFiles();
      const completedFiles = useUploadStore.getState().getCompletedFiles();

      expect(pendingFiles).toHaveLength(0);
      expect(uploadingFiles).toHaveLength(1);
      expect(completedFiles).toHaveLength(1);
    });

    it('should calculate total progress', () => {
      const file1 = new File('test1.pdf', 1024, 'application/pdf');
      const file2 = new File('test2.pdf', 1024, 'application/pdf');

      useUploadStore.getState().addFile(file1);
      useUploadStore.getState().addFile(file2);

      const fileId1 = useUploadStore.getState().files[0].id;
      const fileId2 = useUploadStore.getState().files[1].id;

      useUploadStore.getState().updateProgress(fileId1, { percentage: 50 });
      useUploadStore.getState().updateProgress(fileId2, { percentage: 100 });

      const totalProgress = useUploadStore.getState().getTotalProgress();
      expect(totalProgress).toBe(75); // (50 + 100) / 2
    });

    it('should provide upload statistics', () => {
      const file1 = new File('test1.pdf', 1024, 'application/pdf');
      const file2 = new File('test2.pdf', 2048, 'application/pdf');

      useUploadStore.getState().addFile(file1);
      useUploadStore.getState().addFile(file2);

      const fileId1 = useUploadStore.getState().files[0].id;
      useUploadStore.getState().setFileStatus(fileId1, 'completed');

      const stats = useUploadStore.getState().getUploadStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('should handle errors correctly', () => {
      const errorMessage = 'Upload failed';
      useUploadStore.getState().setError(errorMessage);

      const state = useUploadStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isUploading).toBe(false);
    });

    it('should clear files and reset state', () => {
      const file = new File('test.pdf', 1024, 'application/pdf');

      useUploadStore.getState().addFile(file);
      useUploadStore.getState().setError('Test error');

      useUploadStore.getState().clearFiles();

      const state = useUploadStore.getState();
      expect(state.files).toHaveLength(0);
      expect(state.error).toBeNull();
    });
  });

  describe('File Upload Service Integration', () => {
    it('should handle upload lifecycle', async () => {
      const file = new File('test.pdf', 1024, 'application/pdf');
      const meetingId = 'test-meeting';
      const userId = 'test-user';

      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      // Mock successful upload with proper async behavior
      const mockXHR = new MockXMLHttpRequest();
      mockXHR.status = 200;
      mockXHR.responseText = '{"success": true, "file_id": "123"}';

      // Simulate successful load event
      mockXHR.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          setTimeout(() => handler(), 10);
        }
      });

      global.XMLHttpRequest = vi.fn(() => mockXHR);

      const result = await fileUploadService.uploadFile(
        file,
        meetingId,
        userId,
        onProgress,
        onComplete,
        onError
      );

      expect(result.success).toBe(true);
      expect(onComplete).toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      const file = new File('test.pdf', 1024, 'application/pdf');
      const meetingId = 'test-meeting';
      const userId = 'test-user';

      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      // Mock failed upload with proper async behavior
      const mockXHR = new MockXMLHttpRequest();
      mockXHR.status = 500;
      mockXHR.responseText = 'Internal Server Error';

      // Simulate failed load event
      mockXHR.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          setTimeout(() => handler(), 10);
        }
      });

      global.XMLHttpRequest = vi.fn(() => mockXHR);

      const result = await fileUploadService.uploadFile(
        file,
        meetingId,
        userId,
        onProgress,
        onComplete,
        onError
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate files before upload', async () => {
      const invalidFile = new File('test.txt', 1024, 'text/plain');
      const meetingId = 'test-meeting';
      const userId = 'test-user';

      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      const result = await fileUploadService.uploadFile(
        invalidFile,
        meetingId,
        userId,
        onProgress,
        onComplete,
        onError
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only PDF files are supported');
    });
  });
});
