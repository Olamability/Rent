import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { 
  MapPin, 
  Bed, 
  Bath, 
  Home, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Banknote,
  CheckCircle2
} from "lucide-react";
import { fetchPropertyById, fetchPropertyUnits, incrementUnitViewCount } from "@/services/propertyService";
import type { Property, Unit } from "@/services/propertyService";
import { useAuth } from "@/contexts/AuthContext";
import { tenantNavLinks } from "@/config/navigation";
import { ApplicationDialog } from "@/components/tenant/ApplicationDialog";

// Default fallback image for properties without images
const DEFAULT_PROPERTY_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop';

const TenantPropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<{ id: string; name: string; unitId: string } | null>(null);

  const loadPropertyDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const [propertyData, unitsData] = await Promise.all([
        fetchPropertyById(id),
        fetchPropertyUnits(id)
      ]);

      if (!propertyData) {
        setError("Property not found");
        return;
      }

      setProperty(propertyData);
      setUnits(unitsData);

      // Increment view count for each available unit (for analytics)
      // Use Promise.allSettled to prevent failures from blocking the UI
      const availableUnits = unitsData.filter(u => u.listingStatus === 'available');
      if (availableUnits.length > 0) {
        await Promise.allSettled(
          availableUnits.map(unit => incrementUnitViewCount(unit.id))
        );
      }
    } catch (err) {
      console.error('Error loading property details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load property details: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadPropertyDetails();
    }
  }, [id, loadPropertyDetails]);

  const handleApply = useCallback((unit: Unit) => {
    setSelectedUnit({
      id: property?.id || '',
      name: property?.name || '',
      unitId: unit.id
    });
    setIsApplicationDialogOpen(true);
  }, [property]);

  const nextImage = useCallback(() => {
    if (property?.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === property.images.length - 1 ? 0 : prev + 1
      );
    }
  }, [property?.images]);

  const prevImage = useCallback(() => {
    if (property?.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? property.images.length - 1 : prev - 1
      );
    }
  }, [property?.images]);

  // Keyboard navigation for image gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!property?.images || property.images.length <= 1) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevImage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextImage, prevImage, property?.images]);

  if (loading) {
    return (
      <DashboardLayout
        navLinks={tenantNavLinks}
        userName={user?.name || "User"}
        pageTitle="Property Details"
        pageDescription="Loading property information..."
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !property) {
    return (
      <DashboardLayout
        navLinks={tenantNavLinks}
        userName={user?.name || "User"}
        pageTitle="Property Details"
        pageDescription="Property not found"
      >
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Property Not Found</h2>
          <p className="text-muted-foreground mb-6">{error || "The property you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate('/tenant/search')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Property Search
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const images = property.images && property.images.length > 0 
    ? property.images 
    : [DEFAULT_PROPERTY_IMAGE];

  return (
    <DashboardLayout
      navLinks={tenantNavLinks}
      userName={user?.name || "User"}
      pageTitle="Property Details"
      pageDescription={property.name}
    >
      {/* Application Dialog */}
      {selectedUnit && (
        <ApplicationDialog
          open={isApplicationDialogOpen}
          onOpenChange={setIsApplicationDialogOpen}
          propertyName={selectedUnit.name}
          propertyId={selectedUnit.id}
          unitId={selectedUnit.unitId}
        />
      )}

      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate('/tenant/search')}
        className="mb-6"
        aria-label="Back to property search"
      >
        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
        Back to Property Search
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Images and Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <Card className="overflow-hidden">
            <div className="relative h-64 sm:h-80 md:h-96 bg-muted">
              <img
                src={images[currentImageIndex]}
                alt={`${property.name} - Image ${currentImageIndex + 1} of ${images.length}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background p-1.5 sm:p-2 rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label="Previous image"
                    type="button"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" aria-hidden="true" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background p-1.5 sm:p-2 rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label="Next image"
                    type="button"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" aria-hidden="true" />
                  </button>
                  
                  {/* Image Counter */}
                  <div 
                    className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-background/90 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}

              {/* Property Type Badge */}
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
                <Badge className="bg-accent text-accent-foreground text-xs sm:text-sm">
                  {property.propertyType}
                </Badge>
              </div>
            </div>
            
            {/* Thumbnail Gallery - Hidden on mobile */}
            {images.length > 1 && (
              <div className="hidden sm:block p-4" role="region" aria-label="Property image gallery">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative h-12 sm:h-16 rounded overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-accent ${
                        idx === currentImageIndex 
                          ? 'border-accent scale-105' 
                          : 'border-border hover:border-accent/50'
                      }`}
                      aria-label={`View image ${idx + 1} of ${images.length}`}
                      aria-current={idx === currentImageIndex}
                      type="button"
                    >
                      <img
                        src={img}
                        alt={`${property.name} thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Property Description */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{property.name}</h1>
              <div className="flex items-start text-muted-foreground mb-4">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm sm:text-base">{property.address}, {property.city}, {property.state} {property.zipCode}</span>
              </div>

              {property.description && (
                <div className="mb-6">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">About this property</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {property.description}
                  </p>
                </div>
              )}

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-3">Amenities</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    {property.amenities.map((amenity, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-accent flex-shrink-0" />
                        <span className="text-sm sm:text-base">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Available Units */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Available Units</h2>
              
              {units.length === 0 ? (
                <p className="text-sm sm:text-base text-muted-foreground">No units available at this time.</p>
              ) : (
                <div className="space-y-4">
                  {units.map((unit) => (
                    <Card key={unit.id} className="border-2">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-base sm:text-lg">Unit {unit.unitNumber}</h3>
                            <Badge 
                              variant={unit.listingStatus === 'available' ? 'default' : 'secondary'}
                              className="mt-1 text-xs"
                            >
                              {unit.listingStatus}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-xl sm:text-2xl font-bold text-accent">
                              {formatCurrency(unit.rentAmount)}
                            </div>
                            <div className="text-xs text-muted-foreground">per annum</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Bed className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                            <span className="text-xs sm:text-sm">{unit.bedrooms} Bed{unit.bedrooms > 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Bath className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                            <span className="text-xs sm:text-sm">{unit.bathrooms} Bath{unit.bathrooms > 1 ? 's' : ''}</span>
                          </div>
                          {unit.squareFeet && (
                            <div className="flex items-center gap-2 col-span-2">
                              <Home className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                              <span className="text-xs sm:text-sm">{unit.squareFeet} sqft</span>
                            </div>
                          )}
                        </div>

                        {unit.availableDate && (
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-4">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Available from {new Date(unit.availableDate).toLocaleDateString()}</span>
                          </div>
                        )}

                        {unit.deposit > 0 && (
                          <div className="flex items-center gap-2 text-xs sm:text-sm mb-4">
                            <Banknote className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                            <span>Deposit: {formatCurrency(unit.deposit)}</span>
                          </div>
                        )}

                        {unit.features && unit.features.length > 0 && (
                          <div className="mb-4">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">Unit Features</div>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              {unit.features.slice(0, 3).map((feature, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button 
                          className="w-full text-sm sm:text-base" 
                          onClick={() => handleApply(unit)}
                          disabled={unit.listingStatus !== 'available'}
                        >
                          {unit.listingStatus === 'available' ? 'Apply Now' : 'Not Available'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Contact Information */}
              <div className="mt-6 p-3 sm:p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-sm sm:text-base mb-3">Interested in this property?</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Click 'Apply Now' on any available unit to start your application.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TenantPropertyDetails;
