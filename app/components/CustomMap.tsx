import React from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet } from 'react-native';

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
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      </head>
      <body style="margin:0;padding:0;">
        <div id="map" style="width:100%;height:100vh;"></div>
        <script>
          const map = L.map('map').setView([${initialRegion.latitude}, ${initialRegion.longitude}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          const markers = [];
          const diveSites = ${JSON.stringify(diveSites)};
          
          diveSites.forEach(site => {
            if (site.latitude && site.longitude) {
              const marker = L.marker([site.latitude, site.longitude])
                .bindPopup(site.name)
                .addTo(map);
              
              marker.on('click', () => {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'diveSiteSelect',
                  id: site.id
                }));
              });
              
              markers.push(marker);
            }
          });

          // Fit bounds to show all markers
          if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds());
          }
        </script>
      </body>
    </html>
  `;

  return (
    <WebView
      source={{ html }}
      style={styles.map}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'diveSiteSelect') {
            onDiveSiteSelect(data.id);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      }}
    />
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    height: 300,
    marginVertical: 10,
  },
});

export default CustomMap; 