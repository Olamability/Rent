import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { 
  Home, CreditCard, Wrench, FileText, Settings, Search, User, MapPin, Navigation, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ApplicationDialog } from "@/components/tenant/ApplicationDialog";
import { useLocationSort } from "@/hooks/useLocationSort";
import { formatDistance } from "@/lib/geolocation";
import { formatCurrency } from "@/lib/utils";
import { fetchAvailableProperties, fetchAppliedPropertiesForTenant, type PropertyWithUnit } from "@/services/propertyService";
import { useAuth } from "@/contexts/AuthContext";
import { tenantNavLinks } from "@/config/navigation";

const PropertySearch = () => {
  const { user } = useAuth();
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<{ id: string; name: string; unitId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [properties, setProperties] = useState<PropertyWithUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch properties from backend
  useEffect(() => {
    let isMounted = true;
    
    const loadProperties = async () => {
      try {
        setError(null);
        setLoading(true);
        
        // Fetch available properties
        const availableData = await fetchAvailableProperties();
        
        // Fetch properties where user has applied (approved status)
        let appliedData: PropertyWithUnit[] = [];
        if (user?.id) {
          try {
            appliedData = await fetchAppliedPropertiesForTenant(user.id);
          } catch (err) {
            // Log but don't fail the entire load if this fails
            // User will still see available properties
            console.error('Error loading applied properties (non-critical):', err);
          }
        }
        
        if (isMounted) {
          // Combine both lists, with applied properties first
          setProperties([...appliedData, ...availableData]);
          // No error if empty - that's a valid state
        }
      } catch (err) {
        console.error('Error loading properties:', err);
        
        // Type-safe error handling
        const errorDetails = err as { code?: string; details?: string; hint?: string };
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          code: errorDetails.code,
          details: errorDetails.details,
          hint: errorDetails.hint
        });
        
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          if (errorMessage.includes('permission denied') || errorMessage.includes('RLS')) {
            setError('You do not have permission to view properties. Please contact support.');
          } else if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
            setError('The property database has not been set up. Please contact your administrator.');
          } else {
            setError(`Failed to load properties: ${errorMessage}`);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProperties();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const {
    sortedProperties,
    userLocation,
    isLoadingLocation,
    locationError,
    hasLocationEnabled,
    requestUserLocation,
    clearLocation,
  } = useLocationSort(properties);

  // Filter properties based on search query
  const displayedProperties = sortedProperties.filter((property) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      property.name.toLowerCase().includes(query) ||
      property.address.toLowerCase().includes(query) ||
      property.propertyType.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout
      navLinks={tenantNavLinks}
      userName={user?.name || "User"}
      pageTitle="Property Search"
      pageDescription="Find your perfect rental home"
    >
      {selectedProperty && (
        <ApplicationDialog
          open={isApplicationDialogOpen}
          onOpenChange={setIsApplicationDialogOpen}
          propertyName={selectedProperty.name}
          propertyId={selectedProperty.id}
          unitId={selectedProperty.unitId}
        />
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      {!loading && !error && (
        <>
          {/* Search and Filter Section */}
          <div className="mb-6 space-y-4" role="search" aria-label="Property search and filters">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start">
              <label htmlFor="property-search" className="sr-only">Search properties by location, type, or price</label>
              <Input 
                id="property-search"
                type="search"
                placeholder="Search properties..." 
                className="flex-1 sm:max-w-2xl" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search properties"
              />
              
              {!hasLocationEnabled ? (
                <Button 
                  variant="outline" 
                  onClick={requestUserLocation}
                  disabled={isLoadingLocation}
                  className="whitespace-nowrap text-xs sm:text-sm"
                  size="default"
                  aria-label="Sort properties by distance from your location"
                >
                  <Navigation className="w-4 h-4 mr-2" aria-hidden="true" />
                  {isLoadingLocation ? 'Getting...' : 'Sort by Distance'}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={clearLocation}
                  className="whitespace-nowrap text-xs sm:text-sm"
                  size="default"
                  aria-label="Clear location-based sorting"
                >
                  <X className="w-4 h-4 mr-2" aria-hidden="true" />
                  Clear Location
                </Button>
              )}
            </div>

            {locationError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{locationError}</AlertDescription>
              </Alert>
            )}

            {hasLocationEnabled && (
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Properties are sorted by distance from your current location. You can still search for properties anywhere.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Properties Grid or Empty State */}
          {displayedProperties.length > 0 ? (
            <section 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
              aria-label="Available properties"
            >
              {displayedProperties.map((property) => (
                <article key={property.id}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                    <div className="relative flex-shrink-0">
                      <img 
                        src={property.image} 
                        alt={`${property.name} - ${property.propertyType} property`}
                        className="w-full h-48 object-cover"
                        loading="lazy"
                      />
                      {property.listingStatus === 'applied' && (
                        <Badge variant="default" className="absolute top-2 left-2 text-xs bg-accent">
                          <span className="sr-only">Status: </span>
                          Applied - Awaiting Payment
                        </Badge>
                      )}
                      {property.distance !== undefined && (
                        <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                          <MapPin className="w-3 h-3 mr-1" aria-hidden="true" />
                          <span className="sr-only">Distance: </span>
                          {formatDistance(property.distance)} away
                        </Badge>
                      )}
                    </div>
                    <div className="p-3 sm:p-6 flex flex-col flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 line-clamp-2">{property.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-1">{property.address}</p>
                      
                      <div className="flex items-center gap-2 sm:gap-4 mb-3 text-xs sm:text-sm text-muted-foreground flex-wrap" aria-label="Property features">
                        <span><span className="sr-only">Bedrooms: </span>{property.bedrooms} bed</span>
                        <span><span className="sr-only">Bathrooms: </span>{property.bathrooms} bath</span>
                        <span className="capitalize hidden sm:inline">
                          <span className="sr-only">Property type: </span>
                          {property.propertyType}
                        </span>
                      </div>
                      
                      <div className="mt-auto">
                        <div className="mb-3">
                          <div className="text-xl sm:text-2xl font-bold text-foreground">
                            <span className="sr-only">Rent: </span>
                            {formatCurrency(property.rentAmount)}
                          </div>
                          <div className="text-xs text-muted-foreground" aria-label="per annum">/annum</div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                          <Button 
                            variant="outline"
                            size="sm"
                            className="w-full sm:flex-1 text-xs sm:text-sm h-9"
                            asChild
                          >
                            <Link to={`/tenant/property/${property.id}`}>View Details</Link>
                          </Button>
                          {property.listingStatus === 'applied' ? (
                            <Button 
                              size="sm"
                              className="w-full sm:flex-1 text-xs sm:text-sm h-9"
                              asChild
                            >
                              <Link to="/tenant/rent">
                                <CreditCard className="w-4 h-4 mr-1" />
                                Make Payment
                              </Link>
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              className="w-full sm:flex-1 text-xs sm:text-sm h-9"
                              onClick={() => {
                                setSelectedProperty({ 
                                  id: property.id, // property ID
                                  name: property.name,
                                  unitId: property.unitId // unit ID
                                });
                                setIsApplicationDialogOpen(true);
                              }}
                              aria-label={`Apply for ${property.name}`}
                            >
                              Apply Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </article>
              ))}
            </section>
          ) : (
            <>
              <EmptyState
                icon={<Home className="w-16 h-16" />}
                title={searchQuery ? "No Properties Found" : "No Properties Available"}
                description={
                  searchQuery 
                    ? "No properties match your search criteria. Try adjusting your search terms."
                    : "There are no available properties at this time. If you have an approved application, check your dashboard to proceed with payment and signing."
                }
                actionLabel={searchQuery ? "Clear Search" : undefined}
                onAction={searchQuery ? () => setSearchQuery("") : undefined}
              />
              {!searchQuery && (
                <div className="flex justify-center mt-4">
                  <Button variant="outline" asChild>
                    <Link to="/tenant/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default PropertySearch;
