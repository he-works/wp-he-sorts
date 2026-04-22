<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function he_sorts_page_editor() {
	$merged    = HE_Sorts_Core::get_merged_menu_for_editor();
	$items     = $merged['items'];
	$unmanaged = $merged['unmanaged'];

	if ( empty( $items ) ) {
		// 설정이 없으면 원본 메뉴로 초기 목록 생성 (unmanaged 와 중복 안 됨)
		$items = he_sorts_build_default_items();
	} else {
		// 설정에 없는 항목만 뒤에 추가
		$items = array_merge( $items, $unmanaged );
	}

	// flat 렌더링 (중첩 트리 대신 순서 + depth 값만 사용)
	$flat = he_sorts_flatten_to_ordered( $items );
	?>
	<div class="wrap he-sorts-wrap">

		<!-- 헤더 -->
		<div class="he-sorts-header">
			<div class="he-sorts-header-left">
				<div class="he-sorts-logo">
					<span class="dashicons dashicons-randomize"></span>
				</div>
				<div>
					<h1>HE SORTS</h1>
					<span class="he-sorts-version">v<?php echo esc_html( HE_SORTS_VERSION ); ?></span>
				</div>
			</div>
		</div>

		<!-- 알림 토스트 -->
		<div id="he-sorts-toast" class="he-sorts-toast" aria-live="polite"></div>

		<!-- 본문: 트리 | 버튼 사이드바 | 속성 패널 -->
		<div class="he-sorts-body">

			<!-- 좌: 메뉴 트리 -->
			<div class="he-sorts-tree-panel">
				<div class="he-sorts-tree" id="he-sorts-tree">
					<div class="he-sorts-flat-list" id="tree-root">
						<?php he_sorts_render_flat( $flat ); ?>
					</div>
				</div>
			</div>

			<!-- 중: 버튼 사이드바 -->
			<div class="he-sorts-sidebar">
				<button id="he-sorts-save" class="he-sorts-btn he-sorts-btn--primary">
					<span class="dashicons dashicons-cloud-saved"></span>
					<span>저장</span>
				</button>
				<button id="he-sorts-add-item" class="he-sorts-btn he-sorts-btn--secondary">
					<span class="dashicons dashicons-plus-alt2"></span>
					<span>항목 추가</span>
				</button>
				<button id="he-sorts-add-sep" class="he-sorts-btn he-sorts-btn--ghost">
					<span class="dashicons dashicons-minus"></span>
					<span>구분선</span>
				</button>
				<button id="he-sorts-reset" class="he-sorts-btn he-sorts-btn--ghost">
					<span class="dashicons dashicons-image-rotate"></span>
					<span>초기화</span>
				</button>
			</div>

			<!-- 우: 속성 패널 -->
			<div class="he-sorts-props-panel" id="he-sorts-props">
				<div class="he-sorts-props-empty" id="props-empty">
					<span class="dashicons dashicons-edit"></span>
					<p>항목을 클릭하면<br>여기서 편집합니다.</p>
				</div>
				<div class="he-sorts-props-form" id="props-form" style="display:none;">
					<h3 class="he-sorts-props-title">항목 속성</h3>

					<div class="he-sorts-field">
						<label for="prop-label">표시 이름</label>
						<input type="text" id="prop-label" class="he-sorts-input" placeholder="메뉴 이름">
						<span id="prop-original-label" class="he-sorts-hint"></span>
					</div>

					<div class="he-sorts-field he-sorts-custom-only">
						<label for="prop-url">URL</label>
						<input type="text" id="prop-url" class="he-sorts-input" placeholder="https://example.com">
					</div>

					<div class="he-sorts-field he-sorts-custom-only">
						<label for="prop-icon">아이콘 <small>(Dashicons)</small></label>
						<div class="he-sorts-icon-row">
							<span id="prop-icon-preview" class="dashicons dashicons-admin-generic hs-icon-pick-preview" data-target="prop-icon" data-preview="prop-icon-preview" title="클릭하여 아이콘 선택" style="cursor:pointer;"></span>
							<input type="text" id="prop-icon" class="he-sorts-input" placeholder="dashicons-admin-home">
							<button type="button" class="hs-pick-icon-btn" data-target="prop-icon" data-preview="prop-icon-preview">선택</button>
						</div>
					</div>

					<div class="he-sorts-field he-sorts-custom-only">
						<label for="prop-capability">필요 권한</label>
						<select id="prop-capability" class="he-sorts-select">
							<option value="read">read</option>
							<option value="edit_posts">edit_posts</option>
							<option value="publish_posts">publish_posts</option>
							<option value="manage_options">manage_options</option>
						</select>
					</div>

					<div class="he-sorts-field he-sorts-custom-only">
						<label for="prop-target">링크 대상</label>
						<select id="prop-target" class="he-sorts-select">
							<option value="_self">같은 창</option>
							<option value="_blank">새 창</option>
						</select>
					</div>

					<div class="he-sorts-field">
						<label class="he-sorts-toggle-label">
							<span>숨기기</span>
							<span class="he-sorts-toggle-wrap">
								<input type="checkbox" id="prop-hidden" class="he-sorts-toggle-input">
								<span class="he-sorts-toggle-slider"></span>
							</span>
						</label>
					</div>

					<div class="he-sorts-props-actions">
						<button id="prop-apply" class="he-sorts-btn he-sorts-btn--primary he-sorts-btn--sm">
							<span class="dashicons dashicons-yes"></span> 적용
						</button>
						<button id="prop-delete" class="he-sorts-btn he-sorts-btn--danger he-sorts-btn--sm">
							<span class="dashicons dashicons-trash"></span> 삭제
						</button>
					</div>
				</div>
			</div>

		</div><!-- .he-sorts-body -->
	</div><!-- .he-sorts-wrap -->

	<!-- Dashicons 픽커 팝업 -->
	<div id="hs-icon-picker" class="hs-icon-picker" style="display:none;" aria-modal="true" role="dialog" aria-label="아이콘 선택">
		<div class="hs-icon-picker-box">
			<div class="hs-icon-picker-header">
				<input type="search" id="hs-icon-search" class="he-sorts-input" placeholder="아이콘 검색 (예: home, user, mail…)">
				<button type="button" id="hs-icon-picker-close" class="he-sorts-modal-close" aria-label="닫기">
					<span class="dashicons dashicons-no-alt"></span>
				</button>
			</div>
			<div class="hs-icon-grid" id="hs-icon-grid"></div>
		</div>
	</div>

	<!-- 커스텀 항목 추가 모달 -->
	<div id="he-sorts-modal" class="he-sorts-modal-overlay" style="display:none;">
		<div class="he-sorts-modal">
			<div class="he-sorts-modal-header">
				<h3>커스텀 메뉴 항목 추가</h3>
				<button id="modal-close" class="he-sorts-modal-close">
					<span class="dashicons dashicons-no-alt"></span>
				</button>
			</div>
			<div class="he-sorts-modal-body">
				<div class="he-sorts-field">
					<label for="modal-label">표시 이름 <span class="required">*</span></label>
					<input type="text" id="modal-label" class="he-sorts-input" placeholder="예: 내 사이트">
				</div>
				<div class="he-sorts-field">
					<label for="modal-url">URL <span class="required">*</span></label>
					<input type="text" id="modal-url" class="he-sorts-input" placeholder="예: https://example.com">
				</div>
				<div class="he-sorts-field">
					<label for="modal-icon">아이콘 <small>(Dashicons)</small></label>
					<div class="he-sorts-icon-row">
						<span id="modal-icon-preview" class="dashicons dashicons-admin-generic hs-icon-pick-preview" data-target="modal-icon" data-preview="modal-icon-preview" title="클릭하여 아이콘 선택" style="cursor:pointer;"></span>
						<input type="text" id="modal-icon" class="he-sorts-input" value="dashicons-admin-generic">
						<button type="button" class="hs-pick-icon-btn" data-target="modal-icon" data-preview="modal-icon-preview">선택</button>
					</div>
				</div>
				<div class="he-sorts-field">
					<label for="modal-capability">필요 권한</label>
					<select id="modal-capability" class="he-sorts-select">
						<option value="read">read</option>
						<option value="edit_posts">edit_posts</option>
						<option value="publish_posts">publish_posts</option>
						<option value="manage_options">manage_options</option>
					</select>
				</div>
				<div class="he-sorts-field">
					<label for="modal-target">링크 대상</label>
					<select id="modal-target" class="he-sorts-select">
						<option value="_self">같은 창</option>
						<option value="_blank">새 창</option>
					</select>
				</div>
				<div class="he-sorts-field">
					<label for="modal-depth">추가 위치</label>
					<select id="modal-depth" class="he-sorts-select">
						<option value="1">1뎁스 (상단 메뉴)</option>
						<option value="2">2뎁스 (선택 항목의 하위)</option>
					</select>
				</div>
			</div>
			<div class="he-sorts-modal-footer">
				<button id="modal-cancel" class="he-sorts-btn he-sorts-btn--ghost">취소</button>
				<button id="modal-confirm" class="he-sorts-btn he-sorts-btn--primary">추가</button>
			</div>
		</div>
	</div>
	<?php
}

