// Property Debug Component
// Helps diagnose property listing issues

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchPublicMarketplaceListings, fetchAvailableProperties } from "@/services/propertyService";
import type { PropertyWithUnit } from "@/services/propertyService";
import type { MarketplaceListing } from "@/types";
import { supabase } from "@/lib/supabase";

export const PropertyDebugPanel = () => {
  const [publicListings, setPublicListings] = useState<MarketplaceListing[]>([]);
  const [availableProperties, setAvailableProperties] = useState<PropertyWithUnit[]>([]);
  const [rawUnits, setRawUnits] = useState<unknown[]>([]);
  const [rawProperties, setRawProperties] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test 1: Check public marketplace listings
      const listings = await fetchPublicMarketplaceListings();
      setPublicListings(listings);

      // Test 2: Check available properties
      const available = await fetchAvailableProperties();
      setAvailableProperties(available);

      // Test 3: Raw query units table
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('listing_status', 'available')
        .limit(10);
      
      if (unitsError) throw unitsError;
      setRawUnits(units || []);

      // Test 4: Raw query properties table
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('is_published', true)
        .limit(10);
      
      if (propertiesError) throw propertiesError;
      setRawProperties(properties || []);

    } catch (err) {
      console.error('Diagnostics error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold">Property Listings Diagnostics</h2>
      
      <Button onClick={runDiagnostics} disabled={loading}>
        {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Public Marketplace Listings (fetchPublicMarketplaceListings)</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Count: {publicListings.length}
        </p>
        {publicListings.length > 0 && (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(publicListings[0], null, 2)}
          </pre>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Available Properties (fetchAvailableProperties)</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Count: {availableProperties.length}
        </p>
        {availableProperties.length > 0 && (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(availableProperties[0], null, 2)}
          </pre>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Raw Units (listing_status = 'available')</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Count: {rawUnits.length}
        </p>
        {rawUnits.length > 0 && (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(rawUnits[0], null, 2)}
          </pre>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Raw Properties (is_published = true)</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Count: {rawProperties.length}
        </p>
        {rawProperties.length > 0 && (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(rawProperties[0], null, 2)}
          </pre>
        )}
      </Card>

      <Alert>
        <AlertDescription>
          <strong>How to interpret:</strong>
          <ul className="list-disc ml-4 mt-2 text-sm">
            <li>If all counts are 0, the database hasn't been seeded yet</li>
            <li>If raw queries show data but service functions don't, there's a query issue</li>
            <li>If service functions show data but UI doesn't, there's a display issue</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};
