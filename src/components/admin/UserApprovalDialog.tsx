import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  Users,
  Home,
  AlertTriangle
} from "lucide-react";
import { type PendingUser } from "@/services/userApprovalService";
import { getRoleBadgeColor } from "@/lib/roleUtils";

interface UserApprovalDialogProps {
  user: PendingUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (userId: string, notes?: string) => Promise<void>;
  onReject: (userId: string, reason: string) => Promise<void>;
}

export const UserApprovalDialog = ({
  user,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: UserApprovalDialogProps) => {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setAction(null);
    setNotes("");
    setReason("");
    setError(null);
    onOpenChange(false);
  };

  const handleApprove = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await onApprove(user.id, notes);
      handleClose();
    } catch (err: unknown) {
      console.error('Failed to approve user:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve user');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user || !reason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await onReject(user.id, reason);
      handleClose();
    } catch (err: unknown) {
      console.error('Failed to reject user:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject user');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'tenant':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'landlord':
        return <Home className="h-5 w-5 text-green-500" />;
      case 'admin':
      case 'super_admin':
        return <Shield className="h-5 w-5 text-purple-500" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'approve' ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                Approve User Account
              </>
            ) : action === 'reject' ? (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Reject User Account
              </>
            ) : (
              <>
                <User className="h-5 w-5" />
                Review User Account
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === 'approve' && "Approve this user account to grant them access to the platform."}
            {action === 'reject' && "Reject this user account. They will not be able to access the platform."}
            {!action && "Review user details and decide whether to approve or reject this account."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              {getRoleIcon(user.role)}
              <div className="flex-1">
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                {user.role.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {user.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {user.profileComplete !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={user.profileComplete ? "default" : "outline"}>
                  Profile {user.profileComplete ? 'Complete' : 'Incomplete'}
                </Badge>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Forms */}
          {action === 'approve' && (
            <div className="space-y-2">
              <Label htmlFor="notes">Approval Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this approval..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                These notes will be logged in the audit trail.
              </p>
            </div>
          )}

          {action === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-destructive">
                Rejection Reason (Required) *
              </Label>
              <Textarea
                id="reason"
                placeholder="Explain why this account is being rejected..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
              />
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This action will ban the user account. They will not be able to access the platform.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Action Selection */}
          {!action && (
            <Alert>
              <AlertDescription>
                Review the user information above and choose an action below.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {!action ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setAction('reject')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => setAction('approve')}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          ) : action === 'approve' ? (
            <>
              <Button
                variant="outline"
                onClick={() => setAction(null)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={handleApprove}
                disabled={loading}
              >
                {loading ? 'Approving...' : 'Confirm Approval'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setAction(null)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={loading || !reason.trim()}
              >
                {loading ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
