import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";

interface ReceiptViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: {
    id: string;
    date: string;
    tenant: string;
    property: string;
    unit: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
  };
}

export const ReceiptViewer = ({ open, onOpenChange, receipt }: ReceiptViewerProps) => {
  const handleDownload = () => {
    toast.success("Receipt downloaded successfully!");
    // In a real app, this would trigger a PDF download
  };

  const handlePrint = () => {
    // Create a print window with only the receipt content
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Receipt</title>');
        printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;}</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
    toast.success("Opening print dialog...");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Rent Receipt</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="bg-white text-black p-8 rounded-lg border-2 border-border" id="receipt-content">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">RentFlow</h1>
            <p className="text-gray-600">Digital Property Management</p>
            <div className="mt-4 pt-4 border-t border-gray-300">
              <h2 className="text-xl font-semibold text-gray-900">RENT RECEIPT</h2>
            </div>
          </div>

          {/* Receipt Details */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-sm text-gray-600 mb-1">Receipt Number</p>
              <p className="font-semibold text-gray-900">{receipt.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Date</p>
              <p className="font-semibold text-gray-900">{receipt.date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Tenant Name</p>
              <p className="font-semibold text-gray-900">{receipt.tenant}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Property</p>
              <p className="font-semibold text-gray-900">{receipt.property}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Unit</p>
              <p className="font-semibold text-gray-900">{receipt.unit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Method</p>
              <p className="font-semibold text-gray-900">{receipt.paymentMethod}</p>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-gray-100 p-6 rounded-lg mb-8">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
                <p className="text-3xl font-bold text-gray-900">${receipt.amount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Transaction ID</p>
                <p className="font-mono text-sm text-gray-900">{receipt.transactionId}</p>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="text-center mb-8">
            <div className="inline-block bg-green-100 text-green-800 px-6 py-2 rounded-full font-semibold">
              ✓ PAID IN FULL
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-300 pt-6 text-center">
            <p className="text-sm text-gray-600">
              This is an automatically generated receipt. No signature required.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              For questions, please contact support@rentflow.com
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
