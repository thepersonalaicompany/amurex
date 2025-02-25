import React, { useState, useRef } from 'react';
import { trackEvent } from '../utils/api';

const FileUpload = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is PDF
    if (file.type !== 'application/pdf') {
      setUploadStatus('Only PDF files are allowed');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('File size should be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading...');
    
    trackEvent('upload_context_file_start');

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          const newProgress = prevProgress + 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 500);

      // Simulate upload completion after progress reaches 100%
      setTimeout(() => {
        clearInterval(interval);
        setUploadProgress(100);
        setUploadStatus('Upload complete!');
        setIsUploading(false);
        
        // Notify parent component
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        
        // Dispatch event for other components to listen to
        const event = new CustomEvent('fileUploadStatusChanged', {
          detail: { uploaded: true }
        });
        window.dispatchEvent(event);
        
        // Track successful upload
        trackEvent('upload_context_file_success');
        
        // Store upload status in local storage or API
        localStorage.setItem('fileUploaded', 'true');
      }, 5000);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus('Upload failed. Please try again.');
      setIsUploading(false);
      trackEvent('upload_context_file_fail');
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        className="w-full border-2 border-dashed border-[rgba(255,255,255,0.2)] rounded-lg p-6 mb-4 text-center cursor-pointer hover:border-[#8B5CF6] transition-colors"
        onClick={() => fileInputRef.current.click()}
      >
        <svg 
          className="w-12 h-12 mx-auto mb-4 text-[rgba(255,255,255,0.5)]" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor"
        >
          <path 
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-[rgba(255,255,255,0.7)] mb-1">
          Drag and drop your PDF file here
        </p>
        <p className="text-[rgba(255,255,255,0.5)] text-sm">
          or click to browse files
        </p>
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>
      
      {isUploading && (
        <div className="w-full">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[rgba(255,255,255,0.7)]">Uploading...</span>
            <span className="text-[rgba(255,255,255,0.7)]">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-[#18181B] rounded-full h-2 mb-4">
            <div 
              className="bg-[#8B5CF6] h-2 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {uploadStatus && !isUploading && (
        <div className={`text-sm ${uploadStatus.includes('complete') ? 'text-green-500' : uploadStatus.includes('failed') || uploadStatus.includes('allowed') || uploadStatus.includes('less') ? 'text-red-500' : 'text-[rgba(255,255,255,0.7)]'}`}>
          {uploadStatus}
        </div>
      )}
      
      {!isUploading && (
        <button
          className="mt-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          onClick={() => fileInputRef.current.click()}
        >
          Select PDF File
        </button>
      )}
    </div>
  );
};

export default FileUpload; 