/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
  onSuccess?: (files: UploadedFile[]) => void;
  multiple?: boolean;
  category?: 'lease' | 'receipt' | 'id' | 'photo' | 'maintenance' | 'other';
}

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

export const FileUploadDialog = ({
  open,
  onOpenChange,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  maxSize = 10 * 1024 * 1024, // 10MB default
  onSuccess,
  multiple = true,
  category = 'other',
}: FileUploadDialogProps) => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [documentType, setDocumentType] = useState<string>(category);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    // Validate files
    const validFiles: FileWithProgress[] = [];
    
    for (const file of selectedFiles) {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}`, {
          description: `Accepted types: ${acceptedTypes.join(', ')}`,
        });
        continue;
      }

      // Check file size
      if (file.size > maxSize) {
        toast.error(`File too large: ${file.name}`, {
          description: `Maximum size: ${formatFileSize(maxSize)}`,
        });
        continue;
      }

      validFiles.push({
        file,
        progress: 0,
        status: 'pending',
      });
    }

    if (multiple) {
      setFiles(prev => [...prev, ...validFiles]);
    } else {
      setFiles(validFiles.slice(0, 1));
    }

    // Reset input
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (fileWithProgress: FileWithProgress, index: number): Promise<void> => {
    try {
      // Update status to uploading
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'uploading' as const } : f
      ));

      // Upload file
      const result = await api.upload(
        '/documents/upload',
        fileWithProgress.file,
        { type: documentType },
        {
          // Simulate upload progress (in real implementation, use XHR or fetch with progress events)
          onUploadProgress: (progressEvent: { loaded: number; total: number }) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFiles(prev => prev.map((f, i) => 
              i === index ? { ...f, progress: percentCompleted } : f
            ));
          },
        } as any
      );

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Upload failed');
      }

      // Update status to success
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'success' as const,
          progress: 100,
          uploadedFile: result.data as UploadedFile,
        } : f
      ));
    } catch (error) {
      console.error('Upload error:', error);
      
      // Update status to error
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Upload failed',
        } : f
      ));

      throw error;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('No files selected');
      return;
    }

    setIsUploading(true);

    try {
      // Upload files sequentially
      for (let i = 0; i < files.length; i++) {
        if (files[i].status === 'pending') {
          await uploadFile(files[i], i);
        }
      }

      // Check if all uploads were successful
      const allSuccess = files.every(f => f.status === 'success');
      
      if (allSuccess) {
        const uploadedFiles = files
          .filter(f => f.uploadedFile)
          .map(f => f.uploadedFile!);

        toast.success('Upload successful', {
          description: `${uploadedFiles.length} file(s) uploaded successfully`,
        });

        onSuccess?.(uploadedFiles);
        onOpenChange(false);
        setFiles([]);
      } else {
        toast.warning('Some uploads failed', {
          description: 'Please retry the failed uploads',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload files (max {formatFileSize(maxSize)} each)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="docType">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType} disabled={isUploading}>
              <SelectTrigger id="docType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lease">Lease Agreement</SelectItem>
                <SelectItem value="receipt">Payment Receipt</SelectItem>
                <SelectItem value="id">Identification</SelectItem>
                <SelectItem value="photo">Property Photo</SelectItem>
                <SelectItem value="maintenance">Maintenance Photo</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload Area */}
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors">
            <input
              type="file"
              id="fileInput"
              className="hidden"
              accept={acceptedTypes.join(',')}
              multiple={multiple}
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <label htmlFor="fileInput" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-foreground font-medium mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} 
                {' '}(max {formatFileSize(maxSize)})
              </p>
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <Label>Selected Files ({files.length})</Label>
              {files.map((fileWithProgress, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-3 p-3 border rounded-lg',
                    fileWithProgress.status === 'success' && 'bg-success/10 border-success/20',
                    fileWithProgress.status === 'error' && 'bg-destructive/10 border-destructive/20'
                  )}
                >
                  <File className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {fileWithProgress.file.name}
                      </p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatFileSize(fileWithProgress.file.size)}
                      </span>
                    </div>
                    
                    {fileWithProgress.status === 'uploading' && (
                      <Progress value={fileWithProgress.progress} className="h-1" />
                    )}
                    
                    {fileWithProgress.status === 'error' && (
                      <p className="text-xs text-destructive">
                        {fileWithProgress.error}
                      </p>
                    )}
                  </div>

                  {fileWithProgress.status === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  )}
                  
                  {fileWithProgress.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  )}

                  {!isUploading && fileWithProgress.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0 || files.every(f => f.status === 'success')}
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
