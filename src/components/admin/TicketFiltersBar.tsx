/* eslint-disable @typescript-eslint/no-explicit-any */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TicketFilters } from "@/types/admin";
import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TicketFiltersBarProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  onClearFilters: () => void;
}

export const TicketFiltersBar = ({ filters, onFiltersChange, onClearFilters }: TicketFiltersBarProps) => {
  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-secondary/30 rounded-md">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Filter className="w-4 h-4" />
        Filters
        {activeFiltersCount > 0 && (
          <Badge variant="default" className="ml-1">
            {activeFiltersCount}
          </Badge>
        )}
      </div>

      <Select
        value={filters.priority || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, priority: value === 'all' ? undefined : value as any })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? undefined : value as any })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.category || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, category: value === 'all' ? undefined : value as any })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="technical">Technical</SelectItem>
          <SelectItem value="billing">Billing</SelectItem>
          <SelectItem value="general">General</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
          <SelectItem value="feature_request">Feature Request</SelectItem>
          <SelectItem value="complaint">Complaint</SelectItem>
        </SelectContent>
      </Select>

      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  );
};
