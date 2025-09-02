import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  List,
  ListItem,
  IconButton,
  Divider,
  Alert,
  Snackbar,
  Chip,
  Grid
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import { trainingService } from '../services/api';

interface UploadedDocument {
  id: number;
  filename: string;
  file_size: number;
  mime_type: string;
  upload_date: string;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
}

export const DocumentUpload: React.FC = () => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await trainingService.getDocuments();
      setDocuments(response.documents);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      setError(error.response?.data?.error || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    await uploadFiles(files);
  };

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    try {
      // Check file sizes before upload
      const maxFileSize = 50 * 1024 * 1024; // 50 MB
      const oversizedFiles = [];
      
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxFileSize) {
          oversizedFiles.push(files[i].name);
        }
      }
      
      if (oversizedFiles.length > 0) {
        setError(`Files too large (max 50 MB): ${oversizedFiles.join(', ')}`);
        setUploading(false);
        return;
      }
      
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('documents', files[i]);
      }

      const response = await trainingService.uploadDocuments(formData);
      setSuccess(`Successfully uploaded ${response.uploaded_count} documents`);
      
      // Refresh document list
      fetchDocuments();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      setError(error.response?.data?.error || 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      setLoading(true);
      await trainingService.deleteDocument(documentId);
      setSuccess('Document deleted successfully');
      
      // Update local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (error: any) {
      console.error('Error deleting document:', error);
      setError(error.response?.data?.error || 'Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <PictureAsPdfIcon color="error" />;
    } else if (mimeType.includes('word') || mimeType.includes('office')) {
      return <DescriptionIcon color="primary" />;
    } else {
      return <InsertDriveFileIcon color="action" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Document Upload
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" paragraph>
          Upload documents to train your AI assistant with your knowledge and expertise.
          Supported file types: PDF, Word documents, TXT, and more.
        </Typography>
        
        <Typography variant="body2" color="textSecondary" paragraph>
          Maximum file size: 50 MB per file
        </Typography>

        <Box 
          sx={{ 
            border: '2px dashed #ccc', 
            borderRadius: 2, 
            p: 3, 
            textAlign: 'center',
            mb: 3,
            bgcolor: 'background.paper',
            ...(dragActive ? { borderColor: 'primary.main', backgroundColor: 'rgba(25, 118, 210, 0.04)' } : {})
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.rtf"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          
          <Typography variant="h6" gutterBottom>
            Drag and drop files here
          </Typography>
          
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Or click to select files
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleUploadClick}
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : null}
            sx={{ mt: 2 }}
          >
            {uploading ? 'Uploading...' : 'Upload Documents'}
          </Button>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Uploaded Documents
        </Typography>
        
        {loading && documents.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : documents.length === 0 ? (
          <Alert severity="info">
            No documents uploaded yet. Upload documents to train your AI assistant.
          </Alert>
        ) : (
          <List>
            {documents.map((doc) => (
              <Paper key={doc.id} sx={{ mb: 2, borderRadius: 1 }}>
                <ListItem
                  secondaryAction={
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={loading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item>{getFileIcon(doc.mime_type)}</Grid>
                    <Grid item xs>
                      <Typography variant="subtitle1" noWrap>
                        {doc.filename}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {formatFileSize(doc.file_size)} • Uploaded on {formatDate(doc.upload_date)}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Chip 
                        label={doc.status}
                        color={
                          doc.status === 'completed' ? 'success' : 
                          doc.status === 'processing' ? 'warning' : 'error'
                        } 
                        size="small" 
                      />
                    </Grid>
                  </Grid>
                </ListItem>
                {doc.error_message && (
                  <Box sx={{ px: 2, pb: 1 }}>
                    <Typography variant="body2" color="error">
                      Error: {doc.error_message}
                    </Typography>
                  </Box>
                )}
              </Paper>
            ))}
          </List>
        )}
      </Paper>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(null)} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DocumentUpload; 