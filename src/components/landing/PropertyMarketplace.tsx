import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { 
  MapPin, 
  Bed, 
  Bath, 
  Home, 
  ArrowRight,
  Heart,
  Eye,
  Search,
  Filter,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Info,
  Wifi
} from "lucide-react";
import { fetchPublicMarketplaceListings } from "@/services/propertyService";
import type { MarketplaceListing } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const PropertyMarketplace = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await fetchPublicMarketplaceListings(12); // Show 12 properties on homepage
      setListings(data);
      setError(null);
    } catch (err) {
      console.error('Error loading listings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Provide user-friendly error messages based on error type
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        setError('The property listings database has not been set up. Please contact your administrator.');
      } else {
        setError('Failed to load available properties. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyClick = (listing: MarketplaceListing) => {
    // Always navigate to public property details page
    // Authentication will be required only when clicking "Apply"
    navigate(`/property/${listing.propertyId}`);
  };

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Available Properties
            </h2>
            <p className="text-muted-foreground text-lg">
              Loading amazing properties...
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="w-full h-64 bg-muted" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <div className="mb-6">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Unable to Load Properties</h3>
              <p className="text-destructive mb-4">{error}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={loadListings} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              {error.includes('connect') && (
                <Button onClick={() => navigate('/help')} variant="outline">
                  <Info className="h-4 w-4 mr-2" />
                  Get Help
                </Button>
              )}
            </div>
            {error.includes('connect') && (
              <div className="mt-6 p-4 bg-muted rounded-lg text-left">
                <h4 className="font-semibold mb-2 flex items-center">
                  <Wifi className="h-4 w-4 mr-2" />
                  Troubleshooting Tips
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing the page</li>
                  <li>• Clear your browser cache</li>
                  <li>• Contact support if the issue persists</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (listings.length === 0) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Available Properties
            </h2>
            <p className="text-muted-foreground text-lg">
              No properties available at the moment. Check back soon!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            <TrendingUp className="w-3 h-3 mr-1" />
            {listings.length} Properties Available
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
            Find Your Perfect Home
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Browse through our curated selection of apartments, houses, and condos. 
            Click on any property to view details and apply.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="outline" size="lg" className="gap-2">
              <Search className="w-4 h-4" />
              Search Properties
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {listings.map((listing) => (
            <Card 
              key={listing.unitId} 
              className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 hover:border-accent"
              onClick={() => handlePropertyClick(listing)}
            >
              {/* Property Image */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={listing.images[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop'}
                  alt={listing.propertyName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {listing.isFeatured && (
                    <Badge className="bg-accent text-accent-foreground">
                      Featured
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                    {listing.propertyType}
                  </Badge>
                </div>
                {/* Quick Actions */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="rounded-full bg-background/90 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success('Added to favorites!');
                    }}
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
                {/* Price Overlay */}
                <div className="absolute bottom-3 left-3">
                  <div className="bg-accent text-accent-foreground px-4 py-2 rounded-lg font-bold text-xl">
                    {formatCurrency(listing.rentAmount)}<span className="text-sm font-normal">/annum</span>
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <CardContent className="p-5">
                <h3 className="font-bold text-xl mb-2 group-hover:text-accent transition-colors line-clamp-1">
                  {listing.propertyName}
                </h3>
                <div className="flex items-center text-muted-foreground mb-3">
                  <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="text-sm line-clamp-1">
                    {listing.city}, {listing.state}
                  </span>
                </div>

                {/* Features */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Bed className="w-4 h-4 text-muted-foreground" />
                    <span>{listing.bedrooms} Bed{listing.bedrooms > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="w-4 h-4 text-muted-foreground" />
                    <span>{listing.bathrooms} Bath{listing.bathrooms > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span>{listing.squareFeet} sqft</span>
                  </div>
                </div>

                {/* Amenities Preview */}
                {listing.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {listing.amenities.slice(0, 3).map((amenity, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {listing.amenities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{listing.amenities.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* View Count */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Eye className="w-3 h-3 mr-1" />
                    {listing.viewCount} views
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="group-hover:text-accent"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Button 
            size="lg" 
            className="gap-2"
            onClick={() => {
              if (isAuthenticated) {
                navigate('/tenant/search');
              } else {
                navigate('/register');
              }
            }}
          >
            View All Properties
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PropertyMarketplace;
