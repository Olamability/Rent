import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Download, Filter, FileText
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/admin/SearchBar";
import { TablePagination } from "@/components/admin/TablePagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { fetchAuditLogs, exportAuditLogsToCSV, type AuditLogEntry } from "@/services/auditLogService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const AuditLogPage = () => {
  const navLinks = useAdminNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch logs when filters or pagination changes
  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter, resourceFilter, currentPage, pageSize]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: Record<string, string> = {};
      if (actionFilter !== 'all') {
        filters.action = actionFilter;
      }
      if (resourceFilter !== 'all') {
        filters.entityType = resourceFilter;
      }

      const result = await fetchAuditLogs(filters, currentPage, pageSize);
      
      if (result.error) {
        setError(result.error);
        setLogs([]);
        setTotalCount(0);
      } else {
        setLogs(result.logs);
        setTotalCount(result.total);
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError('Failed to load audit logs');
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Filter logs by search query (client-side filtering on displayed results)
  const filteredLogs = useMemo(() => {
    if (!searchQuery) {
      return logs;
    }

    const query = searchQuery.toLowerCase();
    return logs.filter(log => 
      log.action.toLowerCase().includes(query) ||
      log.admin_name?.toLowerCase().includes(query) ||
      log.entity_id?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleExport = async () => {
    try {
      const csvContent = exportAuditLogsToCSV(logs);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Audit logs exported successfully");
    } catch (error) {
      toast.error("Failed to export audit logs");
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setActionFilter("all");
    setResourceFilter("all");
  };

  const getActionColor = (action: string) => {
    if (action.includes("Delete") || action.includes("Suspend") || action.includes("Flag")) {
      return "bg-destructive/10 text-destructive";
    }
    if (action.includes("Create") || action.includes("Approve")) {
      return "bg-success/10 text-success";
    }
    if (action.includes("Update")) {
      return "bg-info/10 text-info";
    }
    return "bg-secondary text-secondary-foreground";
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      pageTitle="Audit Log"
      pageDescription="Track all administrative actions and changes"
    >
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by action, admin, or resource ID..."
            className="flex-1 max-w-md"
          />
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 bg-secondary/30 rounded-md">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="Create">Create</SelectItem>
              <SelectItem value="Update">Update</SelectItem>
              <SelectItem value="Delete">Delete</SelectItem>
              <SelectItem value="Suspend">Suspend</SelectItem>
              <SelectItem value="Approve">Approve</SelectItem>
              <SelectItem value="Flag">Flag</SelectItem>
            </SelectContent>
          </Select>

          <Select value={resourceFilter} onValueChange={setResourceFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="User">User</SelectItem>
              <SelectItem value="Subscription">Subscription</SelectItem>
              <SelectItem value="Ticket">Ticket</SelectItem>
              <SelectItem value="Config">Configuration</SelectItem>
              <SelectItem value="EmailTemplate">Email Template</SelectItem>
            </SelectContent>
          </Select>

          {(actionFilter !== 'all' || resourceFilter !== 'all' || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="p-4 font-semibold text-foreground">Timestamp</th>
                <th className="p-4 font-semibold text-foreground">Admin</th>
                <th className="p-4 font-semibold text-foreground">Action</th>
                <th className="p-4 font-semibold text-foreground">Resource</th>
                <th className="p-4 font-semibold text-foreground">Changes</th>
                <th className="p-4 font-semibold text-foreground">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/50">
                    <td className="p-4 text-foreground">
                      <div className="text-sm">
                        {format(new Date(log.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-foreground">{log.admin_name}</div>
                      <div className="text-xs text-muted-foreground">{log.admin_id}</div>
                    </td>
                    <td className="p-4">
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-foreground">{log.entity_type}</div>
                      {log.entity_id && (
                        <div className="text-xs text-muted-foreground font-mono">{log.entity_id}</div>
                      )}
                    </td>
                    <td className="p-4">
                      {log.changes ? (
                        <div className="text-xs font-mono space-y-1">
                          {Object.entries(log.changes).map(([key, value]) => {
                            // Check if value is a change object with from/to properties
                            const isChangeObject = typeof value === 'object' && 
                                                   value !== null && 
                                                   'from' in value && 
                                                   'to' in value;
                            return (
                              <div key={key} className="text-muted-foreground">
                                <span className="font-semibold">{key}:</span>{" "}
                                {isChangeObject ? (
                                  <>
                                    <span className="text-destructive">
                                      {String((value as { from: unknown; to: unknown }).from)}
                                    </span>
                                    {" → "}
                                    <span className="text-success">
                                      {String((value as { from: unknown; to: unknown }).to)}
                                    </span>
                                  </>
                                ) : (
                                  <span>{JSON.stringify(value)}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground font-mono">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredLogs.length}
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

export default AuditLogPage;
