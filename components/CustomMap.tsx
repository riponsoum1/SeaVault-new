import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

interface DiveSite {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface CustomMapProps {
  diveSites: DiveSite[];
  selectedDiveSiteId: string | null;
  onDiveSiteSelect: (id: string) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

const CustomMap: React.FC<CustomMapProps> = ({
  diveSites,
  selectedDiveSiteId,
  onDiveSiteSelect,
  initialRegion = {
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
}) => {
  // Filter out any dive sites without valid coordinates
  const validDiveSites = diveSites.filter(
    (site) => site.latitude && site.longitude
  );

  const mapRef = useRef<MapView | null>(null);

  // Use useEffect to handle map fitting after render
  useEffect(() => {
    if (mapRef.current && validDiveSites.length > 0) {
      const timeout = setTimeout(() => {
        if (mapRef.current) {
          const coordinates = validDiveSites.map((site) => ({
            latitude: site.latitude,
            longitude: site.longitude,
          }));

          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      }, 1000); // Delay to ensure map is fully loaded

      return () => clearTimeout(timeout);
    }
  }, [validDiveSites]);

  if (validDiveSites.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.noDataText}>No dive sites available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsCompass={true}
        rotateEnabled={true}
      >
        {validDiveSites.map((site) => (
          <Marker
            key={site.id}
            coordinate={{
              latitude: site.latitude,
              longitude: site.longitude,
            }}
            title={site.name}
            description="Tap to select this dive site"
            pinColor={site.id === selectedDiveSiteId ? 'green' : 'red'}
            onPress={() => onDiveSiteSelect(site.id)}
          />
        ))}
      </MapView>

      {selectedDiveSiteId && (
        <View style={styles.selectionStatus}>
          <Text style={styles.selectionText}>
            {diveSites.find((site) => site.id === selectedDiveSiteId)?.name ||
              'Dive site selected'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: 'hidden',
    height: 400,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  selectionStatus: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 119, 182, 0.8)',
    padding: 8,
    alignItems: 'center',
  },
  selectionText: {
    color: 'white',
    fontWeight: 'bold',
  },
  noDataText: {
    color: '#AAAAAA',
    fontSize: 16,
  },
});

export default CustomMap;
