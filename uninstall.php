<?php
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'he_sorts_config' );
delete_option( 'he_sorts_plugin_version' );
delete_transient( 'he_sorts_github_release' );
