/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Save, Plus, Edit, Trash2, Filter
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchBar } from "@/components/admin/SearchBar";
import { SystemConfig } from "@/types/admin";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { 
  fetchSystemConfigs, 
  createSystemConfig, 
  updateSystemConfig, 
  deleteSystemConfig 
} from "@/services/systemConfigService";
import { supabase } from "@/lib/supabase";

const SystemConfiguration = () => {
  const navLinks = useAdminNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SystemConfig | null>(null);
  const [formData, setFormData] = useState({ 
    key: "", 
    value: "", 
    description: "", 
    category: "general" as SystemConfig['category'],
    isSensitive: false
  });
  const [allConfigs, setAllConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch configurations from database
  useEffect(() => {
    fetchConfigs();
  }, [categoryFilter]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const configs = await fetchSystemConfigs({
        category: categoryFilter !== 'all' ? categoryFilter : undefined
      });
      setAllConfigs(configs);
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast.error('Failed to load system configurations');
    } finally {
      setLoading(false);
    }
  };

  const filteredConfigs = useMemo(() => {
    let result = allConfigs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(config => 
        config.key.toLowerCase().includes(query) ||
        (config.description && config.description.toLowerCase().includes(query)) ||
        config.value.toLowerCase().includes(query)
      );
    }

    // categoryFilter is already applied in the fetchConfigs function

    return result;
  }, [allConfigs, searchQuery]);

  const handleEdit = (config: SystemConfig) => {
    setSelectedConfig(config);
    setFormData({
      key: config.key,
      value: config.value,
      description: config.description || "",
      category: config.category,
      isSensitive: config.isSensitive
    });
    setIsEditDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedConfig(null);
    setFormData({
      key: "",
      value: "",
      description: "",
      category: "general",
      isSensitive: false
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.key || !formData.value) {
      toast.error("Key and value are required");
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      if (selectedConfig) {
        // Update existing config
        await updateSystemConfig(selectedConfig.id, {
          value: formData.value,
          description: formData.description || undefined,
          category: formData.category,
          isSensitive: formData.isSensitive,
        }, user.id);
        toast.success('Configuration updated successfully');
      } else {
        // Create new config
        await createSystemConfig({
          key: formData.key,
          value: formData.value,
          description: formData.description || undefined,
          category: formData.category,
          isSensitive: formData.isSensitive,
        }, user.id);
        toast.success('Configuration created successfully');
      }
      
      setIsEditDialogOpen(false);
      setSelectedConfig(null);
      setFormData({ key: "", value: "", description: "", category: "general", isSensitive: false });
      fetchConfigs(); // Reload configs
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    }
  };

  const handleDeleteClick = (config: SystemConfig) => {
    setSelectedConfig(config);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedConfig) return;
    
    try {
      await deleteSystemConfig(selectedConfig.id);
      toast.success(`Configuration ${selectedConfig.key} deleted successfully`);
      setIsDeleteDialogOpen(false);
      setSelectedConfig(null);
      fetchConfigs(); // Reload configs
    } catch (error) {
      console.error('Error deleting config:', error);
      toast.error('Failed to delete configuration');
    }
  };

  const getCategoryColor = (category: SystemConfig['category']) => {
    const colors = {
      general: 'bg-secondary text-secondary-foreground',
      payment: 'bg-success/10 text-success',
      email: 'bg-info/10 text-info',
      security: 'bg-destructive/10 text-destructive',
      features: 'bg-accent/10 text-accent',
    };
    return colors[category];
  };

  return (
    <DashboardLayout
      navLinks={navLinks}
      pageTitle="System Configuration"
      pageDescription="Manage platform settings and configurations"
    >
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedConfig ? 'Edit Configuration' : 'New Configuration'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="key">Key *</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="CONFIG_KEY"
                disabled={!!selectedConfig}
              />
            </div>
            <div>
              <Label htmlFor="value">Value *</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Configuration value"
                type={formData.isSensitive ? "password" : "text"}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this configuration does"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as any })}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="feature_flags">Feature Flags</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search configurations..."
            className="flex-1 max-w-md"
          />
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Configuration
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="features">Features</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Configurations List */}
      <div className="space-y-4">
        {Object.entries(
          filteredConfigs.reduce((acc, config) => {
            if (!acc[config.category]) acc[config.category] = [];
            acc[config.category].push(config);
            return acc;
          }, {} as Record<string, SystemConfig[]>)
        ).map(([category, configs]) => (
          <Card key={category} className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 capitalize flex items-center gap-2">
              {category}
              <Badge className={getCategoryColor(category as SystemConfig['category'])}>
                {configs.length}
              </Badge>
            </h3>
            <div className="space-y-3">
              {configs.map((config) => (
                <div key={config.id} className="p-4 border border-border rounded-md hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <code className="text-sm font-mono font-semibold text-foreground">{config.key}</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{config.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Value: <code className="text-foreground font-mono bg-secondary px-2 py-1 rounded">{config.value}</code></span>
                        <span>•</span>
                        <span>Updated by {config.updatedBy} on {new Date(config.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(config)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default SystemConfiguration;
