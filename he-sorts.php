<?php
/**
 * Plugin Name: HE SORTS
 * Plugin URI:  https://github.com/he-works/wp-he-sorts
 * Description: WordPress 관리자 메뉴를 드래그 앤 드롭으로 자유롭게 정렬·이름 변경·커스텀 항목 추가할 수 있는 플러그인. 1~3뎁스 전체를 지원합니다.
 * Version:     1.0.14
 * Author:      HE WORKS.
 * Author URI:  https://github.com/he-works
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: he-sorts
 * Domain Path: /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'HE_SORTS_VERSION',    '1.0.14' );
define( 'HE_SORTS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'HE_SORTS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'HE_SORTS_PLUGIN_FILE', __FILE__ );

require_once HE_SORTS_PLUGIN_DIR . 'includes/class-he-sorts-activator.php';
require_once HE_SORTS_PLUGIN_DIR . 'includes/class-he-sorts-updater.php';
require_once HE_SORTS_PLUGIN_DIR . 'includes/class-he-sorts-core.php';
require_once HE_SORTS_PLUGIN_DIR . 'admin/class-he-sorts-admin.php';

register_activation_hook( __FILE__, array( 'HE_Sorts_Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'HE_Sorts_Activator', 'deactivate' ) );

add_action( 'plugins_loaded', 'he_sorts_init' );

function he_sorts_init() {
	$updater = new HE_Sorts_Updater( HE_SORTS_PLUGIN_FILE );
	$updater->register_hooks();

	$core = new HE_Sorts_Core();
	$core->register_hooks();

	if ( is_admin() ) {
		$admin = new HE_Sorts_Admin( $core );
		$admin->register_hooks();
	}
}
