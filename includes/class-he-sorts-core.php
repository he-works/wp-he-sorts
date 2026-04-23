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
				$new_menu[ $pos ] = array( '', 'read', 'separator-he-sorts-' . $pos, '', 'wp-menu-separator' );
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

			// depth-2, 3 처리 (menu_index 도 전달 — 원래 top-level 항목이 sub 로 이동된 경우 처리)
			$this->collect_children( $items, $item['id'] ?? '', $sub_key, $menu_index, $sub_index, $new_sub, 2 );

			$pos += 10;
		}

		$menu    = $new_menu;
		$submenu = $new_sub;
		ksort( $menu );
	}

	/**
	 * 자식 항목들을 재귀적으로 $new_sub 에 추가합니다.
	 *
	 * ■ 핵심 변경점:
	 *   - depth 값이 아닌 parent_id 만으로 부모-자식 관계를 결정합니다.
	 *     (원래 1뎁스였던 항목이 2뎁스로 이동해도 저장된 depth 값은 그대로이므로
	 *      depth 체크를 제거해야 자식을 올바르게 수집할 수 있습니다.)
	 *   - 원래 $menu 에 있던 항목(id 접두사 "menu::")이 sub 로 이동된 경우,
	 *     $sub_index 대신 $menu_index 에서 엔트리를 가져와 변환합니다.
	 *   - depth-3 항목도 동일한 $sub_key 아래 추가합니다.
	 *     WordPress submenu 는 1뎁스(최상위 slug) 키 하나만 지원하기 때문에,
	 *     depth-3 항목을 별도 키로 넣으면 메뉴가 렌더링되지 않습니다.
	 */
	private function collect_children( $all_items, $parent_id, $sub_key, $menu_index, $sub_index, &$new_sub, $depth ) {
		foreach ( $all_items as $item ) {
			// ▶ parent_id 만으로 부모-자식 판단 (depth 값 비교 제거)
			if ( ( $item['parent_id'] ?? '' ) !== $parent_id ) continue;
			if ( ! empty( $item['hidden'] ) ) continue;

			$type    = $item['type'] ?? 'original';
			$label   = $item['label'] ?? '';
			$item_id = $item['id'] ?? '';

			// 구분선은 서브메뉴에 삽입하지 않음
			if ( $type === 'separator' ) continue;

			if ( $type === 'custom' ) {
				$entry = $this->build_custom_sub_entry( $item );

			} elseif ( strpos( $item_id, 'menu::' ) === 0 ) {
				// ▶ 원래 top-level 항목이 sub 위치로 이동된 경우
				//   $sub_index 에 해당 슬러그가 없을 수 있으므로 $menu_index 에서 변환
				$entry = $this->convert_menu_to_sub_entry( $item, $menu_index );

			} else {
				$entry = $this->find_sub_entry( $item, $sub_index );
			}

			if ( ! $entry ) continue;

			if ( $label !== '' ) {
				$entry[0] = esc_html( $label );
			}

			// ── URL 정규화 ─────────────────────────────────────────────
			// WordPress 는 부모가 .php 파일이 아닌 커스텀 URL 일 때
			// 서브메뉴 슬러그를 admin_url($slug) 로 렌더링해
			// "wp-admin/slug" 같은 잘못된 경로가 생긴다.
			// plain 슬러그를 "admin.php?page=slug" 형식으로 정규화하면
			// WordPress 가 항상 admin_url("admin.php?page=slug") = 올바른 URL 을 생성한다.
			if ( $type !== 'custom' && ! empty( $entry[2] ) ) {
				$s = $entry[2];
				if (
					strpos( $s, '://' ) === false &&
					strpos( $s, '.php' ) === false &&
					strpos( $s, '?' )    === false &&
					strpos( $s, '/' )    !== 0
				) {
					$entry[2] = 'admin.php?page=' . $s;
				}
			}

			// 3뎁스 이상은 CSS 들여쓰기 클래스 부여
			// WordPress $submenu 는 최상위 slug(sub_key) 하나의 키만 지원하므로
			// depth-2, depth-3 모두 동일한 $sub_key 아래에 추가해야 합니다.
			if ( $depth >= 3 ) {
				$entry[4] = trim( ( $entry[4] ?? '' ) . ' he-sorts-depth-3' );
			}

			$new_sub[ $sub_key ][] = $entry;

			// 최대 3뎁스까지만 재귀 (depth-3 자식 → 3뎁스 CSS 처리, 동일 sub_key 사용)
			if ( $depth < 3 ) {
				$this->collect_children( $all_items, $item_id, $sub_key, $menu_index, $sub_index, $new_sub, $depth + 1 );
			}
		}
	}

	/**
	 * 원래 $menu 에 있던 top-level 항목을 $submenu 엔트리 형식으로 변환합니다.
	 * $menu 엔트리: [label, cap, slug, title, class, hook, icon]
	 * $submenu 엔트리: [label, cap, slug, title, class]
	 */
	private function convert_menu_to_sub_entry( $item, $menu_index ) {
		$slug = $item['wp_slug'] ?? '';
		$orig = $menu_index[ $slug ] ?? null;
		if ( ! $orig ) return null;

		return array(
			$orig[0],                   // label
			$orig[1],                   // capability
			$orig[2],                   // slug / URL (그대로 사용 — WP 가 올바르게 링크 생성)
			$orig[3] ?? $orig[0],       // page title
			'',                         // class (아이콘 없음)
		);
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

		// ① 원본 부모에서 먼저 검색 (가장 정확)
		if ( ! empty( $sub_index[ $orig_parent ][ $slug ] ) ) {
			return $sub_index[ $orig_parent ][ $slug ];
		}

		// ② 원본 부모에 없으면 전체 $sub_index 에서 slug 로 탐색합니다.
		//    사용자가 서브메뉴를 다른 상위 항목 아래로 이동시킨 경우에 해당합니다.
		//    단, slug 가 여러 부모에 중복 등록된 경우를 대비해 최초 일치 항목만 반환합니다.
		foreach ( $sub_index as $parent_slug => $entries ) {
			if ( $parent_slug === $orig_parent ) continue; // ①에서 이미 확인
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
