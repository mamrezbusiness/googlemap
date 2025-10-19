<?php
if ( ! defined('ABSPATH') ) exit;

/* Advanced tab section */
add_filter('woocommerce_get_sections_advanced', function( $sections ){
    $sections['bp_google_map_api'] = __('Google Map API', 'woo-address-autocomplete-adv');
    return $sections;
});

/* Fields */
add_filter('woocommerce_get_settings_advanced', function( $settings, $current_section ){
    if ( $current_section !== 'bp_google_map_api' ) return $settings;

    return array(
        array(
            'title' => __('Google Map API', 'woo-address-autocomplete-adv'),
            'type'  => 'title',
            'desc'  => __('Configure Google Places Autocomplete used on Checkout (Blocks + Classic).', 'woo-address-autocomplete-adv'),
            'id'    => 'bp_gmap_title',
        ),
        array(
            'title'    => __('Maps JavaScript API Key', 'woo-address-autocomplete-adv'),
            'id'       => 'bp_gmap_api_key',
            'type'     => 'text',
            'css'      => 'width:420px;',
            'default'  => '',
            'desc'     => __('Create & restrict your API key in Google Cloud → APIs & Services → Credentials.', 'woo-address-autocomplete-adv'),
            'desc_tip' => true,
        ),
        array(
            'title'    => __('Limit to countries', 'woo-address-autocomplete-adv'),
            'id'       => 'bp_gmap_countries',
            'type'     => 'text',
            'css'      => 'width:220px;',
            'default'  => 'ca',
            'desc'     => __('Comma-separated ISO codes (e.g. ca,us). Leave empty for no limit.', 'woo-address-autocomplete-adv'),
            'desc_tip' => true,
        ),
        array(
            'title'   => __('Sync Billing address', 'woo-address-autocomplete-adv'),
            'id'      => 'bp_gmap_sync_billing',
            'type'    => 'checkbox',
            'default' => 'yes',
            'desc'    => __('(Legacy) If you want Woo to mirror shipping to billing, use the built-in “Use same address for billing” option in the block. Plugin no longer auto-copies.', 'woo-address-autocomplete-adv'),
        ),
        array( 'type' => 'sectionend', 'id' => 'bp_gmap_title' ),
    );
}, 10, 2);
