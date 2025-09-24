// File validation service for Amurex Extension
// Validates uploaded files, checks file types, and generates error messages

export const FILE_VALIDATION_CONFIG = {
  // Supported file types
  SUPPORTED_TYPES: {
    'application/pdf': ['.pdf'],
  },

  // File size limits (in bytes)
  MAX_FILE_SIZE: null, // No limit as per requirements

  // Error messages
  ERROR_MESSAGES: {
    INVALID_TYPE: 'Only PDF files are supported',
    FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit',
    EMPTY_FILE: 'File is empty or corrupted',
    INVALID_FILE: 'Invalid file format',
    UNKNOWN_ERROR: 'An unknown error occurred while validating the file',
  },

  // Validation rules
  RULES: {
    ALLOWED_EXTENSIONS: ['.pdf'],
    MIN_FILE_SIZE: 1, // Minimum 1 byte
    MAX_FILES_PER_UPLOAD: 10, // Maximum files per upload session
  },
};

/**
 * File validation result object
 */
export class ValidationResult {
  constructor(isValid, errors = [], warnings = []) {
    this.isValid = isValid;
    this.errors = errors;
    this.warnings = warnings;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Add error to validation result
   * @param {string} error - Error message
   */
  addError(error) {
    this.errors.push(error);
    this.isValid = false;
  }

  /**
   * Add warning to validation result
   * @param {string} warning - Warning message
   */
  addWarning(warning) {
    this.warnings.push(warning);
  }

  /**
   * Get first error message
   * @returns {string|null} - First error message or null
   */
  getFirstError() {
    return this.errors.length > 0 ? this.errors[0] : null;
  }

  /**
   * Get all error messages as single string
   * @returns {string} - All error messages joined
   */
  getAllErrors() {
    return this.errors.join('; ');
  }
}

/**
 * Validate a single file
 * @param {File} file - File object to validate
 * @returns {ValidationResult} - Validation result
 */
export function validateFile(file) {
  const result = new ValidationResult(true);

  try {
    // Check if file exists
    if (!file) {
      result.addError(FILE_VALIDATION_CONFIG.ERROR_MESSAGES.INVALID_FILE);
      return result;
    }

    // Check file type
    if (!isValidFileType(file)) {
      result.addError(FILE_VALIDATION_CONFIG.ERROR_MESSAGES.INVALID_TYPE);
    }

    // Check file size
    if (!isValidFileSize(file)) {
      result.addError(FILE_VALIDATION_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE);
    }

    // Check if file is empty
    if (file.size < FILE_VALIDATION_CONFIG.RULES.MIN_FILE_SIZE) {
      result.addError(FILE_VALIDATION_CONFIG.ERROR_MESSAGES.EMPTY_FILE);
    }

    // Check file name
    if (!isValidFileName(file.name)) {
      result.addWarning('File name contains special characters');
    }
  } catch (error) {
    console.error('Error validating file:', error);
    result.addError(FILE_VALIDATION_CONFIG.ERROR_MESSAGES.UNKNOWN_ERROR);
  }

  return result;
}

/**
 * Validate multiple files
 * @param {File[]} files - Array of files to validate
 * @returns {ValidationResult} - Validation result
 */
export function validateFiles(files) {
  const result = new ValidationResult(true);

  try {
    // Check if files array exists
    if (!files || !Array.isArray(files)) {
      result.addError('No files provided');
      return result;
    }

    // Check file count
    if (files.length === 0) {
      result.addError('No files selected');
      return result;
    }

    if (files.length > FILE_VALIDATION_CONFIG.RULES.MAX_FILES_PER_UPLOAD) {
      result.addError(
        `Maximum ${FILE_VALIDATION_CONFIG.RULES.MAX_FILES_PER_UPLOAD} files allowed per upload`
      );
      return result;
    }

    // Validate each file
    files.forEach((file, index) => {
      const fileResult = validateFile(file);
      if (!fileResult.isValid) {
        fileResult.errors.forEach((error) => {
          result.addError(`File ${index + 1} (${file.name}): ${error}`);
        });
      }
      fileResult.warnings.forEach((warning) => {
        result.addWarning(`File ${index + 1} (${file.name}): ${warning}`);
      });
    });
  } catch (error) {
    console.error('Error validating files:', error);
    result.addError(FILE_VALIDATION_CONFIG.ERROR_MESSAGES.UNKNOWN_ERROR);
  }

  return result;
}

/**
 * Check if file type is valid
 * @param {File} file - File object
 * @returns {boolean} - Whether file type is valid
 */
function isValidFileType(file) {
  const supportedTypes = Object.keys(FILE_VALIDATION_CONFIG.SUPPORTED_TYPES);
  return supportedTypes.includes(file.type);
}

/**
 * Check if file size is valid
 * @param {File} file - File object
 * @returns {boolean} - Whether file size is valid
 */
function isValidFileSize(file) {
  // No size limit as per requirements
  if (FILE_VALIDATION_CONFIG.MAX_FILE_SIZE === null) {
    return true;
  }

  return file.size <= FILE_VALIDATION_CONFIG.MAX_FILE_SIZE;
}

/**
 * Check if file name is valid
 * @param {string} fileName - File name
 * @returns {boolean} - Whether file name is valid
 */
function isValidFileName(fileName) {
  // Check for dangerous characters
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  return !dangerousChars.test(fileName);
}

/**
 * Get file extension from file name
 * @param {string} fileName - File name
 * @returns {string} - File extension (with dot)
 */
export function getFileExtension(fileName) {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return '';
  }
  return fileName.substring(lastDotIndex).toLowerCase();
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file is PDF
 * @param {File} file - File object
 * @returns {boolean} - Whether file is PDF
 */
export function isPdfFile(file) {
  return (
    file.type === 'application/pdf' || getFileExtension(file.name) === '.pdf'
  );
}

/**
 * Get validation summary for multiple files
 * @param {File[]} files - Array of files
 * @returns {Object} - Validation summary
 */
export function getValidationSummary(files) {
  const result = validateFiles(files);

  return {
    totalFiles: files.length,
    validFiles: result.isValid ? files.length : 0,
    invalidFiles: result.errors.length,
    warnings: result.warnings.length,
    isValid: result.isValid,
    errors: result.errors,
    warnings: result.warnings,
  };
}