/**
 * flat items 배열을 depth-first 순서로 정렬하여 반환합니다.
 * (중첩 트리 없이, depth 값 + 순서로만 표현)
 */
function he_sorts_flatten_to_ordered( $items ) {
	// id → item 맵
	$map = array();
	foreach ( $items as $item ) {
		$map[ $item['id'] ] = $item;
		$map[ $item['id'] ]['children'] = array();
	}

	// 자식 연결 (참조 없이 id 목록만)
	$children_of = array(); // [parent_id] => [child_id, ...]
	$roots       = array(); // depth-1 id 목록

	foreach ( $items as $item ) {
		$pid = $item['parent_id'] ?? null;
		if ( $pid && isset( $map[ $pid ] ) ) {
			$children_of[ $pid ][] = $item['id'];
		} else {
			$roots[] = $item['id'];
		}
	}

	// depth-first 순회 → flat ordered list
	$ordered = array();
	he_sorts_dfs( $roots, $children_of, $map, $ordered );

	return $ordered;
}

function he_sorts_dfs( $ids, $children_of, $map, &$ordered ) {
	foreach ( $ids as $id ) {
		if ( ! isset( $map[ $id ] ) ) continue;
		$ordered[] = $map[ $id ];
		if ( ! empty( $children_of[ $id ] ) ) {
			he_sorts_dfs( $children_of[ $id ], $children_of, $map, $ordered );
		}
	}
}

