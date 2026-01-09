import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Phone,
  Mail,
  CheckCircle2
} from "lucide-react";
import { fetchPropertyById, fetchPropertyUnits, incrementUnitViewCount } from "@/services/propertyService";
import type { Property, Unit } from "@/services/propertyService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      loadPropertyDetails();
    }
  }, [id]);

  const loadPropertyDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
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
      setError(null);

      // Increment view count for each available unit (for analytics)
      const availableUnits = unitsData.filter(u => u.listingStatus === 'available');
      if (availableUnits.length > 0) {
        // Increment view count for all available units in parallel
        // This provides more accurate analytics when multiple units are shown
        await Promise.allSettled(
          availableUnits.map(unit => incrementUnitViewCount(unit.id))
        );
      }
    } catch (err) {
      console.error('Error loading property details:', err);
      setError('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (unitId: string) => {
    if (!isAuthenticated) {
      toast.info('Please sign in or register to apply for this property', {
        duration: 4000,
        position: 'top-center',
      });
      navigate('/register', { 
        state: { 
          from: `/property/${id}`,
          propertyId: id,
          unitId 
        } 
      });
    } else {
      // Navigate to application page
      navigate('/tenant/search', { 
        state: { 
          applyToUnit: unitId,
          propertyId: id
        } 
      });
    }
  };

  const nextImage = () => {
    if (property?.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === property.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (property?.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? property.images.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Property Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || "The property you're looking for doesn't exist."}</p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const images = property.images && property.images.length > 0 
    ? property.images 
    : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop'];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Properties
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card className="overflow-hidden">
              <div className="relative h-96 bg-muted">
                <img
                  src={images[currentImageIndex]}
                  alt={`${property.name} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Image Navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background p-2 rounded-full shadow-lg"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background p-2 rounded-full shadow-lg"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    
                    {/* Image Counter */}
                    <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}

                {/* Property Type Badge */}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-accent text-accent-foreground">
                    {property.propertyType}
                  </Badge>
                </div>
              </div>
              
              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="p-4 grid grid-cols-6 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative h-16 rounded overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex 
                          ? 'border-accent scale-105' 
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Property Description */}
            <Card>
              <CardContent className="p-6">
                <h1 className="text-3xl font-bold mb-2">{property.name}</h1>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{property.address}, {property.city}, {property.state} {property.zipCode}</span>
                </div>

                {property.description && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">About this property</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {property.description}
                    </p>
                  </div>
                )}

                {/* Amenities */}
                {property.amenities && property.amenities.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {property.amenities.map((amenity, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-accent" />
                          <span>{amenity}</span>
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
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4">Available Units</h2>
                
                {units.length === 0 ? (
                  <p className="text-muted-foreground">No units available at this time.</p>
                ) : (
                  <div className="space-y-4">
                    {units.map((unit) => (
                      <Card key={unit.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">Unit {unit.unitNumber}</h3>
                              <Badge 
                                variant={unit.listingStatus === 'available' ? 'default' : 'secondary'}
                                className="mt-1"
                              >
                                {unit.listingStatus}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-accent">
                                {formatCurrency(unit.rentAmount)}
                              </div>
                              <div className="text-xs text-muted-foreground">per annum</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2">
                              <Bed className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{unit.bedrooms} Bed{unit.bedrooms > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Bath className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{unit.bathrooms} Bath{unit.bathrooms > 1 ? 's' : ''}</span>
                            </div>
                            {unit.squareFeet && (
                              <div className="flex items-center gap-2 col-span-2">
                                <Home className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{unit.squareFeet} sqft</span>
                              </div>
                            )}
                          </div>

                          {unit.availableDate && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                              <Calendar className="w-4 h-4" />
                              <span>Available from {new Date(unit.availableDate).toLocaleDateString()}</span>
                            </div>
                          )}

                          {unit.deposit > 0 && (
                            <div className="flex items-center gap-2 text-sm mb-4">
                              <Banknote className="w-4 h-4 text-muted-foreground" />
                              <span>Deposit: {formatCurrency(unit.deposit)}</span>
                            </div>
                          )}

                          {unit.features && unit.features.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Unit Features</div>
                              <div className="flex flex-wrap gap-2">
                                {unit.features.slice(0, 3).map((feature, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button 
                            className="w-full" 
                            onClick={() => handleApply(unit.id)}
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
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-3">Interested in this property?</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {isAuthenticated 
                      ? "Click 'Apply Now' on any available unit to start your application."
                      : "Sign in or create an account to apply for this property."}
                  </p>
                  {!isAuthenticated && (
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/register', { 
                          state: { from: `/property/${id}` } 
                        })}
                      >
                        Create Account
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => navigate('/login', { 
                          state: { from: `/property/${id}` } 
                        })}
                      >
                        Sign In
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PropertyDetails;
