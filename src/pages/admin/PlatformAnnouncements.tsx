/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Plus, Edit, Trash2, AlertCircle, CheckCircle, Info, AlertTriangle, Loader2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus,
  PlatformAnnouncement
} from "@/services/announcementService";

const PlatformAnnouncements = () => {
  const navLinks = useAdminNavigation();
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<PlatformAnnouncement | null>(null);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as PlatformAnnouncement['type'],
    targetAudience: "all" as PlatformAnnouncement['targetAudience'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    active: true
  });

  // Load announcements on mount
  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedAnnouncement(null);
    setFormData({
      title: "",
      message: "",
      type: "info",
      targetAudience: "all",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      active: true
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (announcement: PlatformAnnouncement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      targetAudience: announcement.targetAudience,
      startDate: announcement.startDate.split('T')[0],
      endDate: announcement.endDate ? announcement.endDate.split('T')[0] : "",
      active: announcement.active
    });
    setIsCreateDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.message) {
      toast.error("Title and message are required");
      return;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }
    
    try {
      if (selectedAnnouncement) {
        // Update existing announcement
        await updateAnnouncement(selectedAnnouncement.id, {
          title: formData.title,
          message: formData.message,
          type: formData.type,
          targetAudience: formData.targetAudience,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          active: formData.active
        });
        toast.success("Announcement updated successfully");
      } else {
        // Create new announcement
        await createAnnouncement({
          title: formData.title,
          message: formData.message,
          type: formData.type,
          targetAudience: formData.targetAudience,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          active: formData.active,
          createdBy: user.id
        }, user.id);
        toast.success("Announcement created successfully");
      }
      setIsCreateDialogOpen(false);
      await loadAnnouncements();
    } catch (error) {
      console.error('Failed to save announcement:', error);
      toast.error(`Failed to ${selectedAnnouncement ? 'update' : 'create'} announcement`);
    }
  };

  const handleDelete = async (announcement: PlatformAnnouncement) => {
    try {
      await deleteAnnouncement(announcement.id);
      toast.success(`Announcement "${announcement.title}" deleted successfully`);
      await loadAnnouncements();
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const handleToggleActive = async (announcement: PlatformAnnouncement) => {
    try {
      await toggleAnnouncementStatus(announcement.id, !announcement.active);
      toast.success(`Announcement ${announcement.active ? 'deactivated' : 'activated'}`);
      await loadAnnouncements();
    } catch (error) {
      console.error('Failed to toggle announcement status:', error);
      toast.error('Failed to toggle announcement status');
    }
  };

  const getTypeIcon = (type: PlatformAnnouncement['type']) => {
    const icons = {
      info: <Info className="w-5 h-5 text-info" />,
      success: <CheckCircle className="w-5 h-5 text-success" />,
      warning: <AlertTriangle className="w-5 h-5 text-warning" />,
      error: <AlertCircle className="w-5 h-5 text-destructive" />,
    };
    return icons[type];
  };

  const getTypeColor = (type: PlatformAnnouncement['type']) => {
    const colors = {
      info: 'bg-info/10 text-info border-info/20',
      success: 'bg-success/10 text-success border-success/20',
      warning: 'bg-warning/10 text-warning border-warning/20',
      error: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return colors[type];
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      pageTitle="Platform Announcements"
      pageDescription="Manage announcements and broadcasts to users"
    >
      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>
            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Announcement message"
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Select value={formData.targetAudience} onValueChange={(value) => setFormData({ ...formData, targetAudience: value as any })}>
                  <SelectTrigger id="audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="landlords">Landlords Only</SelectItem>
                    <SelectItem value="tenants">Tenants Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {selectedAnnouncement ? 'Update' : 'Create'} Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${announcements.filter(a => a.active).length} active announcements`}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Announcement
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loading && announcements.length === 0 && (
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No announcements yet</h3>
          <p className="text-muted-foreground mb-4">Create your first announcement to communicate with users</p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Announcement
          </Button>
        </Card>
      )}

      {/* Announcements List */}
      {!loading && announcements.length > 0 && (
        <div className="space-y-4">{announcements.map((announcement) => (
          <Card key={announcement.id} className={`p-6 border-2 ${getTypeColor(announcement.type)}`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                {getTypeIcon(announcement.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-foreground">{announcement.title}</h3>
                      {!announcement.active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {announcement.targetAudience.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground mb-3">{announcement.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Start: {format(new Date(announcement.startDate), 'MMM dd, yyyy')}</span>
                      {announcement.endDate && (
                        <>
                          <span>•</span>
                          <span>End: {format(new Date(announcement.endDate), 'MMM dd, yyyy')}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Created by {announcement.createdByName || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(announcement)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleToggleActive(announcement)}
                >
                  {announcement.active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(announcement)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PlatformAnnouncements;
