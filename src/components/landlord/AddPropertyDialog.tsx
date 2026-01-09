import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Loader2, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { createProperty, uploadPropertyImages, updateProperty, createUnit } from "@/services/propertyService";
import { safeParseFloat, safeParseInt } from "@/lib/utils";

// Constants
const DEFAULT_TOTAL_UNITS = 1; // Default for single-unit properties
const DEFAULT_BEDROOMS = 2; // Default number of bedrooms for new units
const DEFAULT_BATHROOMS = 2; // Default number of bathrooms for new units
const MIN_BATHROOMS = 0.5; // Minimum number of bathrooms allowed

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPropertyAdded?: () => void;
}

export const AddPropertyDialog = ({ open, onOpenChange, onPropertyAdded }: AddPropertyDialogProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    type: "",
    description: "",
    totalUnits: "",
    amenities: "",
    // Unit details (for single-unit properties)
    createDefaultUnit: true,
    unitNumber: "1",
    bedrooms: "2",
    bathrooms: "2",
    rentAmount: "",
    squareFeet: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cleanup object URLs when images change or component unmounts
  useEffect(() => {
    return () => {
      images.forEach(file => {
        const url = URL.createObjectURL(file);
        URL.revokeObjectURL(url);
      });
    };
  }, [images]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.address || !formData.type) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Store validated numeric values for unit creation
    let validatedRentAmount: number | undefined;
    
    // Validate unit details if creating default unit
    if (formData.createDefaultUnit) {
      // Validate rent amount is a valid positive number
      validatedRentAmount = safeParseFloat(formData.rentAmount, { allowZero: false });
      if (!validatedRentAmount) {
        toast.error("Please provide a valid rent amount (must be greater than 0)");
        return;
      }

      // Validate bedrooms if provided
      if (formData.bedrooms) {
        const bedrooms = safeParseInt(formData.bedrooms, { allowZero: true });
        if (bedrooms === undefined || bedrooms < 0) {
          toast.error("Please provide a valid number of bedrooms (0 or more)");
          return;
        }
      }

      // Validate bathrooms if provided
      if (formData.bathrooms) {
        const bathrooms = safeParseFloat(formData.bathrooms, { allowZero: true });
        if (bathrooms === undefined || bathrooms < MIN_BATHROOMS) {
          toast.error(`Please provide a valid number of bathrooms (at least ${MIN_BATHROOMS})`);
          return;
        }
      }

      // Validate square feet if provided
      if (formData.squareFeet) {
        const squareFeet = safeParseInt(formData.squareFeet, { allowZero: false });
        if (!squareFeet) {
          toast.error("Please provide a valid square footage (must be greater than 0)");
          return;
        }
      }
    }

    // Validate total units if provided
    if (formData.totalUnits) {
      const totalUnits = safeParseInt(formData.totalUnits, { allowZero: false });
      if (!totalUnits || totalUnits < 1) {
        toast.error("Total units must be at least 1");
        return;
      }
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse amenities from comma-separated string to array
      const amenitiesArray = formData.amenities
        ? formData.amenities.split(',').map(a => a.trim()).filter(a => a.length > 0)
        : [];

      // Safely parse totalUnits with fallback to default
      const totalUnits = safeParseInt(formData.totalUnits, { allowZero: false }) ?? DEFAULT_TOTAL_UNITS;

      // Create property first
      const property = await createProperty(user.id, {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        propertyType: formData.type as 'apartment' | 'house' | 'condo' | 'townhouse',
        description: formData.description,
        totalUnits,
        amenities: amenitiesArray,
      });

      // Create default unit if requested (especially for single-unit properties)
      if (formData.createDefaultUnit && validatedRentAmount) {
        try {
          // Parse numeric values safely with fallbacks for optional fields
          const bedrooms = safeParseInt(formData.bedrooms, { allowZero: true }) ?? DEFAULT_BEDROOMS;
          const bathrooms = safeParseFloat(formData.bathrooms, { allowZero: true }) ?? DEFAULT_BATHROOMS;
          const squareFeet = formData.squareFeet ? safeParseInt(formData.squareFeet, { allowZero: false }) : undefined;

          await createUnit(property.id, {
            unitNumber: formData.unitNumber || "1",
            bedrooms,
            bathrooms,
            rentAmount: validatedRentAmount,
            squareFeet,
            features: amenitiesArray, // Use property amenities as unit features
            listingStatus: 'available', // Make it available by default
          });
          // Unit created successfully - no need to log in production
        } catch (unitError) {
          console.error('Failed to create default unit:', unitError);
          // Don't fail the entire operation if unit creation fails
          toast.warning("Property created but default unit creation failed. Please add units manually.");
        }
      }

      // Upload images if any
      let uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        try {
          uploadedImageUrls = await uploadPropertyImages(property.id, images);
          // Update property with image URLs in the database
          await updateProperty(property.id, { images: uploadedImageUrls });
          toast.success(`Property added successfully with ${uploadedImageUrls.length} image(s)!`);
        } catch (imageError) {
          console.error('Failed to upload images:', imageError);
          // Check if it's a storage bucket error
          const errorMessage = imageError instanceof Error ? imageError.message : String(imageError);
          if (errorMessage.includes('bucket') || errorMessage.includes('storage')) {
            toast.warning("Property added successfully! Note: Image upload requires storage bucket setup. See database/storage-buckets-setup.sql");
          } else {
            toast.warning("Property added but some images failed to upload");
          }
        }
      } else {
        toast.success("Property added successfully!");
      }
      
      // Reset form
      setFormData({
        name: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        type: "",
        description: "",
        totalUnits: "",
        amenities: "",
        createDefaultUnit: true,
        unitNumber: "1",
        bedrooms: "2",
        bathrooms: "2",
        rentAmount: "",
        squareFeet: "",
      });
      setImages([]);
      
      onPropertyAdded?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add property:', error);
      toast.error(error instanceof Error ? error.message : "Failed to add property");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Limit to 10 images
      if (files.length + images.length > 10) {
        toast.error("Maximum 10 images allowed");
        return;
      }
      setImages([...images, ...files]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
          <DialogDescription>
            Enter the details of your property. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Property Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sunset Apartments"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
                required
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>

            <div>
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="12345"
              />
            </div>

            <div>
              <Label htmlFor="type">Property Type *</Label>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your property..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="totalUnits">Total Units</Label>
              <Input
                id="totalUnits"
                type="number"
                min="1"
                max="500"
                value={formData.totalUnits}
                onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })}
                placeholder="10"
              />
            </div>

            <div>
              <Label htmlFor="amenities">Amenities (comma separated)</Label>
              <Input
                id="amenities"
                value={formData.amenities}
                onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                placeholder="Pool, Gym, Parking"
              />
            </div>

            {/* Unit Details Section */}
            <div className="col-span-2 pt-4 border-t">
              <h3 className="text-md font-semibold text-foreground mb-3">Unit Details</h3>
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox 
                  id="createDefaultUnit" 
                  checked={formData.createDefaultUnit}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, createDefaultUnit: checked as boolean })
                  }
                />
                <Label htmlFor="createDefaultUnit" className="font-medium cursor-pointer">
                  Create a default unit for this property (recommended for houses and single-unit properties)
                </Label>
              </div>

              {formData.createDefaultUnit && (
                <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-accent bg-accent/5 p-4 rounded-r-lg">
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Fill in the details for the unit. This makes your property immediately available for listing.
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="unitNumber">Unit Number</Label>
                    <Input
                      id="unitNumber"
                      value={formData.unitNumber}
                      onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                      placeholder="1 or A"
                    />
                  </div>

                  <div>
                    <Label htmlFor="rentAmount">Monthly Rent * (NGN)</Label>
                    <Input
                      id="rentAmount"
                      type="number"
                      min="0"
                      value={formData.rentAmount}
                      onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                      placeholder="150000"
                      required={formData.createDefaultUnit}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      min="0"
                      max="20"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="squareFeet">Square Feet (optional)</Label>
                    <Input
                      id="squareFeet"
                      type="number"
                      min="0"
                      value={formData.squareFeet}
                      onChange={(e) => setFormData({ ...formData, squareFeet: e.target.value })}
                      placeholder="1200"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor="images">Property Images (Max 10)</Label>
              <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <Input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label htmlFor="images" className="cursor-pointer">
                  <span className="text-sm text-muted-foreground">
                    Click to upload images or drag and drop (PNG, JPG up to 5MB each)
                  </span>
                </label>
                {images.length > 0 && (
                  <p className="text-sm text-accent font-medium mt-2">
                    {images.length} image(s) selected
                  </p>
                )}
              </div>
              
              {/* Image Previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {images.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                        {index + 1}
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
                  Adding...
                </>
              ) : (
                'Add Property'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
