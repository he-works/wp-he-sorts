<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class HE_Sorts_Core {

	private static $original_menu    = array();
	private static $original_submenu = array();

	public function register_hooks() {
		add_action( 'admin_menu', array( $this, 'capture_original_menu' ), 998 );
		add_action( 'admin_menu', array( $this, 'apply_custom_order' ),    9999 );
	}

	public function capture_original_menu() {
		global $menu, $submenu;
		self::$original_menu    = is_array( $menu )    ? $menu    : array();
		self::$original_submenu = is_array( $submenu ) ? $submenu : array();
	}

	/**
	 * 저장된 설정을 읽어 $menu / $submenu 전역 변수를 재작성합니다.
	 * ※ add_menu_page / add_submenu_page 호출 없이 배열을 직접 조작합니다.
	 *   (훅 내부에서 add_menu_page 를 재호출하면 전역 상태가 오염됩니다.)
	 */
	public function apply_custom_order() {
		global $menu, $submenu;

		$config = get_option( 'he_sorts_config', array() );
		if ( empty( $config ) || empty( $config['items'] ) ) {
			return;
		}

		$items = $config['items'];

		// 스냅샷(priority 998 에서 저장)을 단일 소스로 사용
		$orig_menu    = self::$original_menu;
		$orig_submenu = self::$original_submenu;

		// ── 원본 메뉴 인덱스 ────────────────────────────────────────────
		$menu_index = array(); // [slug] => entry
		foreach ( $orig_menu as $entry ) {
			if ( ! empty( $entry[2] ) ) {
				$menu_index[ $entry[2] ] = $entry;
			}
		}

		$sub_index = array(); // [parent_slug][item_slug] => entry
		foreach ( $orig_submenu as $parent_slug => $children ) {
			if ( ! is_array( $children ) ) continue;
			foreach ( $children as $entry ) {
				if ( ! empty( $entry[2] ) ) {
					$sub_index[ $parent_slug ][ $entry[2] ] = $entry;
				}
			}
		}

		// ── depth-1 재구성 ────────────────────────────────────────────
		$new_menu = array();
		$new_sub  = array();
		$pos      = 10;

		foreach ( $items as $item ) {
			if ( ( $item['depth'] ?? 1 ) !== 1 ) continue;
			if ( ! empty( $item['hidden'] ) ) continue;

			$type  = $item['type'] ?? 'original';
			$slug  = $item['wp_slug'] ?? '';
			$label = $item['label'] ?? '';

			// 구분선
			if ( $type === 'separator' ) {
				$new_menu[ $pos ] = array( '', 'read', 'separator-he-' . $pos, '', 'wp-menu-separator' );
				$pos += 10;
				continue;
			}

			// 메뉴 엔트리 결정
			if ( $type === 'custom' ) {
				$entry = $this->build_custom_menu_entry( $item );
			} else {
				$entry = $menu_index[ $slug ] ?? null;
			}

			if ( ! $entry ) continue;

			// 라벨 덮어쓰기
			if ( $label !== '' ) {
				$entry[0] = esc_html( $label );
			}

			$new_menu[ $pos ] = $entry;

			// submenu 키 (커스텀이면 URL, 원본이면 slug)
			$sub_key = ( $type === 'custom' ) ? ( $item['url'] ?? $slug ) : $slug;

			// depth-2, 3 처리
			$this->collect_children( $items, $item['id'] ?? '', $sub_key, $sub_index, $new_sub, 2 );

			$pos += 10;
		}

		$menu    = $new_menu;
		$submenu = $new_sub;
		ksort( $menu );
	}

	/**
	 * depth N 자식들을 재귀적으로 $new_sub 에 추가합니다.
	 */
	private function collect_children( $all_items, $parent_id, $sub_key, $sub_index, &$new_sub, $depth ) {
		foreach ( $all_items as $item ) {
			if ( ( $item['depth'] ?? 1 ) !== $depth ) continue;
			if ( ( $item['parent_id'] ?? '' ) !== $parent_id ) continue;
			if ( ! empty( $item['hidden'] ) ) continue;

			$type  = $item['type'] ?? 'original';
			$label = $item['label'] ?? '';

			if ( $type === 'custom' ) {
				$entry = $this->build_custom_sub_entry( $item );
			} else {
				$entry = $this->find_sub_entry( $item, $sub_index );
			}

			if ( ! $entry ) continue;

			if ( $label !== '' ) {
				$entry[0] = esc_html( $label );
			}

			if ( $depth === 3 ) {
				$entry[4] = trim( ( $entry[4] ?? '' ) . ' he-sorts-depth-3' );
			}

			$new_sub[ $sub_key ][] = $entry;

			if ( $depth < 3 ) {
				$this->collect_children( $all_items, $item['id'] ?? '', $sub_key, $sub_index, $new_sub, $depth + 1 );
			}
		}
	}

	// ── 공개 접근자 ──────────────────────────────────────────────────────

	public static function get_original_menu() {
		return array(
			'menu'    => self::$original_menu,
			'submenu' => self::$original_submenu,
		);
	}

	/**
	 * 에디터용 병합 데이터를 반환합니다.
	 * - 저장된 config 항목 (순서 유지, 원본 라벨/아이콘 보강)
	 * - 아직 config 에 없는 원본 메뉴 항목 (unmanaged)
	 */
	public static function get_merged_menu_for_editor() {
		$original = self::get_original_menu();
		$config   = get_option( 'he_sorts_config', array() );
		$items    = $config['items'] ?? array();

		$managed_ids = array_column( $items, 'id' );

		$unmanaged = array();

		foreach ( $original['menu'] as $entry ) {
			if ( empty( $entry[2] ) ) continue;

			$slug  = $entry[2];
			$id    = 'menu::' . $slug;
			$label = self::strip_menu_badge( $entry[0] );

			// depth-1 가 아직 관리되지 않는 경우
			if ( ! in_array( $id, $managed_ids, true ) ) {
				$unmanaged[] = array(
					'id'        => $id,
					'type'      => ( strpos( $entry[4] ?? '', 'wp-menu-separator' ) !== false ) ? 'separator' : 'original',
					'depth'     => 1,
					'wp_slug'   => $slug,
					'parent_id' => null,
					'label'     => $label,
					'icon'      => $entry[6] ?? '',
					'hidden'    => false,
					'unmanaged' => true,
				);
			}

			// depth-1 의 관리 여부와 무관하게, 관리되지 않은 depth-2 항목 수집
			if ( ! empty( $original['submenu'][ $slug ] ) ) {
				// depth-1 이 관리 중이면 parent_id 를 그 ID 로, 아니면 unmanaged depth-1 로
				$d1_id = $id;

				foreach ( $original['submenu'][ $slug ] as $sub_entry ) {
					if ( empty( $sub_entry[2] ) ) continue;

					$sub_slug = $sub_entry[2];
					$sub_id   = 'sub::' . $slug . '::' . $sub_slug;

					if ( ! in_array( $sub_id, $managed_ids, true ) ) {
						$unmanaged[] = array(
							'id'        => $sub_id,
							'type'      => 'original',
							'depth'     => 2,
							'wp_slug'   => $sub_slug,
							'parent_id' => $d1_id,
							'label'     => self::strip_menu_badge( $sub_entry[0] ),
							'hidden'    => false,
							'unmanaged' => true,
						);
					}
				}
			}
		}

		// config 항목에 원본 라벨/아이콘 보강
		$enriched = array();
		foreach ( $items as $item ) {
			$ei = $item;

			if ( ( $item['type'] ?? '' ) === 'original' ) {
				$wp_slug = $item['wp_slug'] ?? '';

				if ( ( $item['depth'] ?? 1 ) === 1 ) {
					foreach ( $original['menu'] as $entry ) {
						if ( ( $entry[2] ?? '' ) === $wp_slug ) {
							$ei['original_label'] = self::strip_menu_badge( $entry[0] );
							$ei['icon']           = $entry[6] ?? '';
							break;
						}
					}
				} else {
					$id_parts    = explode( '::', $item['id'], 3 );
					$orig_parent = $id_parts[1] ?? '';
					if ( ! empty( $original['submenu'][ $orig_parent ] ) ) {
						foreach ( $original['submenu'][ $orig_parent ] as $sub_entry ) {
							if ( ( $sub_entry[2] ?? '' ) === $wp_slug ) {
								$ei['original_label'] = self::strip_menu_badge( $sub_entry[0] );
								break;
							}
						}
					}
				}
			}

			$enriched[] = $ei;
		}

		return array(
			'items'     => $enriched,
			'unmanaged' => $unmanaged,
		);
	}

	// ── Private helpers ──────────────────────────────────────────────────

	private function find_sub_entry( $item, $sub_index ) {
		$slug        = $item['wp_slug'] ?? '';
		$id_parts    = explode( '::', $item['id'], 3 );
		$orig_parent = $id_parts[1] ?? '';

		// 원본 부모에서 먼저 검색
		if ( ! empty( $sub_index[ $orig_parent ][ $slug ] ) ) {
			return $sub_index[ $orig_parent ][ $slug ];
		}

		// 모든 submenu 에서 검색 (메뉴가 다른 부모로 이동된 경우)
		foreach ( $sub_index as $entries ) {
			if ( ! empty( $entries[ $slug ] ) ) {
				return $entries[ $slug ];
			}
		}

		return null;
	}

	private function build_custom_menu_entry( $item ) {
		$label = $item['label'] ?? 'Custom';
		$url   = $item['url']   ?? '#';
		$cap   = $item['capability'] ?? 'read';
		$icon  = $item['icon']  ?? 'dashicons-admin-generic';

		return array(
			esc_html( $label ),
			$cap,
			esc_url_raw( $url ),
			esc_html( $label ),
			'menu-top he-sorts-custom',
			'he-sorts-custom-' . sanitize_key( $item['id'] ?? 'x' ),
			$icon,
		);
	}

	private function build_custom_sub_entry( $item ) {
		$label = $item['label'] ?? 'Custom';
		$url   = $item['url']   ?? '#';
		$cap   = $item['capability'] ?? 'read';

		return array(
			esc_html( $label ),
			$cap,
			esc_url_raw( $url ),
			esc_html( $label ),
			'he-sorts-custom',
		);
	}

	public static function strip_menu_badge( $label ) {
		return trim( preg_replace( '/<span[^>]*>.*?<\/span>/s', '', $label ) );
	}
}