/**
 * flat ordered list 를 HTML 로 출력합니다.
 */
function he_sorts_render_flat( $items ) {
	foreach ( $items as $item ) {
		$depth     = intval( $item['depth'] ?? 1 );
		$type      = $item['type'] ?? 'original';
		$id        = esc_attr( $item['id'] );
		$label     = esc_html( $item['label'] ?? '' );
		$wp_slug   = esc_attr( $item['wp_slug'] ?? '' );
		$parent_id = esc_attr( $item['parent_id'] ?? '' );
		$hidden    = ! empty( $item['hidden'] ) ? 'true' : 'false';
		$icon      = $item['icon'] ?? '';
		$url       = esc_attr( $item['url'] ?? '' );
		$cap       = esc_attr( $item['capability'] ?? '' );
		$target    = esc_attr( $item['target'] ?? '_self' );
		$orig_label = esc_attr( $item['original_label'] ?? $item['label'] ?? '' );
		$unmanaged = ! empty( $item['unmanaged'] ) ? 'true' : 'false';

		$cls = 'he-sorts-item';
		$cls .= ' hs-d' . $depth;
		if ( ! empty( $item['hidden'] ) ) $cls .= ' is-hidden';
		if ( $type === 'separator' )       $cls .= ' he-sorts-separator';

		if ( $type === 'separator' ) {
			echo '<div class="' . $cls . '"'
				. ' data-id="' . $id . '"'
				. ' data-type="separator"'
				. ' data-depth="' . $depth . '"'
				. ' data-hidden="' . $hidden . '">'
				. '<span class="he-sorts-drag-handle dashicons dashicons-move"></span>'
				. '<span class="hs-sep-line"></span>'
				. '<div class="he-sorts-item-actions">'
				. '<button class="he-sorts-action-btn he-sorts-toggle-visibility" data-hidden="' . $hidden . '" title="숨기기">'
				. '<span class="dashicons ' . ( ! empty( $item['hidden'] ) ? 'dashicons-hidden' : 'dashicons-visibility' ) . '"></span>'
				. '</button>'
				. '</div>'
				. '</div>';
			continue;
		}

		// 아이콘
		if ( $icon && strpos( $icon, 'dashicons-' ) === 0 ) {
			$icon_html = '<span class="dashicons ' . esc_attr( $icon ) . ' hs-icon"></span>';
		} elseif ( $icon && strpos( $icon, 'http' ) === 0 ) {
			$icon_html = '<img src="' . esc_url( $icon ) . '" class="hs-icon hs-icon-img" alt="">';
		} else {
			$icon_html = '<span class="dashicons dashicons-admin-generic hs-icon"></span>';
		}

		echo '<div class="' . $cls . '"'
			. ' data-id="' . $id . '"'
			. ' data-type="' . esc_attr( $type ) . '"'
			. ' data-depth="' . $depth . '"'
			. ' data-wp-slug="' . $wp_slug . '"'
			. ' data-parent-id="' . $parent_id . '"'
			. ' data-label="' . esc_attr( $item['label'] ?? '' ) . '"'
			. ' data-original-label="' . $orig_label . '"'
			. ' data-icon="' . esc_attr( $icon ) . '"'
			. ' data-url="' . $url . '"'
			. ' data-capability="' . $cap . '"'
			. ' data-target="' . $target . '"'
			. ' data-hidden="' . $hidden . '"'
			. ' data-unmanaged="' . $unmanaged . '"'
			. '>';

		echo '<span class="he-sorts-drag-handle dashicons dashicons-move"></span>';
		echo $icon_html;
		echo '<span class="hs-label">' . $label . '</span>';

		if ( ! empty( $item['unmanaged'] ) ) {
			echo '<span class="hs-badge hs-badge--new">새</span>';
		}
		if ( ! empty( $item['hidden'] ) ) {
			echo '<span class="hs-badge hs-badge--hidden">숨김</span>';
		}

		echo '<div class="he-sorts-item-actions">';
		if ( $depth < 3 ) {
			echo '<button class="he-sorts-action-btn he-sorts-indent" title="하위로"><span class="dashicons dashicons-arrow-right-alt"></span></button>';
		}
		if ( $depth > 1 ) {
			echo '<button class="he-sorts-action-btn he-sorts-outdent" title="상위로"><span class="dashicons dashicons-arrow-left-alt"></span></button>';
		}
		echo '<button class="he-sorts-action-btn he-sorts-toggle-visibility" data-hidden="' . $hidden . '" title="숨기기">';
		echo '<span class="dashicons ' . ( ! empty( $item['hidden'] ) ? 'dashicons-hidden' : 'dashicons-visibility' ) . '"></span>';
		echo '</button>';
		echo '</div>'; // .he-sorts-item-actions

		echo '</div>'; // .he-sorts-item
	}
}

