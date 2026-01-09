import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, FileJson, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ExportData {
  headers: string[];
  rows: unknown[][];
  filename: string;
}

interface ExportButtonProps {
  data: unknown[];
  filename: string;
  headers?: string[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export const ExportButton = ({ 
  data, 
  filename, 
  headers, 
  variant = 'outline',
  size = 'sm' 
}: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    try {
      setIsExporting(true);

      // Determine headers
      const csvHeaders = headers || (data.length > 0 ? Object.keys(data[0]) : []);
      
      // Create CSV content
      const csvRows = data.map(row => 
        csvHeaders.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const escaped = String(value || '').replace(/"/g, '""');
          return escaped.includes(',') ? `"${escaped}"` : escaped;
        }).join(',')
      );

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export successful', {
        description: `${filename}.csv downloaded successfully`,
      });
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Export failed', {
        description: 'Unable to export data. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    try {
      setIsExporting(true);

      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.json`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export successful', {
        description: `${filename}.json downloaded successfully`,
      });
    } catch (error) {
      console.error('JSON export error:', error);
      toast.error('Export failed', {
        description: 'Unable to export data. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);

      // For Excel export, we'll create a more compatible CSV format
      // In production, you'd use a library like xlsx
      const csvHeaders = headers || (data.length > 0 ? Object.keys(data[0]) : []);
      
      const csvRows = data.map(row => 
        csvHeaders.map(header => {
          const value = row[header];
          const escaped = String(value || '').replace(/"/g, '""');
          return `"${escaped}"`;
        }).join('\t') // Tab-separated for better Excel compatibility
      );

      const csvContent = [
        csvHeaders.join('\t'),
        ...csvRows
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.xls`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export successful', {
        description: `${filename}.xls downloaded successfully`,
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Export failed', {
        description: 'Unable to export data. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isExporting) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Exporting...
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileJson className="w-4 h-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Hook for export functionality
 */
export const useExport = () => {
  const exportData = (data: unknown[], filename: string, format: 'csv' | 'json' | 'excel' = 'csv') => {
    const button = document.createElement('div');
    document.body.appendChild(button);
    
    // This is a simplified version - in production use the ExportButton component
    /* logged */;
    
    document.body.removeChild(button);
  };

  return { exportData };
};
