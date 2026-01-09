import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Building, Home, User, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  type: string;
  total_units: number;
  landlord_id: string;
  landlord_name?: string;
  landlord_email?: string;
  images?: string[];
  created_at: string;
}

interface PropertyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  onViewUnits?: () => void;
}

export const PropertyDetailDialog = ({ 
  open, 
  onOpenChange, 
  property,
  onViewUnits
}: PropertyDetailDialogProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (!property) return null;

  const images = property.images || [];
  const hasImages = images.length > 0;

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setImageError(false);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setImageError(false);
  };

  const handleFlagImage = () => {
    toast.success('Image flagged for review');
    // Here you would typically call an API to flag the image
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{property.name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {property.city}, {property.state}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Property Images */}
          {hasImages && (
            <>
              <div className="relative">
                <div className="relative h-64 bg-secondary rounded-lg overflow-hidden">
                  {imageError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Building className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-sm">Image unavailable</p>
                    </div>
                  ) : (
                    <img
                      src={images[currentImageIndex]}
                      alt={`${property.name} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                  )}
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        onClick={handlePreviousImage}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={handleNextImage}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleFlagImage}
                  >
                    <Flag className="w-3 h-3 mr-1" />
                    Flag Image
                  </Button>
                </div>
                
                {/* Image Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto py-2">
                    {images.map((image, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                          idx === currentImageIndex ? 'border-accent' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Property Type Badge */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              {property.type}
            </Badge>
            <Badge variant="outline">
              <Home className="w-3 h-3 mr-1" />
              {property.total_units} Units
            </Badge>
          </div>

          <Separator />

          {/* Property Information */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Property Information</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">Address</div>
                  <div className="text-muted-foreground">{property.address}</div>
                  <div className="text-muted-foreground">{property.city}, {property.state}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">Property Type</div>
                  <div className="text-muted-foreground capitalize">{property.type}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Home className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">Total Units</div>
                  <div className="text-muted-foreground">{property.total_units}</div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Landlord Information */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Landlord Information</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="font-medium text-foreground">{property.landlord_name || 'Unknown'}</div>
                  <div className="text-muted-foreground">{property.landlord_email || 'No email'}</div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Property Details */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Property Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Property ID:</span>
                <div className="font-mono text-foreground text-xs">{property.id}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <div className="text-foreground">
                  {format(new Date(property.created_at), 'MMM dd, yyyy')}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4">
            {onViewUnits && (
              <Button onClick={onViewUnits} variant="default">
                <Home className="w-4 h-4 mr-2" />
                View Units
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
