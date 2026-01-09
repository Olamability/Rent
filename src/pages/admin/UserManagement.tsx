import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  CheckCircle2, XCircle, Download, Trash2, Ban, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FraudFlagDialog } from "@/components/admin/FraudFlagDialog";
import { UserDetailDialog } from "@/components/admin/UserDetailDialog";
import { UserEditDialog } from "@/components/admin/UserEditDialog";
import { SearchBar } from "@/components/admin/SearchBar";
import { UserFiltersBar } from "@/components/admin/UserFiltersBar";
import { TablePagination } from "@/components/admin/TablePagination";
import { User, UserFilters } from "@/types/admin";
import { toast } from "sonner";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { 
  fetchUsers, 
  searchUsers, 
  exportUsersAsCSV,
  approveUser,
  suspendUser,
  banUser,
  reactivateUser,
  deleteUser,
  updateUser,
  bulkDeleteUsers,
  bulkSuspendUsers
} from "@/services/userManagementService";
import { useAuth } from "@/contexts/AuthContext";

const UserManagement = () => {
  const navLinks = useAdminNavigation();
  const { user: currentUser } = useAuth();
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<UserFilters>({});
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch users on mount and when filters change
  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        setLoading(true);
        let users: User[];
        
        // If there's a search query, use search, otherwise use filters
        if (searchQuery.trim()) {
          users = await searchUsers(searchQuery);
        } else {
          users = await fetchUsers(filters);
        }
        
        if (isMounted) {
          setAllUsers(users);
        }
      } catch (err) {
        console.error('Failed to load users:', err);
        if (isMounted) {
          toast.error('Failed to load users');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, filters]);
  
  // Filter and search logic (using already filtered data from API)
  const filteredUsers = allUsers;

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsDetailDialogOpen(true);
  };

  const handleFlagUser = (user: User) => {
    setSelectedUser(user);
    setIsFlagDialogOpen(true);
  };

  // Helper function to reload users after status change
  const reloadUsers = async () => {
    try {
      const users = searchQuery.trim() 
        ? await searchUsers(searchQuery) 
        : await fetchUsers(filters);
      setAllUsers(users);
    } catch (error) {
      console.error('Error reloading users:', error);
    }
  };

  const handleApproveUser = async () => {
    if (!selectedUser || !currentUser) return;
    
    try {
      await approveUser(selectedUser.id, currentUser.id);
      toast.success(`${selectedUser.name}'s account has been approved`);
      setIsDetailDialogOpen(false);
      await reloadUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;
    
    try {
      await suspendUser(selectedUser.id);
      toast.success(`${selectedUser.name}'s account has been suspended`);
      setIsDetailDialogOpen(false);
      await reloadUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    
    try {
      await banUser(selectedUser.id);
      toast.success(`${selectedUser.name}'s account has been banned`);
      setIsDetailDialogOpen(false);
      await reloadUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleReactivateUser = async () => {
    if (!selectedUser) return;
    
    try {
      await reactivateUser(selectedUser.id);
      toast.success(`${selectedUser.name}'s account has been reactivated`);
      setIsDetailDialogOpen(false);
      await reloadUsers();
    } catch (error) {
      console.error('Error reactivating user:', error);
      toast.error('Failed to reactivate user');
    }
  };

  const handleEditUser = async (updates: Partial<User>) => {
    if (!selectedUser) return;
    
    try {
      await updateUser(selectedUser.id, updates);
      toast.success(`${selectedUser.name}'s details have been updated`);
      setIsEditDialogOpen(false);
      await reloadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await deleteUser(selectedUser.id);
      toast.success(`${selectedUser.name} has been deleted`);
      setIsDeleteDialogOpen(false);
      setIsDetailDialogOpen(false);
      await reloadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected");
      return;
    }
    
    try {
      await bulkDeleteUsers(selectedUsers);
      toast.success(`${selectedUsers.length} users deleted successfully`);
      setIsBulkDeleteDialogOpen(false);
      setSelectedUsers([]);
      await reloadUsers();
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      toast.error('Failed to delete users');
    }
  };

  const handleBulkSuspend = async () => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected");
      return;
    }
    
    try {
      await bulkSuspendUsers(selectedUsers);
      toast.success(`${selectedUsers.length} users suspended successfully`);
      setSelectedUsers([]);
      await reloadUsers();
    } catch (error) {
      console.error('Error bulk suspending users:', error);
      toast.error('Failed to suspend users');
    }
  };

  const handleExportUsers = async () => {
    try {
      const csvContent = await exportUsersAsCSV(allUsers);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("User data exported successfully");
    } catch (error) {
      console.error('Error exporting users:', error);
      toast.error('Failed to export users');
    }
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery("");
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      pageTitle="User Management"
      pageDescription="Manage platform users"
    >
      {selectedUser && (
        <>
          <FraudFlagDialog
            open={isFlagDialogOpen}
            onOpenChange={setIsFlagDialogOpen}
            user={selectedUser}
            onFlagUser={() => {/* User flagged */}}
          />
          <UserEditDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            user={selectedUser}
            onSave={handleEditUser}
          />
          <UserDetailDialog
            open={isDetailDialogOpen}
            onOpenChange={setIsDetailDialogOpen}
            user={selectedUser}
            onEdit={() => setIsEditDialogOpen(true)}
            onApprove={handleApproveUser}
            onSuspend={handleSuspendUser}
            onBan={handleBanUser}
            onReactivate={handleReactivateUser}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedUser?.name}'s account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Users?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedUsers.length} user(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header with Search and Actions */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name, email, or ID..."
            className="flex-1 max-w-md"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportUsers}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {selectedUsers.length > 0 && (
              <>
                <Button variant="outline" onClick={handleBulkSuspend}>
                  <Ban className="w-4 h-4 mr-2" />
                  Suspend ({selectedUsers.length})
                </Button>
                <Button variant="destructive" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedUsers.length})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <UserFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* User Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary/30">
                <tr className="text-left">
                  <th className="p-3 sm:p-4 sticky left-0 bg-secondary/30 z-10">
                    <Checkbox
                      checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 sm:p-4 font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">Name</th>
                  <th className="p-3 sm:p-4 font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">Email</th>
                  <th className="p-3 sm:p-4 font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">Role</th>
                  <th className="p-3 sm:p-4 font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">Status</th>
                  <th className="p-3 sm:p-4 font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">Verified</th>
                  <th className="p-3 sm:p-4 font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">KYC</th>
                  <th className="p-3 sm:p-4 font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                      </div>
                    </td>
                  </tr>
                ) : paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="p-3 sm:p-4 sticky left-0 bg-card hover:bg-secondary/50 z-10">
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                      />
                    </td>
                    <td className="p-3 sm:p-4 text-foreground font-medium text-xs sm:text-sm whitespace-nowrap">{user.name}</td>
                    <td className="p-3 sm:p-4 text-foreground text-xs sm:text-sm whitespace-nowrap">{user.email}</td>
                    <td className="p-3 sm:p-4">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        user.role === 'landlord' ? 'bg-accent/10 text-accent' : 
                        user.role === 'tenant' ? 'bg-info/10 text-info' :
                        'bg-secondary text-secondary-foreground'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        user.status === 'active' ? 'bg-success/10 text-success' : 
                        user.status === 'pending' ? 'bg-warning/10 text-warning' :
                        user.status === 'suspended' ? 'bg-destructive/10 text-destructive' :
                        'bg-secondary text-secondary-foreground'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-3 sm:p-4">
                      {user.verified ? (
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                      )}
                    </td>
                    <td className="p-3 sm:p-4 hidden md:table-cell">
                      {user.kycStatus && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          user.kycStatus === 'approved' ? 'bg-success/10 text-success' :
                          user.kycStatus === 'pending' ? 'bg-warning/10 text-warning' :
                          'bg-destructive/10 text-destructive'
                        }`}>
                          {user.kycStatus}
                        </span>
                      )}
                    </td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <div className="flex gap-1 sm:gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewUser(user)}
                          className="text-xs h-8"
                        >
                          View
                        </Button>
                        {!user.verified && (
                          <Button 
                            size="sm"
                            onClick={() => toast.success(`${user.name} has been approved`)}
                            className="text-xs h-8 hidden sm:inline-flex"
                          >
                            Approve
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleFlagUser(user)}
                          title="Flag for fraud"
                          className="h-8 w-8 p-0"
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredUsers.length}
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

export default UserManagement;
