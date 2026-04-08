<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 에디터 페이지 메인 렌더링 함수
 */
function he_sorts_page_editor() {
	$merged = HE_Sorts_Core::get_merged_menu_for_editor();
	$items  = $merged['items'];
	$unmanaged = $merged['unmanaged'];

	// 설정이 비어 있으면 원본 메뉴로 초기화
	if ( empty( $items ) ) {
		$items = he_sorts_build_default_items();
		$items = array_merge( $items, $unmanaged );
	} else {
		// unmanaged 항목을 맨 뒤에 추가
		$items = array_merge( $items, $unmanaged );
	}

	// depth-1 트리 구조로 변환
	$tree = he_sorts_build_tree( $items );
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
			<div class="he-sorts-header-actions">
				<button id="he-sorts-add-item" class="he-sorts-btn he-sorts-btn--secondary">
					<span class="dashicons dashicons-plus-alt2"></span>
					<span>항목 추가</span>
				</button>
				<button id="he-sorts-reset" class="he-sorts-btn he-sorts-btn--ghost">
					<span class="dashicons dashicons-image-rotate"></span>
					<span>초기화</span>
				</button>
				<button id="he-sorts-save" class="he-sorts-btn he-sorts-btn--primary">
					<span class="dashicons dashicons-cloud-saved"></span>
					<span>저장</span>
				</button>
			</div>
		</div>

		<!-- 알림 토스트 -->
		<div id="he-sorts-toast" class="he-sorts-toast" aria-live="polite"></div>

		<!-- 본문 -->
		<div class="he-sorts-body">

			<!-- 좌측: 메뉴 트리 -->
			<div class="he-sorts-tree-panel">
				<div class="he-sorts-panel-header">
					<h2>메뉴 구조</h2>
					<p>항목을 드래그하여 순서를 변경하고, <span class="he-sorts-kbd">›</span> <span class="he-sorts-kbd">‹</span> 버튼으로 뎁스를 조정하세요.</p>
				</div>
				<div class="he-sorts-tree" id="he-sorts-tree">
					<div class="he-sorts-tree-list he-sorts-depth-1-list" id="tree-root">
						<?php he_sorts_render_items( $tree ); ?>
					</div>
				</div>
			</div>

			<!-- 우측: 속성 패널 -->
			<div class="he-sorts-props-panel" id="he-sorts-props">
				<div class="he-sorts-props-empty" id="props-empty">
					<span class="dashicons dashicons-editor-help"></span>
					<p>좌측에서 메뉴 항목을 클릭하면<br>여기서 속성을 편집할 수 있습니다.</p>
				</div>

				<div class="he-sorts-props-form" id="props-form" style="display:none;">
					<h3 class="he-sorts-props-title">항목 속성</h3>

					<div class="he-sorts-field">
						<label for="prop-label">표시 이름</label>
						<div class="he-sorts-input-group">
							<input type="text" id="prop-label" class="he-sorts-input" placeholder="메뉴 이름">
							<span id="prop-original-label" class="he-sorts-hint"></span>
						</div>
					</div>

					<div class="he-sorts-field he-sorts-custom-only">
						<label for="prop-url">URL</label>
						<input type="text" id="prop-url" class="he-sorts-input" placeholder="https://example.com 또는 /경로">
					</div>

					<div class="he-sorts-field he-sorts-custom-only">
						<label for="prop-icon">아이콘 <small>(Dashicons)</small></label>
						<div class="he-sorts-icon-input-wrap">
							<span id="prop-icon-preview" class="dashicons dashicons-admin-generic"></span>
							<input type="text" id="prop-icon" class="he-sorts-input" placeholder="dashicons-admin-home">
						</div>
					</div>

					<div class="he-sorts-field he-sorts-custom-only">
						<label for="prop-capability">필요 권한</label>
						<select id="prop-capability" class="he-sorts-select">
							<option value="read">read (모든 사용자)</option>
							<option value="edit_posts">edit_posts (작성자+)</option>
							<option value="publish_posts">publish_posts (편집자+)</option>
							<option value="manage_options">manage_options (관리자)</option>
						</select>
					</div>

					<div class="he-sorts-field he-sorts-custom-only">
						<label for="prop-target">링크 대상</label>
						<select id="prop-target" class="he-sorts-select">
							<option value="_self">같은 창</option>
							<option value="_blank">새 창 (새 탭)</option>
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
						<p class="he-sorts-hint">체크하면 이 항목이 메뉴에서 숨겨집니다.</p>
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

	<!-- 커스텀 항목 추가 모달 -->
	<div id="he-sorts-modal" class="he-sorts-modal-overlay" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<div class="he-sorts-modal">
			<div class="he-sorts-modal-header">
				<h3 id="modal-title">커스텀 메뉴 항목 추가</h3>
				<button id="modal-close" class="he-sorts-modal-close" aria-label="닫기">
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
					<label for="modal-icon">아이콘 <small>(Dashicons 클래스명)</small></label>
					<div class="he-sorts-icon-input-wrap">
						<span id="modal-icon-preview" class="dashicons dashicons-admin-generic"></span>
						<input type="text" id="modal-icon" class="he-sorts-input" value="dashicons-admin-generic" placeholder="dashicons-admin-home">
					</div>
				</div>
				<div class="he-sorts-field">
					<label for="modal-capability">필요 권한</label>
					<select id="modal-capability" class="he-sorts-select">
						<option value="read">read (모든 사용자)</option>
						<option value="edit_posts">edit_posts (작성자+)</option>
						<option value="publish_posts">publish_posts (편집자+)</option>
						<option value="manage_options">manage_options (관리자)</option>
					</select>
				</div>
				<div class="he-sorts-field">
					<label for="modal-target">링크 대상</label>
					<select id="modal-target" class="he-sorts-select">
						<option value="_self">같은 창</option>
						<option value="_blank">새 창 (새 탭)</option>
					</select>
				</div>
				<div class="he-sorts-field">
					<label for="modal-depth">추가 위치</label>
					<select id="modal-depth" class="he-sorts-select">
						<option value="1">1뎁스 (상단 메뉴)</option>
						<option value="2">2뎁스 (현재 선택 항목의 하위)</option>
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
 * 원본 메뉴에서 초기 설정 items 배열을 생성합니다.
 */
function he_sorts_build_default_items() {
	$original = HE_Sorts_Core::get_original_menu();
	$items    = array();

	foreach ( $original['menu'] as $pos => $entry ) {
		if ( empty( $entry[2] ) ) {
			continue;
		}
		$slug  = $entry[2];
		$label = HE_Sorts_Core::strip_menu_badge( $entry[0] );

		$item = array(
			'id'        => 'menu::' . $slug,
			'type'      => ( strpos( $entry[4] ?? '', 'wp-menu-separator' ) !== false ) ? 'separator' : 'original',
			'depth'     => 1,
			'wp_slug'   => $slug,
			'parent_id' => null,
			'label'     => $label,
			'icon'      => $entry[6] ?? '',
			'hidden'    => false,
		);
		$items[] = $item;

		if ( ! empty( $original['submenu'][ $slug ] ) ) {
			foreach ( $original['submenu'][ $slug ] as $sub_entry ) {
				if ( empty( $sub_entry[2] ) ) {
					continue;
				}
				$sub_slug  = $sub_entry[2];
				$sub_label = HE_Sorts_Core::strip_menu_badge( $sub_entry[0] );

				$items[] = array(
					'id'        => 'sub::' . $slug . '::' . $sub_slug,
					'type'      => 'original',
					'depth'     => 2,
					'wp_slug'   => $sub_slug,
					'parent_id' => 'menu::' . $slug,
					'label'     => $sub_label,
					'hidden'    => false,
				);
			}
		}
	}

	return $items;
}

/**
 * flat items 배열을 중첩 트리 구조로 변환합니다.
 */
function he_sorts_build_tree( $items ) {
	$map    = array();
	$tree   = array();

	foreach ( $items as $item ) {
		$id         = $item['id'];
		$map[ $id ] = $item;
		$map[ $id ]['children'] = array();
	}

	foreach ( $items as $item ) {
		$id        = $item['id'];
		$parent_id = $item['parent_id'] ?? null;

		if ( $parent_id && isset( $map[ $parent_id ] ) ) {
			$map[ $parent_id ]['children'][] = &$map[ $id ];
		} else {
			$tree[] = &$map[ $id ];
		}
	}

	return $tree;
}

/**
 * 트리 항목들을 HTML로 출력합니다.
 */
function he_sorts_render_items( $items, $depth = 1 ) {
	foreach ( $items as $item ) {
		he_sorts_render_item( $item, $depth );
	}
}

/**
 * 단일 항목을 HTML로 출력합니다.
 */
function he_sorts_render_item( $item, $depth = 1 ) {
	$id        = esc_attr( $item['id'] );
	$type      = esc_attr( $item['type'] );
	$label     = esc_html( $item['label'] ?? '' );
	$wp_slug   = esc_attr( $item['wp_slug'] ?? '' );
	$parent_id = esc_attr( $item['parent_id'] ?? '' );
	$hidden    = ! empty( $item['hidden'] ) ? 'true' : 'false';
	$icon      = esc_attr( $item['icon'] ?? '' );
	$url       = esc_attr( $item['url'] ?? '' );
	$capability = esc_attr( $item['capability'] ?? '' );
	$target    = esc_attr( $item['target'] ?? '_self' );
	$orig_label = esc_attr( $item['original_label'] ?? $item['label'] ?? '' );
	$unmanaged = ! empty( $item['unmanaged'] ) ? 'true' : 'false';
	$is_hidden_class = ! empty( $item['hidden'] ) ? ' is-hidden' : '';

	if ( $type === 'separator' ) {
		echo '<div class="he-sorts-item he-sorts-separator" data-id="' . $id . '" data-type="separator" data-depth="' . esc_attr( $depth ) . '">';
		echo '<span class="he-sorts-drag-handle dashicons dashicons-move"></span>';
		echo '<span class="he-sorts-sep-line"></span>';
		echo '<div class="he-sorts-item-actions">';
		echo '<button class="he-sorts-action-btn he-sorts-toggle-visibility" title="숨기기" data-hidden="' . $hidden . '">';
		echo '<span class="dashicons ' . ( ! empty( $item['hidden'] ) ? 'dashicons-hidden' : 'dashicons-visibility' ) . '"></span>';
		echo '</button>';
		echo '</div>';
		echo '</div>';
		return;
	}

	// 아이콘 결정
	$icon_html = '';
	if ( $icon && strpos( $icon, 'dashicons-' ) === 0 ) {
		$icon_html = '<span class="dashicons ' . esc_attr( $icon ) . ' he-sorts-item-icon"></span>';
	} elseif ( $icon && strpos( $icon, 'http' ) === 0 ) {
		$icon_html = '<img src="' . esc_url( $icon ) . '" class="he-sorts-item-icon he-sorts-item-icon-img" alt="">';
	} else {
		$icon_html = '<span class="dashicons dashicons-admin-generic he-sorts-item-icon"></span>';
	}

	echo '<div class="he-sorts-item depth-' . esc_attr( $depth ) . $is_hidden_class . '"'
		. ' data-id="' . $id . '"'
		. ' data-type="' . $type . '"'
		. ' data-depth="' . esc_attr( $depth ) . '"'
		. ' data-wp-slug="' . $wp_slug . '"'
		. ' data-parent-id="' . $parent_id . '"'
		. ' data-label="' . esc_attr( $item['label'] ?? '' ) . '"'
		. ' data-original-label="' . $orig_label . '"'
		. ' data-icon="' . $icon . '"'
		. ' data-url="' . $url . '"'
		. ' data-capability="' . $capability . '"'
		. ' data-target="' . $target . '"'
		. ' data-hidden="' . $hidden . '"'
		. ' data-unmanaged="' . $unmanaged . '"'
		. '>';

	echo '<span class="he-sorts-drag-handle dashicons dashicons-move" title="드래그하여 이동"></span>';
	echo $icon_html;
	echo '<span class="he-sorts-item-label">' . $label . '</span>';

	if ( ! empty( $item['unmanaged'] ) ) {
		echo '<span class="he-sorts-badge he-sorts-badge--new">새 항목</span>';
	}
	if ( ! empty( $item['hidden'] ) ) {
		echo '<span class="he-sorts-badge he-sorts-badge--hidden">숨김</span>';
	}

	echo '<div class="he-sorts-item-actions">';
	if ( $depth < 3 ) {
		echo '<button class="he-sorts-action-btn he-sorts-indent" title="하위 항목으로 (들여쓰기)">';
		echo '<span class="dashicons dashicons-arrow-right-alt"></span>';
		echo '</button>';
	}
	if ( $depth > 1 ) {
		echo '<button class="he-sorts-action-btn he-sorts-outdent" title="상위 항목으로 (내보내기)">';
		echo '<span class="dashicons dashicons-arrow-left-alt"></span>';
		echo '</button>';
	}
	echo '<button class="he-sorts-action-btn he-sorts-toggle-visibility" title="' . ( ! empty( $item['hidden'] ) ? '표시' : '숨기기' ) . '" data-hidden="' . $hidden . '">';
	echo '<span class="dashicons ' . ( ! empty( $item['hidden'] ) ? 'dashicons-hidden' : 'dashicons-visibility' ) . '"></span>';
	echo '</button>';
	echo '</div>'; // .he-sorts-item-actions

	// 자식 항목 렌더링
	if ( ! empty( $item['children'] ) && $depth < 3 ) {
		echo '<div class="he-sorts-children he-sorts-depth-' . esc_attr( $depth + 1 ) . '-list" data-parent-id="' . $id . '">';
		he_sorts_render_items( $item['children'], $depth + 1 );
		echo '</div>';
	} elseif ( $depth < 3 ) {
		// 빈 자식 컨테이너 (드래그 타겟용)
		echo '<div class="he-sorts-children he-sorts-depth-' . esc_attr( $depth + 1 ) . '-list he-sorts-empty-children" data-parent-id="' . $id . '"></div>';
	}

	echo '</div>'; // .he-sorts-item
}
