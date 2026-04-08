<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class HE_Sorts_Activator {

	public static function activate() {
		add_option( 'he_sorts_config', array() );
		add_option( 'he_sorts_plugin_version', HE_SORTS_VERSION );
	}

	public static function deactivate() {
		// 설정은 비활성화 시 유지합니다. 삭제 시에만 제거됩니다 (uninstall.php).
	}
}
