import { Link } from "react-router-dom";
import { Building2, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Documents = () => {
  const documents = [
    { id: '1', name: 'Lease Agreement - Unit 4A', type: 'PDF', size: '2.4 MB', date: '2024-01-15', category: 'lease' },
    { id: '2', name: 'Move-in Checklist', type: 'PDF', size: '1.1 MB', date: '2024-01-15', category: 'other' },
    { id: '3', name: 'November Receipt', type: 'PDF', size: '245 KB', date: '2024-11-01', category: 'receipt' },
    { id: '4', name: 'October Receipt', type: 'PDF', size: '243 KB', date: '2024-10-01', category: 'receipt' },
    { id: '5', name: 'ID Verification', type: 'PDF', size: '1.8 MB', date: '2024-01-10', category: 'id' },
  ];

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
        <h1 className="text-3xl font-bold text-foreground mb-2">Documents</h1>
        <p className="text-muted-foreground mb-8">View and download your documents</p>

        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{doc.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {doc.type} • {doc.size} • {doc.date}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Documents;
