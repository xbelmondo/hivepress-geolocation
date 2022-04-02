hivepress.initGeolocation = function() {
	(function($) {
		'use strict';

		$(document).ready(function() {

			// Location
			hivepress.getComponent('location').each(function() {
				var container = $(this),
					form = container.closest('form'),
					field = container.find('input[type=text]'),
					latitudeField = form.find('input[data-coordinate=lat]'),
					longitudeField = form.find('input[data-coordinate=lng]'),
					regionField = form.find('input[data-region]'),
					button = container.find('a'),
					settings = {};

				if (typeof mapboxData !== 'undefined') {
					settings = {
						accessToken: mapboxData.apiKey,
						language: hivepressCoreData.language,
					};

					if (container.data('countries')) {
						settings['countries'] = container.data('countries').join(',');
					}

					if (container.data('types')) {
						settings['types'] = container.data('types').join(',');
					}

					var geocoder = new MapboxGeocoder(settings);

					geocoder.addTo(container.get(0));

					var mapboxContainer = container.children('.mapboxgl-ctrl'),
						fieldAttributes = field.prop('attributes');

					field.remove();
					field = mapboxContainer.find('input[type=text]');

					$.each(fieldAttributes, function() {
						field.attr(this.name, this.value);
					});

					mapboxContainer.detach().prependTo(container);

					geocoder.on('result', function(result) {
						var types = [
							'place',
							'district',
							'region',
							'country',
						];

						if (regionField.length) {
							if (result.result.place_type.filter(value => types.includes(value)).length) {
								regionField.val(result.result.id);
							} else {
								regionField.val('');
							}
						}

						longitudeField.val(result.result.geometry.coordinates[0]);
						latitudeField.val(result.result.geometry.coordinates[1]);


					});
				} else {
					settings = {
						details: form,
						detailsAttribute: 'data-coordinate',
					};

					if (container.data('countries')) {
						settings['componentRestrictions'] = {
							'country': container.data('countries'),
						};
					}

					if (container.data('types')) {
						settings['types'] = container.data('types');
					}

					field.geocomplete(settings);

					field.bind('geocode:result', function(event, result) {
						var parts = [],
							types = [
								'locality',
								'administrative_area_level_2',
								'administrative_area_level_1',
								'country',
							];

						if (regionField.length) {
							if (result.address_components[0].types.filter(value => types.includes(value)).length) {
								regionField.val(result.place_id);
							} else {
								regionField.val('');
							}
						}

						if (container.data('scatter')) {
							types.push('route');

							$.each(result.address_components, function(index, component) {
								if (component.types.filter(value => types.includes(value)).length) {
									parts.push(component.long_name);
								}
							});

							field.val(parts.join(', '));
						}
					});
				}

				field.on('input', function() {
					if (!field.val()) {
						form.find('input[data-coordinate]').val('');
					}
				});

				if (navigator.geolocation) {
					button.on('click', function(e) {
						navigator.geolocation.getCurrentPosition(function(position) {
							if (typeof mapboxData !== 'undefined') {
								//todo
							} else {
								field.geocomplete('find', position.coords.latitude + ' ' + position.coords.longitude);
							}
						});

						e.preventDefault();
					});
				} else {
					button.hide();
				}
			});

			// Map
			hivepress.getComponent('map').each(function() {
				var container = $(this),
					maxZoom = container.data('max-zoom');

				if (typeof mapboxData !== 'undefined') {
					mapboxgl.accessToken = mapboxData.apiKey;

					var bounds = new mapboxgl.LngLatBounds(),
						map = new mapboxgl.Map({
							container: container.get(0),
							style: 'mapbox://styles/mapbox/streets-v11',
							center: [0, 0],
							zoom: 1,
						});

					map.on('load', function() {
						map.getStyle().layers.forEach(function(layer) {
							if (layer.id.indexOf('-label') > 0) {
								map.setLayoutProperty(layer.id, 'text-field', ['get', 'name_' + hivepressCoreData.language]);
							}
						});
					});

					$.each(container.data('markers'), function(index, data) {
						bounds.extend([data.longitude, data.latitude]);

						var marker = new mapboxgl.Marker()
							.setLngLat([data.longitude, data.latitude])
							.setPopup(new mapboxgl.Popup().setHTML(data.content))
							.addTo(map);
					});

					map.fitBounds(bounds, {
						maxZoom: maxZoom - 1,
						duration: 0,
					});
				} else {
					var height = container.width(),
						prevWindow = false,

						markers = [],
						bounds = new google.maps.LatLngBounds(),
						map = new google.maps.Map(container.get(0), {
							zoom: 3,
							minZoom: 2,
							maxZoom: maxZoom,
							mapTypeControl: false,
							streetViewControl: false,
							center: {
								lat: 0,
								lng: 0,
							},
							styles: [{
								featureType: 'poi',
								stylers: [{
									visibility: 'off',
								}],
							}],
						}),
						oms = new OverlappingMarkerSpiderfier(map, {
							markersWontMove: true,
							markersWontHide: true,
							basicFormatEvents: true,
						}),
						iconSettings = {
							path: google.maps.SymbolPath.CIRCLE,
							fillColor: '#3a77ff',
							fillOpacity: 0.25,
							strokeColor: '#3a77ff',
							strokeWeight: 1,
							strokeOpacity: 0.75,
							scale: 10,
						};

					if (container.is('[data-height]')) {
						height = container.data('height');
					}

					container.height(height);

					$.each(container.data('markers'), function(index, data) {
						var nextWindow = new google.maps.InfoWindow({
								content: data.content,
							}),
							markerSettings = {
								title: data.title,
								position: {
									lat: data.latitude,
									lng: data.longitude,
								},
							};

						if (container.data('scatter')) {
							markerSettings['icon'] = iconSettings;
						}

						var marker = new google.maps.Marker(markerSettings);

						marker.addListener('spider_click', function() {
							if (prevWindow) {
								prevWindow.close();
							}

							prevWindow = nextWindow;
							nextWindow.open(map, marker);
						});

						markers.push(marker);
						oms.addMarker(marker);

						bounds.extend(marker.getPosition());
					});

					map.fitBounds(bounds);

					var observer = new MutationObserver(function(mutations) {
						map.fitBounds(bounds);
					});

					observer.observe(container.get(0), {
						attributes: true,
					});

					var clusterer = new MarkerClusterer(map, markers, {
						imagePath: hivepressGeolocationData.assetURL + '/images/markerclustererplus/m',
						maxZoom: maxZoom - 1,
					});

					if (container.data('scatter')) {
						map.addListener('zoom_changed', function() {
							iconSettings['scale'] = Math.pow(1.3125, map.getZoom());

							$.each(markers, function(index, marker) {
								markers[index].setIcon(iconSettings);
							});
						});
					}
				}
			});
		});
	})(jQuery);
}

// Mapbox
if (typeof mapboxData !== 'undefined') {
	hivepress.initGeolocation();
}
