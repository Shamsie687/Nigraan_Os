/**
 * CivicMap — Native implementation (Android/iOS)
 *
 * Uses react-native-webview with an inline Leaflet + OpenStreetMap page.
 * No Google Maps API key required — OSM tiles are free.
 *
 * Markers are rendered as CircleMarkers with category colours.
 * Communication between React Native and the WebView uses postMessage.
 *
 * Leaflet JS/CSS loaded from unpkg CDN over HTTPS.
 * For production, consider bundling Leaflet locally or adding SRI hashes.
 */

import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../design/tokens/colors';
import type { CivicMapProps, CivicMapMarker } from './CivicMap.types';
import { DEFAULT_REGION } from './CivicMap.types';

// ── Inline Leaflet HTML page ──────────────────────────────────────

const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script>
var map = L.map('map',{zoomControl:true,attributionControl:true})
  .setView([24.8607,67.0011],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'\\u00a9 OpenStreetMap',
  maxZoom:19
}).addTo(map);

var markers={};
var selId=null;
var pickMarker=null;

function rn(msg){
  if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
}

function radius(id){return id===selId?11:7}

map.on('click',function(e){
  if(selId!==null){
    var prev=markers[selId];
    if(prev){prev.setStyle({fillOpacity:0.7,weight:2,opacity:1});prev.setRadius(7)}
    selId=null;
    rn({type:'deselect'});
  }
  rn({type:'mapTap',lat:e.latlng.lat,lng:e.latlng.lng});
});

window.addEventListener('message',function(e){
  var d;
  try{d=JSON.parse(e.data)}catch(x){return}

  if(d.type==='init'){
    if(d.center) map.setView([d.center.lat,d.center.lng],d.center.zoom||13);
    Object.keys(markers).forEach(function(k){map.removeLayer(markers[k])});
    markers={};
    (d.markers||[]).forEach(function(m){
      var c=L.circleMarker([m.lat,m.lng],{
        radius:7,fillColor:m.color,color:'#fff',
        weight:2,opacity:1,fillOpacity:0.7
      }).addTo(map);
      c.bindPopup('<b>'+m.title+'</b><br><i>'+m.category.replace('_',' ')+'</i>');
      c.on('click',function(ev){
        L.DomEvent.stopPropagation(ev);
        if(selId&&markers[selId]){
          markers[selId].setStyle({fillOpacity:0.7,weight:2,opacity:1});
          markers[selId].setRadius(7);
        }
        selId=m.id;
        c.setStyle({fillOpacity:0.9,weight:3});
        c.setRadius(11);
        rn({type:'markerTap',id:m.id});
      });
      markers[m.id]=c;
    });

    if(pickMarker){map.removeLayer(pickMarker);pickMarker=null}
    if(d.pick){
      pickMarker=L.circleMarker([d.pick.lat,d.pick.lng],{
        radius:9,fillColor:d.pick.color,color:'#fff',
        weight:3,opacity:1,fillOpacity:1
      }).addTo(map);
    }
  }

  if(d.type==='updateSelected'){
    if(selId&&markers[selId]){
      markers[selId].setStyle({fillOpacity:0.7,weight:2,opacity:1});
      markers[selId].setRadius(7);
    }
    selId=d.id;
    if(selId&&markers[selId]){
      markers[selId].setStyle({fillOpacity:0.9,weight:3});
      markers[selId].setRadius(11);
      markers[selId].bringToFront();
    }
  }
});

setTimeout(function(){rn({type:'ready'})},50);
<\/script>
</body>
</html>`;

// ── Component ─────────────────────────────────────────────────────

export function CivicMap({
  markers,
  selectedMarkerId,
  onMarkerSelect,
  region,
  onLocationPick,
  pickedLocation,
}: CivicMapProps) {
  // Build the marker payload for the WebView
  const markerData = useMemo(
    () =>
      markers.map((m) => ({
        id: m.id,
        lat: m.latitude,
        lng: m.longitude,
        title: m.title,
        category: m.category,
        color: m.color,
      })),
    [markers],
  );

  // Picked location payload (location-picker mode)
  const pickData = useMemo(
    () =>
      pickedLocation
        ? {
            lat: pickedLocation.latitude,
            lng: pickedLocation.longitude,
            color: colors.primary,
          }
        : null,
    [pickedLocation],
  );

  // Compute map center from region prop
  const center = useMemo(() => {
    const r = region ?? DEFAULT_REGION;
    const zoom = Math.round(
      Math.log2(360 / Math.max(r.latitudeDelta, r.longitudeDelta)),
    );
    return { lat: r.latitude, lng: r.longitude, zoom };
  }, [region]);

  // Message sent to WebView whenever data changes
  const jsMessage = useMemo(
    () =>
      `window.postMessage(${JSON.stringify({
        type: 'init',
        markers: markerData,
        center,
        pick: pickData,
      })},'*');`,
    [markerData, center, pickData],
  );

  // Message for selected-marker updates
  const selectedMessage = useMemo(
    () =>
      `window.postMessage(${JSON.stringify({
        type: 'updateSelected',
        id: selectedMarkerId,
      })},'*');`,
    [selectedMarkerId],
  );

  // Handle messages from the WebView
  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data) as {
          type: string;
          id?: string;
          lat?: number;
          lng?: number;
        };
        if (msg.type === 'markerTap' && msg.id) {
          const marker = markers.find((m: CivicMapMarker) => m.id === msg.id) ?? null;
          onMarkerSelect(marker);
        } else if (msg.type === 'deselect') {
          onMarkerSelect(null);
        } else if (
          msg.type === 'mapTap' &&
          typeof msg.lat === 'number' &&
          typeof msg.lng === 'number'
        ) {
          onLocationPick?.({ latitude: msg.lat, longitude: msg.lng });
        }
      } catch {
        // ignore malformed messages
      }
    },
    [markers, onMarkerSelect, onLocationPick],
  );

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: LEAFLET_HTML }}
        style={styles.webview}
        injectedJavaScript={jsMessage + '\n' + selectedMessage}
        onMessage={handleMessage}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webview: {
    flex: 1,
  },
});
