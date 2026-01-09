import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, X, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PropertyWithUnit, updateProperty, uploadPropertyImages, deletePropertyImage } from "@/services/propertyService";

interface EditPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: PropertyWithUnit | null;
  onPropertyUpdated?: () => void;
}

export const EditPropertyDialog = ({ open, onOpenChange, property, onPropertyUpdated }: EditPropertyDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    type: "",
    description: "",
    amenities: "",
  });
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cleanup object URLs when new images change or component unmounts
  useEffect(() => {
    return () => {
      newImages.forEach(file => {
        const url = URL.createObjectURL(file);
        URL.revokeObjectURL(url);
      });
    };
  }, [newImages]);

  // Update form when property changes
  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        address: property.address,
        city: property.city || "",
        state: property.state || "",
        zipCode: property.zipCode || "",
        type: property.propertyType,
        description: property.description || "",
        amenities: property.amenities?.join(", ") || "",
      });
      setExistingImages(property.images || []);
      setNewImages([]);
    }
  }, [property]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!property) return;

    // Validation
    if (!formData.name || !formData.address || !formData.type) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse amenities from comma-separated string to array
      const amenitiesArray = formData.amenities
        ? formData.amenities.split(',').map(a => a.trim()).filter(a => a.length > 0)
        : [];

      // Upload new images if any
      let uploadedImageUrls: string[] = [];
      if (newImages.length > 0) {
        try {
          uploadedImageUrls = await uploadPropertyImages(property.id, newImages);
        } catch (imageError) {
          console.error('Failed to upload images:', imageError);
          toast.warning("Some images failed to upload");
        }
      }

      // Combine existing and new image URLs
      const allImages = [...existingImages, ...uploadedImageUrls];

      // Update property
      await updateProperty(property.id, {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        propertyType: formData.type as 'apartment' | 'house' | 'condo' | 'townhouse',
        description: formData.description,
        amenities: amenitiesArray,
        images: allImages,
      });

      toast.success("Property updated successfully!");
      
      onPropertyUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update property:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update property");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const totalImages = existingImages.length + newImages.length + files.length;
      
      if (totalImages > 10) {
        toast.error("Maximum 10 images allowed per property");
        return;
      }
      
      setNewImages([...newImages, ...files]);
    }
  };

  const removeExistingImage = async (imageUrl: string, index: number) => {
    if (!property) return;
    
    try {
      // Delete from storage
      await deletePropertyImage(property.id, imageUrl);
      
      // Remove from local state
      const updatedImages = existingImages.filter((_, i) => i !== index);
      setExistingImages(updatedImages);
      
      toast.success("Image removed successfully");
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error("Failed to remove image");
    }
  };

  const removeNewImage = (index: number) => {
    setNewImages(newImages.filter((_, i) => i !== index));
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Property</DialogTitle>
          <DialogDescription>
            Update your property details and manage images. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit-name">Property Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sunset Apartments"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit-address">Address *</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div>
              <Label htmlFor="edit-state">State</Label>
              <Input
                id="edit-state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>

            <div>
              <Label htmlFor="edit-zipCode">Zip Code</Label>
              <Input
                id="edit-zipCode"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="12345"
              />
            </div>

            <div>
              <Label htmlFor="edit-type">Property Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your property..."
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit-amenities">Amenities (comma separated)</Label>
              <Input
                id="edit-amenities"
                value={formData.amenities}
                onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                placeholder="Pool, Gym, Parking"
              />
            </div>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className="col-span-2">
                <Label>Current Images ({existingImages.length})</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {existingImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Property ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(url, index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        title="Delete image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Images */}
            <div className="col-span-2">
              <Label htmlFor="new-images">
                Add More Images {existingImages.length + newImages.length < 10 && `(${10 - existingImages.length - newImages.length} remaining)`}
              </Label>
              <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <Input
                  id="new-images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleNewImageChange}
                  className="hidden"
                  disabled={existingImages.length + newImages.length >= 10}
                />
                <label htmlFor="new-images" className={existingImages.length + newImages.length >= 10 ? "cursor-not-allowed" : "cursor-pointer"}>
                  <span className="text-sm text-muted-foreground">
                    {existingImages.length + newImages.length >= 10 
                      ? "Maximum images reached" 
                      : "Click to upload more images (PNG, JPG up to 5MB each)"}
                  </span>
                </label>
              </div>

              {/* New Image Previews */}
              {newImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {newImages.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`New ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-accent/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-accent-foreground">
                        New
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
