"use client";

import { Controller, useFormContext } from "react-hook-form";
import { cn } from "@dub/utils";
import { useCallback, useState, useEffect } from "react";
import { useFileUpload } from "../../hooks/use-file-upload";

interface FileUploadFieldProps {
  name: string;
  label: string;
  accept: string;
  maxSize: number;
  multiple?: boolean;
  className?: string;
  onFileIdReceived?: (fileId: string) => void;
}

export const FileUploadField = ({
  name,
  label,
  accept,
  maxSize,
  multiple = false,
  className,
  onFileIdReceived,
}: FileUploadFieldProps) => {
  const { control, setValue } = useFormContext();
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  
  const { uploadFile, getFileProgress, isUploading, cancelUpload } = useFileUpload({
    onFileIdReceived,
    onError: (file, error) => {
      setUploadError(error);
    },
    onSuccess: () => {
      setUploadError("");
    }
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFileChange = useCallback(async (files: FileList | null, onChange: (files: FileList | null) => void) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file size
    if (file.size > maxSize) {
      setUploadError(`File too large. Maximum size is ${formatFileSize(maxSize)}`);
      return;
    }
    
    // Clear previous errors
    setUploadError("");
    
    // Update form value
    onChange(files);
    
    // Start upload
    try {
      await uploadFile(file);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }, [maxSize, formatFileSize, uploadFile]);

  const handleDrop = useCallback(
    (e: React.DragEvent, onChange: (files: FileList | null) => void) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileChange(e.dataTransfer.files, onChange);
      }
    },
    [handleFileChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, onChange: (files: FileList | null) => void) => {
      handleFileChange(e.target.files, onChange);
    },
    [handleFileChange]
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-neutral text-sm font-medium">
        {label}
        <span className="text-red-500">*</span>
      </label>
      
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value }, fieldState }) => (
          <>
            <div
              className={cn(
                "relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors",
                {
                  "border-blue-400 bg-blue-50": dragActive,
                  "border-red-500": fieldState.error,
                }
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => handleDrop(e, onChange)}
            >
              <input
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={(e) => handleInputChange(e, onChange)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    Max size: {formatFileSize(maxSize)}
                  </p>
                </div>
              </div>
            </div>

            {value && value.length > 0 && (
              <div className="space-y-2">
                {Array.from(value).map((file: File, index: number) => {
                  const progress = getFileProgress(file);
                  return (
                    <div key={index} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {progress?.status === "success" ? (
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : progress?.status === "error" ? (
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 ml-2">{formatFileSize(file.size)}</span>
                          </div>
                          
                          {progress && (
                            <div className="mt-1">
                              {progress.status === "uploading" && (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                                      style={{ width: `${progress.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500">{progress.progress}%</span>
                                </div>
                              )}
                              
                              {progress.status === "processing" && (
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full"></div>
                                  <span className="text-xs text-blue-600">Processing...</span>
                                </div>
                              )}
                              
                              {progress.status === "success" && (
                                <span className="text-xs text-green-600">Upload complete</span>
                              )}
                              
                              {progress.status === "error" && progress.error && (
                                <span className="text-xs text-red-600">{progress.error}</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {(progress?.status === "uploading" || progress?.status === "processing") && (
                          <button
                            type="button"
                            onClick={cancelUpload}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(fieldState.error || uploadError) && (
              <span className="text-red-500 text-sm">{fieldState.error?.message || uploadError}</span>
            )}
          </>
        )}
      />
    </div>
  );
};