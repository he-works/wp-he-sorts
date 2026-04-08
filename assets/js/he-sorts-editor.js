/**
 * HE SORTS - 에디터 페이지 스크립트
 * SortableJS 기반 드래그 앤 드롭 메뉴 에디터
 */
(function () {
	'use strict';

	// heSortsData: ajaxUrl, nonce, i18n (wp_localize_script 로 전달)
	var i18n = heSortsData.i18n;

	// ── 상태 ──────────────────────────────────────────────────────
	var selectedItem = null;  // 현재 선택된 .he-sorts-item 요소
	var sortableInstances = []; // 등록된 Sortable 인스턴스 목록

	// ── 초기화 ──────────────────────────────────────────────────────
	function init() {
		initSortables();
		bindEvents();
	}

	// ── SortableJS 초기화 ──────────────────────────────────────────
	function initSortables() {
		// 기존 인스턴스 파괴
		sortableInstances.forEach(function (s) { s.destroy(); });
		sortableInstances = [];

		// 모든 트리 리스트에 SortableJS 적용
		var lists = document.querySelectorAll('.he-sorts-tree-list, .he-sorts-children');
		lists.forEach(function (list) {
			var depth = getListDepth(list);
			var s = Sortable.create(list, {
				group: {
					name: 'he-sorts',
					put: function (to) {
						var toDepth = getListDepth(to.el);
						// 이동 목적지 depth 제한: 최대 3뎁스
						return toDepth <= 3;
					},
				},
				handle: '.he-sorts-drag-handle',
				animation: 150,
				fallbackOnBody: true,
				swapThreshold: 0.65,
				ghostClass: 'sortable-ghost',
				dragClass: 'sortable-drag',
				onEnd: function (evt) {
					// 이동 후 item의 depth 데이터 업데이트
					updateDepths();
					// 빈 컨테이너 클래스 업데이트
					updateEmptyContainers();
				},
				onOver: function (evt) {
					var toEl = evt.to;
					if (toEl.classList.contains('he-sorts-empty-children')) {
						toEl.classList.add('sortable-over');
					}
				},
				onLeave: function (evt) {
					evt.to.classList.remove('sortable-over');
				},
			});
			sortableInstances.push(s);
		});
	}

	/**
	 * 리스트 컨테이너의 depth를 계산합니다.
	 */
	function getListDepth(el) {
		if (el.classList.contains('he-sorts-depth-1-list') || el.id === 'tree-root') return 1;
		if (el.classList.contains('he-sorts-depth-2-list')) return 2;
		if (el.classList.contains('he-sorts-depth-3-list')) return 3;
		// 부모 .he-sorts-item 의 depth + 1
		var parentItem = el.closest('.he-sorts-item');
		if (parentItem) {
			return parseInt(parentItem.dataset.depth || '1', 10) + 1;
		}
		return 1;
	}

	/**
	 * 드래그 후 모든 항목의 data-depth를 갱신합니다.
	 */
	function updateDepths() {
		var root = document.getElementById('tree-root');
		if (!root) return;
		walkItems(root, null, 1);
	}

	function walkItems(container, parentId, depth) {
		var directItems = getDirectChildren(container);
		directItems.forEach(function (item) {
			item.dataset.depth = String(depth);
			item.dataset.parentId = parentId || '';

			// depth 클래스 업데이트
			item.classList.remove('depth-1', 'depth-2', 'depth-3');
			item.classList.add('depth-' + depth);

			// 자식 컨테이너 재귀
			var childContainer = item.querySelector('.he-sorts-children');
			if (childContainer) {
				walkItems(childContainer, item.dataset.id, depth + 1);
			}
		});
	}

	function getDirectChildren(container) {
		var result = [];
		var children = container.children;
		for (var i = 0; i < children.length; i++) {
			if (children[i].classList.contains('he-sorts-item')) {
				result.push(children[i]);
			}
		}
		return result;
	}

	/**
	 * 비어 있는 자식 컨테이너 클래스를 업데이트합니다.
	 */
	function updateEmptyContainers() {
		var containers = document.querySelectorAll('.he-sorts-children');
		containers.forEach(function (c) {
			var hasItems = c.querySelector('.he-sorts-item');
			if (hasItems) {
				c.classList.remove('he-sorts-empty-children');
			} else {
				c.classList.add('he-sorts-empty-children');
			}
			c.classList.remove('sortable-over');
		});
	}

	// ── 이벤트 바인딩 ─────────────────────────────────────────────
	function bindEvents() {
		var tree = document.getElementById('he-sorts-tree');
		if (!tree) return;

		// 이벤트 위임
		tree.addEventListener('click', function (e) {
			var item = e.target.closest('.he-sorts-item');
			if (!item) return;

			// 들여쓰기 버튼
			if (e.target.closest('.he-sorts-indent')) {
				e.stopPropagation();
				handleIndent(item);
				return;
			}

			// 내보내기 버튼
			if (e.target.closest('.he-sorts-outdent')) {
				e.stopPropagation();
				handleOutdent(item);
				return;
			}

			// 숨기기 토글 버튼
			if (e.target.closest('.he-sorts-toggle-visibility')) {
				e.stopPropagation();
				handleToggleVisibility(item, e.target.closest('.he-sorts-toggle-visibility'));
				return;
			}

			// 항목 선택 (액션 버튼 제외)
			if (!e.target.closest('.he-sorts-item-actions') && !e.target.closest('.he-sorts-drag-handle')) {
				selectItem(item);
			}
		});

		// 저장 버튼
		document.getElementById('he-sorts-save').addEventListener('click', handleSave);

		// 초기화 버튼
		document.getElementById('he-sorts-reset').addEventListener('click', handleReset);

		// 항목 추가 버튼
		document.getElementById('he-sorts-add-item').addEventListener('click', function () {
			openModal();
		});

		// 속성 패널 적용 버튼
		document.getElementById('prop-apply').addEventListener('click', handlePropsApply);

		// 속성 패널 삭제 버튼
		document.getElementById('prop-delete').addEventListener('click', handlePropsDelete);

		// 아이콘 미리보기 (에디터 패널)
		var propIcon = document.getElementById('prop-icon');
		if (propIcon) {
			propIcon.addEventListener('input', function () {
				updateIconPreview('prop-icon-preview', this.value);
			});
		}

		// 모달 이벤트
		document.getElementById('modal-close').addEventListener('click', closeModal);
		document.getElementById('modal-cancel').addEventListener('click', closeModal);
		document.getElementById('modal-confirm').addEventListener('click', handleModalConfirm);

		// 모달 오버레이 클릭으로 닫기
		document.getElementById('he-sorts-modal').addEventListener('click', function (e) {
			if (e.target === this) closeModal();
		});

		// 모달 아이콘 미리보기
		var modalIcon = document.getElementById('modal-icon');
		if (modalIcon) {
			modalIcon.addEventListener('input', function () {
				updateIconPreview('modal-icon-preview', this.value);
			});
		}

		// ESC 키로 모달 닫기
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') closeModal();
		});
	}

	// ── 항목 선택 ────────────────────────────────────────────────
	function selectItem(item) {
		// 이전 선택 해제
		if (selectedItem) selectedItem.classList.remove('is-selected');
		selectedItem = item;
		item.classList.add('is-selected');

		// 속성 패널 채우기
		var label          = item.dataset.label || '';
		var originalLabel  = item.dataset.originalLabel || label;
		var isCustom       = item.dataset.type === 'custom';
		var isHidden       = item.dataset.hidden === 'true';

		document.getElementById('prop-label').value   = label;
		document.getElementById('prop-hidden').checked = isHidden;
		document.getElementById('prop-original-label').textContent = originalLabel ? '기본값: ' + originalLabel : '';

		// 커스텀 항목 전용 필드 표시/숨김
		var customFields = document.querySelectorAll('.he-sorts-custom-only');
		customFields.forEach(function (f) {
			f.style.display = isCustom ? '' : 'none';
		});

		if (isCustom) {
			document.getElementById('prop-url').value        = item.dataset.url || '';
			document.getElementById('prop-icon').value       = item.dataset.icon || '';
			document.getElementById('prop-capability').value = item.dataset.capability || 'read';
			document.getElementById('prop-target').value     = item.dataset.target || '_self';
			updateIconPreview('prop-icon-preview', item.dataset.icon || '');
		}

		document.getElementById('props-empty').style.display = 'none';
		document.getElementById('props-form').style.display  = '';
	}

	// ── 들여쓰기 (depth 증가) ─────────────────────────────────────
	function handleIndent(item) {
		var depth = parseInt(item.dataset.depth || '1', 10);
		if (depth >= 3) {
			showToast(i18n.maxDepth, 'error');
			return;
		}

		// 앞 형제 항목 찾기
		var prevSibling = getPreviousSiblingItem(item);
		if (!prevSibling) {
			showToast(i18n.noParent, 'error');
			return;
		}

		// 이전 형제의 자식 컨테이너에 삽입
		var childContainer = prevSibling.querySelector('.he-sorts-children');
		if (!childContainer) return;

		// 현재 항목을 부모에서 제거하고 새 위치에 추가
		item.parentNode.removeChild(item);
		childContainer.appendChild(item);

		// 빈 컨테이너에서 empty 클래스 제거
		childContainer.classList.remove('he-sorts-empty-children');

		updateDepths();
		updateEmptyContainers();
		refreshSortables();
	}

	// ── 내보내기 (depth 감소) ─────────────────────────────────────
	function handleOutdent(item) {
		var depth = parseInt(item.dataset.depth || '1', 10);
		if (depth <= 1) return;

		var parentContainer = item.parentNode;
		var parentItem      = parentContainer.closest('.he-sorts-item');
		if (!parentItem) return;

		var grandparentContainer = parentItem.parentNode;
		if (!grandparentContainer) return;

		// 부모 항목 바로 뒤에 삽입
		grandparentContainer.insertBefore(item, parentItem.nextSibling);

		updateDepths();
		updateEmptyContainers();
		refreshSortables();
	}

	function getPreviousSiblingItem(item) {
		var prev = item.previousElementSibling;
		while (prev) {
			if (prev.classList.contains('he-sorts-item')) return prev;
			prev = prev.previousElementSibling;
		}
		return null;
	}

	// ── 숨기기 토글 ──────────────────────────────────────────────
	function handleToggleVisibility(item, btn) {
		var isHidden = item.dataset.hidden === 'true';
		var newHidden = !isHidden;

		item.dataset.hidden = newHidden ? 'true' : 'false';
		btn.dataset.hidden  = newHidden ? 'true' : 'false';

		if (newHidden) {
			item.classList.add('is-hidden');
			btn.querySelector('.dashicons').className = 'dashicons dashicons-hidden';
			btn.title = '표시';
		} else {
			item.classList.remove('is-hidden');
			btn.querySelector('.dashicons').className = 'dashicons dashicons-visibility';
			btn.title = '숨기기';
		}

		// 선택된 항목이면 패널도 업데이트
		if (selectedItem === item) {
			document.getElementById('prop-hidden').checked = newHidden;
		}

		// 배지 업데이트
		updateHiddenBadge(item, newHidden);
	}

	function updateHiddenBadge(item, isHidden) {
		var existingBadge = item.querySelector('.he-sorts-badge--hidden');
		if (isHidden && !existingBadge) {
			var badge = document.createElement('span');
			badge.className = 'he-sorts-badge he-sorts-badge--hidden';
			badge.textContent = '숨김';
			var label = item.querySelector('.he-sorts-item-label');
			if (label) label.insertAdjacentElement('afterend', badge);
		} else if (!isHidden && existingBadge) {
			existingBadge.remove();
		}
	}

	// ── 속성 패널 적용 ────────────────────────────────────────────
	function handlePropsApply() {
		if (!selectedItem) return;

		var newLabel  = document.getElementById('prop-label').value.trim();
		var isHidden  = document.getElementById('prop-hidden').checked;
		var isCustom  = selectedItem.dataset.type === 'custom';

		if (!newLabel) {
			showToast('이름을 입력해 주세요.', 'error');
			return;
		}

		// 데이터 업데이트
		selectedItem.dataset.label  = newLabel;
		selectedItem.dataset.hidden = isHidden ? 'true' : 'false';
		selectedItem.querySelector('.he-sorts-item-label').textContent = newLabel;

		// 숨김 상태 시각 반영
		var visBtn = selectedItem.querySelector('.he-sorts-toggle-visibility');
		if (isHidden) {
			selectedItem.classList.add('is-hidden');
			if (visBtn) {
				visBtn.querySelector('.dashicons').className = 'dashicons dashicons-hidden';
				visBtn.title = '표시';
				visBtn.dataset.hidden = 'true';
			}
		} else {
			selectedItem.classList.remove('is-hidden');
			if (visBtn) {
				visBtn.querySelector('.dashicons').className = 'dashicons dashicons-visibility';
				visBtn.title = '숨기기';
				visBtn.dataset.hidden = 'false';
			}
		}
		updateHiddenBadge(selectedItem, isHidden);

		if (isCustom) {
			selectedItem.dataset.url        = document.getElementById('prop-url').value.trim();
			selectedItem.dataset.icon       = document.getElementById('prop-icon').value.trim();
			selectedItem.dataset.capability = document.getElementById('prop-capability').value;
			selectedItem.dataset.target     = document.getElementById('prop-target').value;

			// 아이콘 시각 업데이트
			var iconEl = selectedItem.querySelector('.he-sorts-item-icon');
			if (iconEl) {
				var newIcon = selectedItem.dataset.icon;
				iconEl.className = 'dashicons ' + (newIcon || 'dashicons-admin-generic') + ' he-sorts-item-icon';
			}
		}

		showToast('적용되었습니다. 저장하려면 저장 버튼을 눌러주세요.');
	}

	// ── 속성 패널 삭제 ────────────────────────────────────────────
	function handlePropsDelete() {
		if (!selectedItem) return;
		if (!confirm(i18n.confirmDelete)) return;

		selectedItem.remove();
		selectedItem = null;

		document.getElementById('props-empty').style.display = '';
		document.getElementById('props-form').style.display  = 'none';

		updateEmptyContainers();
		showToast('항목이 삭제되었습니다.');
	}

	// ── 저장 ─────────────────────────────────────────────────────
	function handleSave() {
		var btn = document.getElementById('he-sorts-save');
		btn.disabled = true;

		var config = serializeTree();

		var body = new URLSearchParams({
			action: 'he_sorts_save_config',
			nonce:  heSortsData.nonce,
			config: JSON.stringify({ version: 1, items: config }),
		});

		fetch(heSortsData.ajaxUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString(),
		})
		.then(function (r) { return r.json(); })
		.then(function (data) {
			btn.disabled = false;
			if (data.success) {
				showToast(i18n.saved, 'success');
			} else {
				showToast(i18n.saveFailed + ' ' + (data.data && data.data.message ? data.data.message : ''), 'error');
			}
		})
		.catch(function () {
			btn.disabled = false;
			showToast(i18n.saveFailed, 'error');
		});
	}

	// ── 초기화 ───────────────────────────────────────────────────
	function handleReset() {
		if (!confirm(i18n.confirmReset)) return;

		fetch(heSortsData.ajaxUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				action: 'he_sorts_reset_config',
				nonce:  heSortsData.nonce,
			}).toString(),
		})
		.then(function (r) { return r.json(); })
		.then(function (data) {
			if (data.success) {
				showToast(i18n.reset, 'success');
				setTimeout(function () { window.location.reload(); }, 1000);
			}
		});
	}

	// ── 커스텀 항목 추가 모달 ─────────────────────────────────────
	function openModal() {
		document.getElementById('modal-label').value      = '';
		document.getElementById('modal-url').value        = '';
		document.getElementById('modal-icon').value       = 'dashicons-admin-generic';
		document.getElementById('modal-capability').value = 'read';
		document.getElementById('modal-target').value     = '_self';
		document.getElementById('modal-depth').value      = '1';
		updateIconPreview('modal-icon-preview', 'dashicons-admin-generic');

		document.getElementById('he-sorts-modal').style.display = '';
		setTimeout(function () {
			document.getElementById('modal-label').focus();
		}, 50);
	}

	function closeModal() {
		document.getElementById('he-sorts-modal').style.display = 'none';
	}

	function handleModalConfirm() {
		var label      = document.getElementById('modal-label').value.trim();
		var url        = document.getElementById('modal-url').value.trim();
		var icon       = document.getElementById('modal-icon').value.trim() || 'dashicons-admin-generic';
		var capability = document.getElementById('modal-capability').value;
		var target     = document.getElementById('modal-target').value;
		var depth      = parseInt(document.getElementById('modal-depth').value, 10);

		if (!label) {
			document.getElementById('modal-label').focus();
			return;
		}
		if (!url) {
			document.getElementById('modal-url').focus();
			return;
		}

		// 부모 ID 결정 (depth == 2 이고 선택된 항목이 있으면)
		var parentId = null;
		if (depth === 2 && selectedItem) {
			var selDepth = parseInt(selectedItem.dataset.depth || '1', 10);
			if (selDepth === 1) {
				parentId = selectedItem.dataset.id;
			} else {
				parentId = selectedItem.dataset.parentId || null;
			}
		}

		// AJAX로 ID 발급
		fetch(heSortsData.ajaxUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				action:     'he_sorts_add_custom_item',
				nonce:      heSortsData.nonce,
				label:      label,
				url:        url,
				icon:       icon,
				capability: capability,
				target:     target,
				depth:      depth,
				parent_id:  parentId || '',
			}).toString(),
		})
		.then(function (r) { return r.json(); })
		.then(function (data) {
			if (data.success) {
				appendNewItem(data.data);
				closeModal();
				showToast(i18n.customAdded, 'success');
			}
		});
	}

	/**
	 * 새 커스텀 항목을 트리에 추가합니다.
	 */
	function appendNewItem(item) {
		var depth    = item.depth || 1;
		var parentId = item.parent_id || null;

		var itemEl = createItemElement(item);

		if (depth === 1 || !parentId) {
			document.getElementById('tree-root').appendChild(itemEl);
		} else {
			// 부모 항목의 자식 컨테이너에 추가
			var parentEl = document.querySelector('.he-sorts-item[data-id="' + parentId + '"]');
			if (parentEl) {
				var childContainer = parentEl.querySelector('.he-sorts-children');
				if (childContainer) {
					childContainer.appendChild(itemEl);
					childContainer.classList.remove('he-sorts-empty-children');
				}
			} else {
				document.getElementById('tree-root').appendChild(itemEl);
			}
		}

		updateDepths();
		updateEmptyContainers();
		refreshSortables();
	}

	/**
	 * 항목 데이터로부터 DOM 요소를 생성합니다.
	 */
	function createItemElement(item) {
		var depth    = item.depth || 1;
		var icon     = item.icon || 'dashicons-admin-generic';
		var iconClass = icon.indexOf('dashicons-') === 0 ? ('dashicons ' + icon) : 'dashicons dashicons-admin-generic';

		var div = document.createElement('div');
		div.className = 'he-sorts-item depth-' + depth;
		div.dataset.id         = item.id || '';
		div.dataset.type       = 'custom';
		div.dataset.depth      = String(depth);
		div.dataset.wpSlug     = '';
		div.dataset.parentId   = item.parent_id || '';
		div.dataset.label      = item.label || '';
		div.dataset.originalLabel = item.label || '';
		div.dataset.icon       = icon;
		div.dataset.url        = item.url || '';
		div.dataset.capability = item.capability || 'read';
		div.dataset.target     = item.target || '_self';
		div.dataset.hidden     = 'false';
		div.dataset.unmanaged  = 'false';

		div.innerHTML =
			'<span class="he-sorts-drag-handle dashicons dashicons-move" title="드래그하여 이동"></span>' +
			'<span class="' + escAttr(iconClass) + ' he-sorts-item-icon"></span>' +
			'<span class="he-sorts-item-label">' + escHtml(item.label || '') + '</span>' +
			'<div class="he-sorts-item-actions">' +
				(depth < 3 ? '<button class="he-sorts-action-btn he-sorts-indent" title="하위 항목으로 (들여쓰기)"><span class="dashicons dashicons-arrow-right-alt"></span></button>' : '') +
				(depth > 1 ? '<button class="he-sorts-action-btn he-sorts-outdent" title="상위 항목으로 (내보내기)"><span class="dashicons dashicons-arrow-left-alt"></span></button>' : '') +
				'<button class="he-sorts-action-btn he-sorts-toggle-visibility" title="숨기기" data-hidden="false"><span class="dashicons dashicons-visibility"></span></button>' +
			'</div>' +
			(depth < 3 ? '<div class="he-sorts-children he-sorts-depth-' + (depth + 1) + '-list he-sorts-empty-children" data-parent-id="' + escAttr(item.id || '') + '"></div>' : '');

		return div;
	}

	// ── 트리 직렬화 ──────────────────────────────────────────────
	function serializeTree() {
		var items = [];
		var root  = document.getElementById('tree-root');
		if (!root) return items;
		serializeContainer(root, null, 1, items);
		return items;
	}

	function serializeContainer(container, parentId, depth, items) {
		var children = container.children;
		for (var i = 0; i < children.length; i++) {
			var el = children[i];
			if (!el.classList.contains('he-sorts-item')) continue;

			var item = itemDataFromEl(el, parentId, depth);
			items.push(item);

			// 자식 컨테이너 재귀
			var childContainer = el.querySelector(':scope > .he-sorts-children');
			if (childContainer) {
				serializeContainer(childContainer, item.id, depth + 1, items);
			}
		}
	}

	function itemDataFromEl(el, parentId, depth) {
		var data = {
			id:        el.dataset.id        || '',
			type:      el.dataset.type      || 'original',
			depth:     depth,
			wp_slug:   el.dataset.wpSlug    || null,
			parent_id: parentId,
			label:     el.dataset.label     || '',
			hidden:    el.dataset.hidden === 'true',
		};

		if (data.type === 'custom') {
			data.url        = el.dataset.url        || '';
			data.icon       = el.dataset.icon       || 'dashicons-admin-generic';
			data.capability = el.dataset.capability || 'read';
			data.target     = el.dataset.target     || '_self';
		}

		if (el.dataset.type === 'separator') {
			data.type = 'separator';
		}

		return data;
	}

	// ── SortableJS 재초기화 ───────────────────────────────────────
	function refreshSortables() {
		// 새로 추가된 컨테이너에 SortableJS 적용
		var lists = document.querySelectorAll('.he-sorts-tree-list, .he-sorts-children');
		lists.forEach(function (list) {
			if (!list._sortable) {
				var depth = getListDepth(list);
				var s = Sortable.create(list, {
					group: {
						name: 'he-sorts',
						put: function (to) {
							return getListDepth(to.el) <= 3;
						},
					},
					handle: '.he-sorts-drag-handle',
					animation: 150,
					ghostClass: 'sortable-ghost',
					dragClass: 'sortable-drag',
					onEnd: function () {
						updateDepths();
						updateEmptyContainers();
					},
				});
				sortableInstances.push(s);
			}
		});
	}

	// ── 아이콘 미리보기 ───────────────────────────────────────────
	function updateIconPreview(previewId, iconClass) {
		var el = document.getElementById(previewId);
		if (!el) return;
		el.className = 'dashicons ' + (iconClass.indexOf('dashicons') !== -1 ? iconClass : 'dashicons-' + iconClass);
	}

	// ── 토스트 알림 ───────────────────────────────────────────────
	function showToast(message, type) {
		var toast = document.getElementById('he-sorts-toast');
		if (!toast) return;

		toast.textContent = message;
		toast.className   = 'he-sorts-toast' + (type ? ' is-' + type : '');
		toast.classList.add('is-visible');

		clearTimeout(toast._timer);
		toast._timer = setTimeout(function () {
			toast.classList.remove('is-visible');
		}, 3000);
	}

	// ── 유틸리티 ─────────────────────────────────────────────────
	function escHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	function escAttr(str) {
		return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
	}

	// ── 시작 ─────────────────────────────────────────────────────
	document.addEventListener('DOMContentLoaded', init);
}());
