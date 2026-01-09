import { Link } from "react-router-dom";
import { Building2, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PaymentHistory = () => {
  const payments = [
    { id: '1', month: 'November 2024', amount: 1500, date: '2024-11-01', status: 'Paid', method: 'Card', receipt: '/receipts/nov-2024.pdf' },
    { id: '2', month: 'October 2024', amount: 1500, date: '2024-10-01', status: 'Paid', method: 'Transfer', receipt: '/receipts/oct-2024.pdf' },
    { id: '3', month: 'September 2024', amount: 1500, date: '2024-09-01', status: 'Paid', method: 'Card', receipt: '/receipts/sep-2024.pdf' },
    { id: '4', month: 'August 2024', amount: 1500, date: '2024-08-01', status: 'Paid', method: 'Card', receipt: '/receipts/aug-2024.pdf' },
    { id: '5', month: 'July 2024', amount: 1500, date: '2024-07-01', status: 'Paid', method: 'Transfer', receipt: '/receipts/jul-2024.pdf' },
  ];

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border flex items-center px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Building2 className="w-6 h-6 text-accent-foreground" />
          </div>
          <span className="text-xl font-semibold">RentFlow</span>
        </Link>
        <div className="ml-auto">
          <Link to="/tenant/dashboard">
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Payment History</h1>
        <p className="text-muted-foreground mb-8">View and download your payment receipts</p>

        <Card className="p-6 mb-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-foreground">${totalPaid.toLocaleString()}</div>
            <div className="text-muted-foreground mt-2">Total Paid (Last 5 Months)</div>
          </div>
        </Card>

        <div className="space-y-3">
          {payments.map((payment) => (
            <Card key={payment.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{payment.month}</div>
                    <div className="text-sm text-muted-foreground">
                      Paid on {payment.date} via {payment.method}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xl font-bold text-foreground">${payment.amount}</div>
                    <div className="text-xs text-success">{payment.status}</div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Receipt
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
