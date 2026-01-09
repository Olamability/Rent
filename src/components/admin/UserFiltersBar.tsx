/* eslint-disable @typescript-eslint/no-explicit-any */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserFilters } from "@/types/admin";
import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserFiltersBarProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onClearFilters: () => void;
}

export const UserFiltersBar = ({ filters, onFiltersChange, onClearFilters }: UserFiltersBarProps) => {
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
        value={filters.role || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, role: value === 'all' ? undefined : value as any })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="landlord">Landlord</SelectItem>
          <SelectItem value="tenant">Tenant</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
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
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.verified === undefined ? 'all' : filters.verified ? 'verified' : 'unverified'}
        onValueChange={(value) => onFiltersChange({ 
          ...filters, 
          verified: value === 'all' ? undefined : value === 'verified' 
        })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Verification" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Users</SelectItem>
          <SelectItem value="verified">Verified</SelectItem>
          <SelectItem value="unverified">Unverified</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.kycStatus || 'all'}
        onValueChange={(value) => onFiltersChange({ ...filters, kycStatus: value === 'all' ? undefined : value as any })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="KYC Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All KYC</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
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
