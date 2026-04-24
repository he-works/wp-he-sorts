<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class HE_Sorts_Admin {

	private $core;

	public function __construct( HE_Sorts_Core $core ) {
		$this->core = $core;
	}

	public function register_hooks() {
		add_action( 'admin_menu', array( $this, 'register_menus' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'admin_head', array( $this, 'inject_custom_target_script' ) );

		add_action( 'wp_ajax_he_sorts_get_menu',        array( $this, 'ajax_get_menu' ) );
		add_action( 'wp_ajax_he_sorts_save_config',     array( $this, 'ajax_save_config' ) );
		add_action( 'wp_ajax_he_sorts_reset_config',    array( $this, 'ajax_reset_config' ) );
		add_action( 'wp_ajax_he_sorts_add_custom_item', array( $this, 'ajax_add_custom_item' ) );

		add_filter(
			'plugin_action_links_' . plugin_basename( HE_SORTS_PLUGIN_FILE ),
			array( $this, 'add_action_links' )
		);
	}

	public function register_menus() {
		add_menu_page(
			'HE SORTS',
			'HE SORTS',
			'manage_options',
			'he-sorts',
			array( $this, 'page_editor' ),
			'dashicons-randomize',
			99
		);
	}

	public function enqueue_assets( $hook ) {
		// 전체 관리자 페이지: 3뎁스 들여쓰기 CSS + 경량 JS
		wp_enqueue_style(
			'he-sorts-menu',
			HE_SORTS_PLUGIN_URL . 'assets/css/he-sorts-menu.css',
			array(),
			HE_SORTS_VERSION
		);
		wp_enqueue_script(
			'he-sorts-menu',
			HE_SORTS_PLUGIN_URL . 'assets/js/he-sorts-menu.js',
			array(),
			HE_SORTS_VERSION,
			true
		);

		// 에디터 페이지 전용
		if ( $hook !== 'toplevel_page_he-sorts' ) {
			return;
		}

		wp_enqueue_style(
			'he-sorts-editor',
			HE_SORTS_PLUGIN_URL . 'assets/css/he-sorts-editor.css',
			array(),
			HE_SORTS_VERSION
		);

		// SortableJS CDN
		wp_enqueue_script(
			'sortablejs',
			'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
			array(),
			'1.15.2',
			true
		);

		wp_enqueue_script(
			'he-sorts-editor',
			HE_SORTS_PLUGIN_URL . 'assets/js/he-sorts-editor.js',
			array( 'sortablejs' ),
			HE_SORTS_VERSION,
			true
		);

		wp_localize_script( 'he-sorts-editor', 'heSortsData', array(
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
			'nonce'   => wp_create_nonce( 'he_sorts_ajax' ),
			'version' => HE_SORTS_VERSION,
			'i18n'    => array(
				'confirmReset'   => '모든 메뉴 순서가 초기 상태로 복원됩니다. 계속하시겠습니까?',
				'confirmDelete'  => '이 항목을 삭제하시겠습니까?',
				'saved'          => '저장되었습니다.',
				'saveFailed'     => '저장 중 오류가 발생했습니다.',
				'reset'          => '초기화되었습니다. 페이지를 다시 로드합니다.',
				'maxDepth'       => '최대 3뎁스까지만 지원합니다.',
				'noParent'       => '내보낼 상위 항목이 없습니다.',
				'customAdded'    => '커스텀 항목이 추가되었습니다.',
			),
		) );
	}

	public function page_editor() {
		require_once HE_SORTS_PLUGIN_DIR . 'admin/pages/page-editor.php';
		he_sorts_page_editor();
	}

	public function add_action_links( $links ) {
		$custom = array(
			'settings' => '<a href="' . esc_url( admin_url( 'admin.php?page=he-sorts' ) ) . '">설정</a>',
			'donate'   => '<a href="https://github.com/sponsors/he-works" target="_blank" rel="noopener noreferrer" style="color:#db61a2; font-weight:600;">♥ 기부</a>',
		);
		return array_merge( $custom, $links );
	}

	public function inject_custom_target_script() {
		$config = get_option( 'he_sorts_config', array() );
		$items  = $config['items'] ?? array();

		$blank_urls = array();
		foreach ( $items as $item ) {
			if (
				( $item['type'] ?? '' ) === 'custom' &&
				( $item['target'] ?? '_self' ) === '_blank' &&
				! empty( $item['url'] )
			) {
				$blank_urls[] = esc_url( $item['url'] );
			}
		}

		if ( empty( $blank_urls ) ) return;

		$json = wp_json_encode( $blank_urls );
		echo "<script>
(function(){
    var urls = " . $json . ";
    document.addEventListener('DOMContentLoaded', function(){
        urls.forEach(function(url){
            document.querySelectorAll('#adminmenu a[href=\"' + url + '\"]').forEach(function(a){
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            });
        });
    });
}());
</script>\n";
	}

	// ── AJAX Handlers ────────────────────────────────────────────────────

	public function ajax_get_menu() {
		check_ajax_referer( 'he_sorts_ajax', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => '권한이 없습니다.' ) );
		}

		$merged = HE_Sorts_Core::get_merged_menu_for_editor();
		wp_send_json_success( $merged );
	}

	public function ajax_save_config() {
		check_ajax_referer( 'he_sorts_ajax', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => '권한이 없습니다.' ) );
		}

		$raw = isset( $_POST['config'] ) ? stripslashes( $_POST['config'] ) : '';
		if ( empty( $raw ) ) {
			wp_send_json_error( array( 'message' => '데이터가 없습니다.' ) );
		}

		$config = json_decode( $raw, true );
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			wp_send_json_error( array( 'message' => '잘못된 JSON 형식입니다.' ) );
		}

		$sanitized = $this->sanitize_config( $config );
		update_option( 'he_sorts_config', $sanitized );

		wp_send_json_success( array( 'message' => '저장되었습니다.' ) );
	}

	public function ajax_reset_config() {
		check_ajax_referer( 'he_sorts_ajax', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => '권한이 없습니다.' ) );
		}

		delete_option( 'he_sorts_config' );
		wp_send_json_success( array( 'message' => '초기화되었습니다.' ) );
	}

	public function ajax_add_custom_item() {
		check_ajax_referer( 'he_sorts_ajax', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => '권한이 없습니다.' ) );
		}

		$label      = sanitize_text_field( $_POST['label'] ?? '새 메뉴' );
		$url        = esc_url_raw( $_POST['url'] ?? '#' );
		$raw_icon   = $_POST['icon'] ?? 'dashicons-admin-generic';
		if ( strpos( $raw_icon, 'http' ) === 0 ) {
			$icon = esc_url_raw( $raw_icon );
		} else {
			$icon = sanitize_html_class( $raw_icon );
			if ( empty( $icon ) ) $icon = 'dashicons-admin-generic';
		}
		$capability = sanitize_key( $_POST['capability'] ?? 'read' );
		$target     = in_array( $_POST['target'] ?? '', array( '_self', '_blank' ), true ) ? $_POST['target'] : '_self';
		$depth      = intval( $_POST['depth'] ?? 1 );
		$parent_id  = sanitize_text_field( $_POST['parent_id'] ?? '' );

		$new_item = array(
			'id'         => 'custom::' . wp_generate_password( 8, false ),
			'type'       => 'custom',
			'depth'      => $depth,
			'wp_slug'    => null,
			'parent_id'  => $parent_id ?: null,
			'label'      => $label,
			'url'        => $url,
			'icon'       => $icon,
			'capability' => $capability,
			'target'     => $target,
			'hidden'     => false,
		);

		wp_send_json_success( $new_item );
	}

	// ── Private helpers ───────────────────────────────────────────────────

	private function sanitize_config( $config ) {
		if ( ! is_array( $config ) ) {
			return array();
		}

		$sanitized = array(
			'version' => 1,
			'items'   => array(),
		);

		if ( empty( $config['items'] ) || ! is_array( $config['items'] ) ) {
			return $sanitized;
		}

		foreach ( $config['items'] as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			// wp_slug / parent_id: null 은 null 로 보존해야 find_sub_entry() 가 올바르게 동작함.
			// isset() 은 null 에도 true 를 반환하므로 명시적으로 null 체크합니다.
			$raw_wp_slug   = $item['wp_slug']   ?? null;
			$raw_parent_id = $item['parent_id'] ?? null;

			$clean = array(
				'id'        => sanitize_text_field( $item['id'] ?? '' ),
				'type'      => in_array( $item['type'] ?? '', array( 'original', 'custom', 'separator' ), true ) ? $item['type'] : 'original',
				'depth'     => min( 3, max( 1, intval( $item['depth'] ?? 1 ) ) ),
				'wp_slug'   => ( $raw_wp_slug !== null && $raw_wp_slug !== '' ) ? sanitize_text_field( $raw_wp_slug ) : null,
				'parent_id' => ( $raw_parent_id !== null && $raw_parent_id !== '' ) ? sanitize_text_field( $raw_parent_id ) : null,
				'label'     => sanitize_text_field( $item['label'] ?? '' ),
				'hidden'    => ! empty( $item['hidden'] ),
			);

			if ( $clean['type'] === 'custom' ) {
				$clean['url']        = esc_url_raw( $item['url'] ?? '#' );
				$raw_icon            = $item['icon'] ?? 'dashicons-admin-generic';
				if ( strpos( $raw_icon, 'http' ) === 0 ) {
					$clean['icon'] = esc_url_raw( $raw_icon );
				} else {
					$clean['icon'] = sanitize_html_class( $raw_icon );
					if ( empty( $clean['icon'] ) ) {
						$clean['icon'] = 'dashicons-admin-generic';
					}
				}
				$clean['capability'] = sanitize_key( $item['capability'] ?? 'read' );
				$clean['target']     = in_array( $item['target'] ?? '', array( '_self', '_blank' ), true ) ? $item['target'] : '_self';
			}

			if ( empty( $clean['id'] ) ) {
				continue;
			}

			$sanitized['items'][] = $clean;
		}

		return $sanitized;
	}
}
