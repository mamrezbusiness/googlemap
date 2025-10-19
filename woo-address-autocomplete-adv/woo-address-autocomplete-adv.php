<?php
/**
 * Plugin Name: Woo Address Autocomplete (Google Places) – Advanced Tab
 * Description: Google Places Autocomplete for WooCommerce Checkout (Blocks + Classic). Adds popup & “Get my location” CTA. Settings under WooCommerce → Settings → Advanced → Google Map API.
 * Version:     1.4.2
 * Author:      mamrez
 * License:     GPLv2 or later
 * Text Domain: woo-address-autocomplete-adv
 */

if ( ! defined('ABSPATH') ) exit;

define('BP_WAA_ADV_VER', '1.4.2');
define('BP_WAA_ADV_DIR', plugin_dir_path(__FILE__));
define('BP_WAA_ADV_URL', plugin_dir_url(__FILE__));

// Settings section/fields
require_once BP_WAA_ADV_DIR . 'includes/settings.php';

/**
 * Enqueue front assets on checkout (Blocks + Classic).
 */
add_action('wp_enqueue_scripts', function () {
    if ( is_admin() ) return;
    if ( ! function_exists('is_checkout') || ! is_checkout() ) return;

    // read options
    $api_key = trim( (string) get_option('bp_gmap_api_key', '') );
    if ( $api_key === '' ) return; // no key → do nothing

    $countries_csv = strtolower( trim( (string) get_option('bp_gmap_countries', 'ca') ) );
    $countries_csv = preg_replace('/[^a-z,]/', '', $countries_csv);
    $countries_arr = array_values( array_filter( array_map('trim', explode(',', $countries_csv)) ) );
    $sync_billing  = get_option('bp_gmap_sync_billing', 'yes') === 'yes';

    // styles
    wp_enqueue_style('bp-waa-frontend', BP_WAA_ADV_URL . 'assets/css/frontend.css', [], BP_WAA_ADV_VER);

    // scripts
    wp_enqueue_script('bp-waa-frontend', BP_WAA_ADV_URL . 'assets/js/frontend.js', [], BP_WAA_ADV_VER, true);

    // pass config to JS
    wp_add_inline_script(
        'bp-waa-frontend',
        'window.__BP_WAA_CFG__ = ' . wp_json_encode([
            'apiKey'      => $api_key,
            'countries'   => $countries_arr,      // array of ISO (lowercase)
            'syncBilling' => $sync_billing,       // kept for future; JS 1.4.2 ignores auto-copy
            'ctaLabel'    => __('Get my location', 'woo-address-autocomplete-adv'),
            'popupTitle'  => __('Search your address', 'woo-address-autocomplete-adv'),
        ]) . ';',
        'before'
    );
});
