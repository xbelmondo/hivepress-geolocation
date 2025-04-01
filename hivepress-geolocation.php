<?php
/**
 * Plugin Name: HivePress Geolocation
 * Description: Allow users to search listings by location. Replaced Mapbox with Maplibre as map provider.
 * Version: 1.3.7
 * Author: HivePress & xbelmondo
 * Author URI: https://github.com/xbelmondo/hivepress-geolocation
 * Text Domain: hivepress-geolocation
 * Domain Path: /languages/
 *
 * @package HivePress
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

// Register extension directory.
add_filter(
	'hivepress/v1/extensions',
	function( $extensions ) {
		$extensions[] = __DIR__;

		return $extensions;
	}
);
