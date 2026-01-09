import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TicketResponseDialog } from "@/components/admin/TicketResponseDialog";
import { TicketDetailDialog } from "@/components/admin/TicketDetailDialog";
import { SearchBar } from "@/components/admin/SearchBar";
import { TicketFiltersBar } from "@/components/admin/TicketFiltersBar";
import { TablePagination } from "@/components/admin/TablePagination";
import { SupportTicket, TicketFilters } from "@/types/admin";
import { toast } from "sonner";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { 
  fetchSupportTickets, 
  updateTicketStatus, 
  addTicketMessage 
} from "@/services/supportTicketService";
import { supabase } from "@/lib/supabase";

const SupportTickets = () => {
  const navLinks = useAdminNavigation();
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<TicketFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Fetch tickets from database
  useEffect(() => {
    let isMounted = true;
    
    const loadTickets = async () => {
      try {
        setLoading(true);
        const { tickets, total } = await fetchSupportTickets(
          {
            status: filters.status,
            priority: filters.priority,
            category: filters.category,
          },
          currentPage,
          pageSize
        );
        
        if (isMounted) {
          setAllTickets(tickets);
          setTotalTickets(total);
        }
      } catch (error) {
        console.error('Failed to load tickets:', error);
        if (isMounted) {
          toast.error('Failed to load support tickets');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadTickets();
    
    return () => {
      isMounted = false;
    };
  }, [filters, currentPage, pageSize]);

  // Filter and search logic (client-side for search, server-side for filters)
  const filteredTickets = useMemo(() => {
    let result = allTickets;

    // Search filter (client-side)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(ticket => 
        ticket.subject.toLowerCase().includes(query) ||
        (ticket.user && ticket.user.toLowerCase().includes(query)) ||
        ticket.id.toLowerCase().includes(query)
      );
    }

    return result;
  }, [allTickets, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / pageSize);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsDetailDialogOpen(true);
  };

  const handleRespondTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsResponseDialogOpen(true);
  };

  const handleStatusChange = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      await updateTicketStatus(ticketId, status);
      toast.success('Ticket status updated successfully');
      // Reload tickets
      const { tickets, total } = await fetchSupportTickets(
        {
          status: filters.status,
          priority: filters.priority,
          category: filters.category,
        },
        currentPage,
        pageSize
      );
      setAllTickets(tickets);
      setTotalTickets(total);
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const handleSendMessage = async (ticketId: string, message: string) => {
    try {
      // Get current user info - in a real app, this would come from auth context
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to send messages');
        return;
      }

      // Get user's name from users table
      const { data: userData } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', user.id)
        .single();

      await addTicketMessage(
        ticketId, 
        user.id, 
        userData?.name || 'Admin',
        userData?.role || 'admin',
        message
      );
      
      toast.success('Message sent successfully');
      setIsDetailDialogOpen(false);
      // Reload tickets
      const { tickets, total } = await fetchSupportTickets(
        {
          status: filters.status,
          priority: filters.priority,
          category: filters.category,
        },
        currentPage,
        pageSize
      );
      setAllTickets(tickets);
      setTotalTickets(total);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleExportTickets = async () => {
    try {
      // Simple CSV export
      const headers = ['Ticket ID', 'Subject', 'User', 'Priority', 'Status', 'Created At'];
      const rows = allTickets.map(ticket => [
        ticket.id,
        ticket.subject,
        ticket.userName || '',
        ticket.priority,
        ticket.status,
        new Date(ticket.createdAt).toLocaleDateString(),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tickets-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Tickets exported successfully");
    } catch (error) {
      console.error('Error exporting tickets:', error);
      toast.error('Failed to export tickets');
    }
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery("");
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      pageTitle="Support Tickets"
      pageDescription="Manage user support requests"
    >
      {selectedTicket && (
        <>
          <TicketResponseDialog
            open={isResponseDialogOpen}
            onOpenChange={setIsResponseDialogOpen}
            ticket={selectedTicket}
            onResponseSent={() => {/* Response sent */}}
          />
          <TicketDetailDialog
            open={isDetailDialogOpen}
            onOpenChange={setIsDetailDialogOpen}
            ticket={selectedTicket}
            onStatusChange={handleStatusChange}
            onSendMessage={handleSendMessage}
          />
        </>
      )}

      {/* Header with Search and Actions */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by ticket ID, subject, or user..."
            className="flex-1 max-w-md"
          />
          <Button variant="outline" onClick={handleExportTickets}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <TicketFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Tickets List */}
      <Card>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tickets...</p>
            </div>
          ) : paginatedTickets.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-2">No support tickets found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || Object.keys(filters).length > 0 
                  ? 'Try adjusting your search or filters' 
                  : 'Support tickets will appear here once submitted'}
              </p>
            </div>
          ) : (
            paginatedTickets.map((ticket) => (
            <div key={ticket.id} className="p-6 hover:bg-secondary/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-muted-foreground">{ticket.id}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.priority === 'urgent' ? 'bg-destructive text-white' :
                      ticket.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                      ticket.priority === 'medium' ? 'bg-warning/10 text-warning' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ticket.status === 'resolved' ? 'bg-success/10 text-success' :
                      ticket.status === 'in_progress' ? 'bg-info/10 text-info' :
                      ticket.status === 'closed' ? 'bg-muted text-muted-foreground' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    {ticket.category && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                        {ticket.category.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{ticket.subject}</h3>
                  {ticket.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{ticket.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>From: <span className="text-foreground font-medium">{ticket.userName || 'Unknown'}</span></span>
                    <span>•</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {ticket.assignedToName && (
                      <>
                        <span>•</span>
                        <span>Assigned to: <span className="text-foreground font-medium">{ticket.assignedToName}</span></span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewTicket(ticket)}
                  >
                    View Details
                  </Button>
                  {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                    <Button 
                      size="sm"
                      onClick={() => handleRespondTicket(ticket)}
                    >
                      Respond
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
          )}
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredTickets.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </Card>
    </DashboardLayout>
  );
};

export default SupportTickets;