/**
 * 원본 메뉴에서 초기 flat items 배열을 생성합니다.
 */
function he_sorts_build_default_items() {
	$original = HE_Sorts_Core::get_original_menu();
	$items    = array();

	foreach ( $original['menu'] as $pos => $entry ) {
		if ( empty( $entry[2] ) ) continue;

		$slug  = $entry[2];
		$label = HE_Sorts_Core::strip_menu_badge( $entry[0] );
		$type  = ( strpos( $entry[4] ?? '', 'wp-menu-separator' ) !== false ) ? 'separator' : 'original';

		$items[] = array(
			'id'        => 'menu::' . $slug,
			'type'      => $type,
			'depth'     => 1,
			'wp_slug'   => $slug,
			'parent_id' => null,
			'label'     => $label,
			'icon'      => $entry[6] ?? '',
			'hidden'    => false,
		);

		if ( ! empty( $original['submenu'][ $slug ] ) ) {
			foreach ( $original['submenu'][ $slug ] as $sub_entry ) {
				if ( empty( $sub_entry[2] ) ) continue;
				$sub_slug = $sub_entry[2];
				$items[]  = array(
					'id'        => 'sub::' . $slug . '::' . $sub_slug,
					'type'      => 'original',
					'depth'     => 2,
					'wp_slug'   => $sub_slug,
					'parent_id' => 'menu::' . $slug,
					'label'     => HE_Sorts_Core::strip_menu_badge( $sub_entry[0] ),
					'hidden'    => false,
				);
			}
		}
	}

	return $items;
}
