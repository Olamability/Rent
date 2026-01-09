import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User } from "@/types/admin";
import { Mail, Phone, MapPin, Calendar, Shield, CheckCircle2, XCircle, Ban, Unlock } from "lucide-react";
import { format } from "date-fns";

interface UserDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onEdit?: () => void;
  onApprove?: () => void;
  onSuspend?: () => void;
  onBan?: () => void;
  onReactivate?: () => void;
  onDelete?: () => void;
}

export const UserDetailDialog = ({ 
  open, 
  onOpenChange, 
  user,
  onEdit,
  onApprove,
  onSuspend,
  onBan,
  onReactivate,
  onDelete
}: UserDetailDialogProps) => {
  if (!user) return null;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'suspended':
        return 'outline';
      case 'banned':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={getStatusBadgeVariant(user.status)}>
              {user.status}
            </Badge>
            <Badge variant={user.role === 'landlord' ? 'default' : 'outline'}>
              {user.role}
            </Badge>
            {user.verified && (
              <Badge variant="default" className="bg-success text-white">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
            {user.kycStatus && (
              <Badge variant={user.kycStatus === 'approved' ? 'default' : 'secondary'}>
                KYC: {user.kycStatus}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Contact Information</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{user.phone}</span>
                </div>
              )}
              {user.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{user.address}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Account Details */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Account Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">User ID:</span>
                <div className="font-mono text-foreground">{user.id}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <div className="text-foreground">
                  {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                </div>
              </div>
              {user.lastLogin && (
                <div>
                  <span className="text-muted-foreground">Last Login:</span>
                  <div className="text-foreground">
                    {format(new Date(user.lastLogin), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fraud Flags */}
          {user.fraudFlags && user.fraudFlags.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-destructive" />
                  Fraud Flags ({user.fraudFlags.length})
                </h4>
                <div className="space-y-2">
                  {user.fraudFlags.map((flag) => (
                    <div key={flag.id} className="p-3 bg-destructive/5 border border-destructive/20 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="destructive" className="text-xs">
                          {flag.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(flag.flaggedAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{flag.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Flagged by: {flag.flaggedBy}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4">
            {onEdit && (
              <Button onClick={onEdit} variant="default">
                Edit User
              </Button>
            )}
            {onApprove && user.status === 'pending' && (
              <Button onClick={onApprove} variant="default" className="bg-success hover:bg-success/90">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Account
              </Button>
            )}
            {onReactivate && (user.status === 'suspended' || user.status === 'banned') && (
              <Button onClick={onReactivate} variant="default" className="bg-success hover:bg-success/90">
                <Unlock className="w-4 h-4 mr-2" />
                Reactivate Account
              </Button>
            )}
            {onSuspend && user.status !== 'suspended' && user.status !== 'banned' && (
              <Button onClick={onSuspend} variant="outline">
                <XCircle className="w-4 h-4 mr-2" />
                Suspend Account
              </Button>
            )}
            {onBan && user.status !== 'banned' && (
              <Button onClick={onBan} variant="destructive">
                <Ban className="w-4 h-4 mr-2" />
                Ban Account
              </Button>
            )}
            {onDelete && (
              <Button onClick={onDelete} variant="destructive">
                Delete User
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
