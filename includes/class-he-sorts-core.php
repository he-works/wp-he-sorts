<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class HE_Sorts_Core {

	/**
	 * admin_menu 훅 실행 전 원본 메뉴 스냅샷
	 */
	private static $original_menu    = array();
	private static $original_submenu = array();

	public function register_hooks() {
		// priority 998: 모든 플러그인이 메뉴를 등록한 뒤 스냅샷 저장
		add_action( 'admin_menu', array( $this, 'capture_original_menu' ), 998 );
		// priority 9999: 스냅샷 이후, WP 렌더링 직전에 커스텀 순서 적용
		add_action( 'admin_menu', array( $this, 'apply_custom_order' ), 9999 );
	}

	/**
	 * 원본 메뉴 상태를 static 프로퍼티에 저장합니다.
	 * AJAX 핸들러에서 HE_Sorts_Core::get_original_menu() 로 접근합니다.
	 */
	public function capture_original_menu() {
		global $menu, $submenu;
		self::$original_menu    = is_array( $menu )    ? $menu    : array();
		self::$original_submenu = is_array( $submenu ) ? $submenu : array();
	}

	/**
	 * 저장된 설정을 읽어 $menu / $submenu 전역 변수를 재작성합니다.
	 */
	public function apply_custom_order() {
		global $menu, $submenu;

		$config = get_option( 'he_sorts_config', array() );
		if ( empty( $config ) || empty( $config['items'] ) ) {
			return;
		}

		$items = $config['items'];

		// ── 1. 커스텀 항목을 WP 메뉴 시스템에 등록 ────────────────────
		foreach ( $items as $item ) {
			if ( $item['type'] !== 'custom' ) {
				continue;
			}
			if ( ! empty( $item['hidden'] ) ) {
				continue;
			}

			$url        = $item['url'] ?? '#';
			$label      = $item['label'] ?? 'Custom';
			$capability = $item['capability'] ?? 'read';
			$icon       = $item['icon'] ?? 'dashicons-admin-generic';
			$target     = $item['target'] ?? '_self';

			// 외부 URL 이면 WP 페이지 등록 없이 $menu/$submenu 직접 조작하므로 skip
			if ( $this->is_external_url( $url ) ) {
				continue;
			}

			if ( $item['depth'] === 1 ) {
				if ( ! isset( $GLOBALS['_registered_pages'][ $url ] ) ) {
					add_menu_page( $label, $label, $capability, $url, '__return_empty_string', $icon, 999 );
				}
			} else {
				$wp_parent_slug = $this->resolve_wp_parent_slug( $item, $items );
				if ( $wp_parent_slug ) {
					add_submenu_page( $wp_parent_slug, $label, $label, $capability, $url, '__return_empty_string' );
				}
			}
		}

		// ── 2. 원본 메뉴를 slug 기준으로 인덱싱 ─────────────────────────
		$menu_by_slug   = array();
		foreach ( $menu as $pos => $entry ) {
			if ( ! empty( $entry[2] ) ) {
				$menu_by_slug[ $entry[2] ] = $entry;
			}
		}

		$submenu_by_key = array(); // [parent_slug][item_slug] = entry
		foreach ( $submenu as $parent_slug => $children ) {
			if ( ! is_array( $children ) ) {
				continue;
			}
			foreach ( $children as $entry ) {
				if ( ! empty( $entry[2] ) ) {
					$submenu_by_key[ $parent_slug ][ $entry[2] ] = $entry;
				}
			}
		}

		// ── 3. 새로운 $menu 배열 구성 (depth === 1) ───────────────────────
		$new_menu = array();
		$pos      = 10;

		$depth1_items = array_filter( $items, function( $i ) {
			return isset( $i['depth'] ) && $i['depth'] === 1;
		} );

		foreach ( $depth1_items as $item ) {
			if ( ! empty( $item['hidden'] ) ) {
				continue;
			}

			if ( $item['type'] === 'separator' ) {
				// WP 구분선 항목
				$new_menu[ $pos ] = array( '', 'read', 'separator' . $pos, '', 'wp-menu-separator' );
				$pos += 10;
				continue;
			}

			$slug  = $item['wp_slug'] ?? '';
			$entry = null;

			if ( $item['type'] === 'custom' ) {
				$url = $item['url'] ?? '#';
				if ( $this->is_external_url( $url ) ) {
					// 외부 URL: 직접 entry 생성
					$target_attr = ( ( $item['target'] ?? '_self' ) === '_blank' ) ? ' target="_blank"' : '';
					$entry = array(
						esc_html( $item['label'] ?? 'Link' ),
						$item['capability'] ?? 'read',
						esc_url_raw( $url ),
						esc_html( $item['label'] ?? 'Link' ),
						'menu-top he-sorts-custom-item',
						'menu-he-sorts-' . sanitize_html_class( $item['id'] ?? 'custom' ),
						$item['icon'] ?? 'dashicons-admin-generic',
					);
				} else {
					// add_menu_page 로 등록한 커스텀 항목
					$entry = $menu_by_slug[ $url ] ?? null;
				}
			} else {
				// 원본 WP 메뉴 항목
				$entry = $menu_by_slug[ $slug ] ?? null;
			}

			if ( ! $entry ) {
				continue;
			}

			// 라벨 덮어쓰기
			if ( ! empty( $item['label'] ) ) {
				$entry[0] = esc_html( $item['label'] );
			}

			$new_menu[ $pos ] = $entry;
			$pos += 10;
		}

		// ── 4. 새로운 $submenu 배열 구성 (depth 2, 3) ────────────────────
		$new_submenu = array();

		foreach ( $depth1_items as $depth1_item ) {
			if ( ! empty( $depth1_item['hidden'] ) ) {
				continue;
			}

			$parent_slug = $depth1_item['wp_slug'] ?? '';
			if ( $depth1_item['type'] === 'custom' ) {
				$parent_slug = $depth1_item['url'] ?? '#';
			}

			// depth-2 자식 항목 수집
			$depth2_items = array_filter( $items, function( $i ) use ( $depth1_item ) {
				return isset( $i['depth'] ) && $i['depth'] === 2 && ( $i['parent_id'] ?? '' ) === ( $depth1_item['id'] ?? '' );
			} );

			foreach ( $depth2_items as $depth2_item ) {
				if ( ! empty( $depth2_item['hidden'] ) ) {
					continue;
				}

				$entry2 = $this->resolve_submenu_entry( $depth2_item, $submenu_by_key, $parent_slug );
				if ( ! $entry2 ) {
					continue;
				}

				if ( ! empty( $depth2_item['label'] ) ) {
					$entry2[0] = esc_html( $depth2_item['label'] );
				}

				$new_submenu[ $parent_slug ][] = $entry2;

				// depth-3 자식 항목 수집
				$depth3_items = array_filter( $items, function( $i ) use ( $depth2_item ) {
					return isset( $i['depth'] ) && $i['depth'] === 3 && ( $i['parent_id'] ?? '' ) === ( $depth2_item['id'] ?? '' );
				} );

				foreach ( $depth3_items as $depth3_item ) {
					if ( ! empty( $depth3_item['hidden'] ) ) {
						continue;
					}

					$entry3 = $this->resolve_submenu_entry( $depth3_item, $submenu_by_key, $parent_slug );
					if ( ! $entry3 ) {
						continue;
					}

					if ( ! empty( $depth3_item['label'] ) ) {
						$entry3[0] = esc_html( $depth3_item['label'] );
					}

					// depth-3 CSS 클래스 추가 (시각적 들여쓰기용)
					$entry3[4] = trim( ( $entry3[4] ?? '' ) . ' he-sorts-depth-3' );

					$new_submenu[ $parent_slug ][] = $entry3;
				}
			}
		}

		// ── 5. 전역 변수 교체 ────────────────────────────────────────────
		$menu    = $new_menu;
		$submenu = $new_submenu;
		ksort( $menu );
	}

	/**
	 * AJAX 핸들러에서 원본 메뉴를 가져가기 위한 공개 접근자
	 */
	public static function get_original_menu() {
		return array(
			'menu'    => self::$original_menu,
			'submenu' => self::$original_submenu,
		);
	}

	/**
	 * 현재 저장된 설정과 원본 메뉴를 병합하여 에디터용 데이터를 반환합니다.
	 * - 설정에 있는 항목: 설정 순서대로 포함
	 * - 원본 메뉴에만 있는 항목: 뒤에 "unmanaged" 로 추가
	 */
	public static function get_merged_menu_for_editor() {
		$original = self::get_original_menu();
		$config   = get_option( 'he_sorts_config', array() );
		$items    = $config['items'] ?? array();

		// 설정에 등록된 ID 목록
		$managed_ids = array();
		foreach ( $items as $item ) {
			$managed_ids[] = $item['id'];
		}

		// 원본 메뉴에서 아직 설정에 없는 항목을 수집
		$unmanaged = array();

		foreach ( $original['menu'] as $pos => $entry ) {
			if ( empty( $entry[2] ) ) {
				continue;
			}
			$slug = $entry[2];
			$id   = 'menu::' . $slug;

			if ( ! in_array( $id, $managed_ids, true ) ) {
				$label = self::strip_menu_badge( $entry[0] );
				$unmanaged[] = array(
					'id'        => $id,
					'type'      => 'original',
					'depth'     => 1,
					'wp_slug'   => $slug,
					'parent_id' => null,
					'label'     => $label,
					'icon'      => $entry[6] ?? '',
					'hidden'    => false,
					'unmanaged' => true,
				);

				// 해당 항목의 하위 메뉴도 수집
				if ( ! empty( $original['submenu'][ $slug ] ) ) {
					foreach ( $original['submenu'][ $slug ] as $sub_entry ) {
						if ( empty( $sub_entry[2] ) ) {
							continue;
						}
						$sub_slug = $sub_entry[2];
						$sub_id   = 'sub::' . $slug . '::' . $sub_slug;

						if ( ! in_array( $sub_id, $managed_ids, true ) ) {
							$unmanaged[] = array(
								'id'        => $sub_id,
								'type'      => 'original',
								'depth'     => 2,
								'wp_slug'   => $sub_slug,
								'parent_id' => $id,
								'label'     => self::strip_menu_badge( $sub_entry[0] ),
								'hidden'    => false,
								'unmanaged' => true,
							);
						}
					}
				}
			}
		}

		// 설정 항목에 원본 라벨/아이콘 정보 보강
		$enriched = array();
		foreach ( $items as $item ) {
			$enriched_item = $item;

			if ( $item['type'] === 'original' ) {
				$wp_slug = $item['wp_slug'] ?? '';
				if ( $item['depth'] === 1 ) {
					foreach ( $original['menu'] as $entry ) {
						if ( ( $entry[2] ?? '' ) === $wp_slug ) {
							$enriched_item['original_label'] = self::strip_menu_badge( $entry[0] );
							$enriched_item['icon']           = $entry[6] ?? '';
							break;
						}
					}
				} else {
					// depth 2, 3
					$id_parts    = explode( '::', $item['id'], 3 );
					$orig_parent = $id_parts[1] ?? '';
					if ( ! empty( $original['submenu'][ $orig_parent ] ) ) {
						foreach ( $original['submenu'][ $orig_parent ] as $sub_entry ) {
							if ( ( $sub_entry[2] ?? '' ) === $wp_slug ) {
								$enriched_item['original_label'] = self::strip_menu_badge( $sub_entry[0] );
								break;
							}
						}
					}
				}
			}

			$enriched[] = $enriched_item;
		}

		return array(
			'items'     => $enriched,
			'unmanaged' => $unmanaged,
		);
	}

	// ── Private helpers ───────────────────────────────────────────────────

	/**
	 * submenu 항목을 $submenu_by_key 에서 찾아 반환합니다.
	 * 원본 부모 슬러그를 ID에서 추출하여 정확히 찾습니다.
	 */
	private function resolve_submenu_entry( $item, $submenu_by_key, $current_parent_slug ) {
		$slug = $item['wp_slug'] ?? '';

		if ( $item['type'] === 'custom' ) {
			$url = $item['url'] ?? '#';
			if ( $this->is_external_url( $url ) ) {
				return array(
					esc_html( $item['label'] ?? 'Link' ),
					$item['capability'] ?? 'read',
					esc_url_raw( $url ),
					esc_html( $item['label'] ?? 'Link' ),
					'he-sorts-custom-item',
				);
			}
			// add_submenu_page 로 등록한 항목
			return $submenu_by_key[ $current_parent_slug ][ $url ] ?? null;
		}

		// original 항목: ID 에서 원본 부모 슬러그 추출
		$id_parts    = explode( '::', $item['id'], 3 );
		$orig_parent = $id_parts[1] ?? '';

		if ( ! empty( $submenu_by_key[ $orig_parent ][ $slug ] ) ) {
			return $submenu_by_key[ $orig_parent ][ $slug ];
		}

		// 원본 부모를 못 찾으면 전체 submenu 에서 검색 (메뉴 이동 케이스)
		foreach ( $submenu_by_key as $entries ) {
			if ( ! empty( $entries[ $slug ] ) ) {
				return $entries[ $slug ];
			}
		}

		return null;
	}

	/**
	 * 커스텀 항목의 depth-1 부모 WP 슬러그를 반환합니다.
	 */
	private function resolve_wp_parent_slug( $item, $items ) {
		$parent_id = $item['parent_id'] ?? null;
		if ( ! $parent_id ) {
			return null;
		}

		// parent_id 로 depth-1 항목 검색
		foreach ( $items as $candidate ) {
			if ( ( $candidate['id'] ?? '' ) === $parent_id ) {
				if ( ( $candidate['depth'] ?? 0 ) === 1 ) {
					return $candidate['wp_slug'] ?? ( $candidate['url'] ?? null );
				}
				// depth-2 부모이면 그 부모의 부모를 재귀 검색
				return $this->resolve_wp_parent_slug( $candidate, $items );
			}
		}

		return null;
	}

	/**
	 * URL이 외부 URL인지 확인합니다.
	 */
	private function is_external_url( $url ) {
		return preg_match( '#^https?://#i', $url ) || ( strpos( $url, '/' ) === 0 );
	}

	/**
	 * 메뉴 라벨에서 WP 알림 배지(숫자 등)를 제거합니다.
	 */
	public static function strip_menu_badge( $label ) {
		return trim( preg_replace( '/<span[^>]*>.*?<\/span>/s', '', $label ) );
	}
}
