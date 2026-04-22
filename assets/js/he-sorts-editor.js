/**
 * HE SORTS - 에디터 JS (v2 — flat list)
 * 단일 Sortable 리스트 + depth 는 CSS 인덴트로만 표현합니다.
 */
(function () {
	'use strict';

	var i18n = heSortsData.i18n;
	var selectedItem = null;
	var sortable = null;

	// ── Dashicons 전체 목록 ──────────────────────────────────────
	var DASHICONS = [
		'admin-appearance','admin-collapse','admin-comments','admin-customizer','admin-generic',
		'admin-home','admin-links','admin-media','admin-multisite','admin-network','admin-page',
		'admin-plugins','admin-post','admin-settings','admin-site','admin-site-alt','admin-site-alt2',
		'admin-site-alt3','admin-tools','admin-users',
		'align-center','align-full-width','align-left','align-none','align-pull-left','align-pull-right',
		'align-right','align-wide',
		'amazon','analytics','archive','arrow-down','arrow-down-alt','arrow-down-alt2','arrow-left',
		'arrow-left-alt','arrow-left-alt2','arrow-right','arrow-right-alt','arrow-right-alt2',
		'arrow-up','arrow-up-alt','arrow-up-alt2','art','awards',
		'backup','bank','beer','book','book-alt','building','businessman','button',
		'calendar','calendar-alt','camera','carrot','cart','category',
		'chart-area','chart-bar','chart-line','chart-pie',
		'clipboard','clock','cloud','cloud-saved','cloud-upload',
		'code-standards','coffee','color-picker',
		'controls-back','controls-fastforward','controls-forward','controls-pause','controls-play',
		'controls-repeat','controls-skipback','controls-skipforward','controls-volumeoff','controls-volumeon',
		'cover-image','dashboard','desktop','dismiss','download','drumstick',
		'edit','edit-large','edit-page',
		'editor-aligncenter','editor-alignleft','editor-alignright','editor-bold','editor-break',
		'editor-code','editor-contract','editor-customchar','editor-expand','editor-help',
		'editor-indent','editor-insertmore','editor-italic','editor-justify','editor-kitchensink',
		'editor-ol','editor-ol-rtl','editor-outdent','editor-paragraph','editor-paste-text',
		'editor-paste-word','editor-quote','editor-removeformatting','editor-rtl',
		'editor-spellcheck','editor-strikethrough','editor-table','editor-textcolor',
		'editor-ul','editor-underline','editor-unlink','editor-video',
		'email','email-alt','email-alt2',
		'embed-audio','embed-generic','embed-photo','embed-post','embed-video',
		'exit','expand','external',
		'facebook','facebook-alt','feedback','filter','flag',
		'format-aside','format-audio','format-chat','format-gallery','format-image',
		'format-links','format-quote','format-standard','format-status','format-video',
		'forms','fullscreen-alt','fullscreen-exit-alt',
		'games','google','grid-view','groups',
		'hammer','heart','hidden','hourglass','html',
		'id','id-alt','image-crop','image-filter','image-flip-horizontal','image-flip-vertical',
		'image-rotate','image-rotate-left','image-rotate-right','images-alt','images-alt2',
		'index-card','info','info-outline','insert','insert-after','insert-before','instagram',
		'keyboard-hide','layout','leftright','lightbulb','list-view','location','location-alt','lock',
		'marker','media-archive','media-audio','media-code','media-default','media-document',
		'media-interactive','media-spreadsheet','media-text','media-video',
		'megaphone','menu','menu-alt','menu-alt2','menu-alt3','microphone','migrate','minus',
		'money','money-alt','move','music',
		'networking','no','no-alt','normalize','note',
		'open-folder','palmtree','paperclip','performance','phone','pinterest',
		'playlist-audio','playlist-video','plus','plus-alt','plus-alt2','portfolio',
		'post-status','pressthis','products',
		'randomize','reddit','redo','rest-api','rss',
		'saved','schedule','search','share','share-alt','share-alt2',
		'shield','shield-alt','shortcode','slides','smartphone','smiley','sort','sos',
		'star-empty','star-filled','star-half','sticky','store','support',
		'tablet','tag','tagcloud','testimonial','text','text-page',
		'thumbs-down','thumbs-up','tickets','tickets-alt','translation','trash',
		'twitter','twitter-alt',
		'undo','universal-access','universal-access-alt','unlock','update','update-alt','upload',
		'video-alt','video-alt2','video-alt3','visibility','warning',
		'welcome-add-page','welcome-comments','welcome-learn-more','welcome-view-site','welcome-widgets-menus',
		'wordpress','wordpress-alt','yes','yes-alt',
	];

	// ── 픽커 상태 ────────────────────────────────────────────────
	var pickerTarget  = null;
	var pickerPreview = null;
	var pickerBuilt   = false;

	// ── 접힘 상태 (d1 item id → true=접힘) ────────────────────────
	var collapsedState = {};

	// ── 드래그 depth 상태 ─────────────────────────────────────────
	var isDragging          = false;
	var dragTargetDepth     = 1;
	var dragItemOrigDepth   = 1;
	var dragStartX          = 0;
	var dragDepthBadge      = null;
	var dragDepthGuide      = null;

	// ── 초기화 ──────────────────────────────────────────────────
	function init() {
		initSortable();
		bindEvents();
	}

	// ── SortableJS (단일 플랫 리스트 + depth 드래그) ──────────────
	function initSortable() {
		if (sortable) sortable.destroy();
		var root = document.getElementById('tree-root');
		if (!root) return;

		sortable = Sortable.create(root, {
			handle:     '.he-sorts-drag-handle',
			animation:  120,
			ghostClass: 'sortable-ghost',
			dragClass:  'sortable-drag',

			onStart: function (evt) {
				isDragging        = true;
				dragItemOrigDepth = parseInt(evt.item.dataset.depth || '1', 10);
				dragTargetDepth   = dragItemOrigDepth;
				// 드래그 중에는 접힌 자식 항목도 모두 표시
				document.querySelectorAll('#tree-root > .he-sorts-item').forEach(function (el) {
					el.style.removeProperty('display');
				});
				showDepthGuide();
			},

			onEnd: function (evt) {
				isDragging = false;
				hideDepthGuide();

				var el = evt.item;
				var prevDepth = parseInt(el.dataset.depth || '1', 10);
				if (prevDepth !== dragTargetDepth) {
					el.dataset.depth = String(dragTargetDepth);
					el.className = el.className.replace(/\bhs-d\d\b/, 'hs-d' + dragTargetDepth);
					updateDepthButtons(el, dragTargetDepth);
				}

				recalculateParents();
				updateToggleButtons();
				applyAllCollapseStates();
			},
		});

		// 첫 로드 시 접힘 초기화
		initCollapseState();
	}

	/**
	 * 마우스 X 이동량(dragStartX 기준)을 24px 단위로 환산해 depth 를 계산합니다.
	 * 오른쪽으로 24px = depth +1, 왼쪽으로 24px = depth -1
	 */
	function calcDepthFromDelta(clientX) {
		var delta     = clientX - dragStartX;
		var depthDelta = Math.round(delta / 24);
		return Math.max(1, Math.min(3, dragItemOrigDepth + depthDelta));
	}

	// ── 드래그 중 뎁스 가이드 ─────────────────────────────────────
	function showDepthGuide() {
		if (!dragDepthGuide) {
			dragDepthGuide = document.createElement('div');
			dragDepthGuide.className = 'hs-depth-guide';
			dragDepthGuide.innerHTML =
				'<span class="hs-dg hs-dg-d1"><em class="dashicons dashicons-arrow-left-alt2"></em>1뎁스</span>' +
				'<span class="hs-dg hs-dg-d2">2뎁스</span>' +
				'<span class="hs-dg hs-dg-d3">3뎁스<em class="dashicons dashicons-arrow-right-alt2"></em></span>';
			var tree = document.querySelector('.he-sorts-tree');
			if (tree) tree.insertBefore(dragDepthGuide, tree.firstChild);
		}
		dragDepthGuide.style.display = '';
		updateGuideActive(dragTargetDepth);
	}

	function hideDepthGuide() {
		if (dragDepthGuide) dragDepthGuide.style.display = 'none';
		if (dragDepthBadge) dragDepthBadge.style.display = 'none';
	}

	function updateGuideActive(depth) {
		if (!dragDepthGuide) return;
		dragDepthGuide.querySelectorAll('.hs-dg').forEach(function (z, i) {
			z.classList.toggle('is-active', i + 1 === depth);
		});
	}

	/**
	 * flat list 에서 각 항목의 parent_id 를 재계산합니다.
	 * 규칙: 자신보다 depth 가 1 작은 직전 항목이 부모.
	 * 부모를 찾지 못하면 depth 를 강제 감소합니다.
	 */
	function recalculateParents() {
		var items = Array.from(document.querySelectorAll('#tree-root > .he-sorts-item'));
		items.forEach(function (el, idx) {
			var depth = parseInt(el.dataset.depth || '1', 10);
			if (depth === 1) {
				el.dataset.parentId = '';
				return;
			}
			// 역방향으로 depth-1 인 선행 항목 탐색
			for (var i = idx - 1; i >= 0; i--) {
				var prev      = items[i];
				var prevDepth = parseInt(prev.dataset.depth || '1', 10);
				if (prevDepth === depth - 1) {
					el.dataset.parentId = prev.dataset.id;
					return;
				}
				if (prevDepth < depth - 1) break;
			}
			// 유효한 부모 없음 → depth 줄이기
			var newD = depth - 1;
			el.dataset.depth = String(newD);
			el.className = el.className.replace(/\bhs-d\d\b/, 'hs-d' + newD);
			updateDepthButtons(el, newD);
			el.dataset.parentId = '';
		});
	}

	// ── 트리 접힘(Collapse) ──────────────────────────────────────

	/** 페이지 초기 로드 시: 자식이 있는 d1 항목은 모두 접힘으로 시작 */
	function initCollapseState() {
		document.querySelectorAll('#tree-root > .he-sorts-item').forEach(function (el) {
			if (parseInt(el.dataset.depth || '1', 10) === 1) {
				if (hasChildItems(el)) {
					collapsedState[el.dataset.id] = true;
				}
			}
		});
		updateToggleButtons();
		applyAllCollapseStates();
	}

	/** d1 항목 바로 다음에 depth>1 인 항목이 있는지 확인 */
	function hasChildItems(d1El) {
		var next = d1El.nextElementSibling;
		return !!(next && next.classList.contains('he-sorts-item') &&
			parseInt(next.dataset.depth || '1', 10) > 1);
	}

	/** d1 항목의 모든 하위 항목(d2, d3) 반환 */
	function getDescendants(d1El) {
		var result = [];
		var el = d1El.nextElementSibling;
		while (el && el.classList.contains('he-sorts-item')) {
			if (parseInt(el.dataset.depth || '1', 10) <= 1) break;
			result.push(el);
			el = el.nextElementSibling;
		}
		return result;
	}

	/** collapsedState 에 따라 모든 d1 항목의 자식을 show/hide */
	function applyAllCollapseStates() {
		document.querySelectorAll('#tree-root > .he-sorts-item').forEach(function (el) {
			if (parseInt(el.dataset.depth || '1', 10) !== 1) return;
			var id         = el.dataset.id;
			var collapsed  = collapsedState[id] === true;
			var descendants = getDescendants(el);
			descendants.forEach(function (child) {
				child.style.display = collapsed ? 'none' : '';
			});
			// 토글 버튼 아이콘 갱신
			var btn = el.querySelector('.hs-toggle-btn .dashicons');
			if (btn) {
				btn.className = 'dashicons ' + (collapsed ? 'dashicons-arrow-right-alt2' : 'dashicons-arrow-down-alt2');
			}
			var btnWrap = el.querySelector('.hs-toggle-btn');
			if (btnWrap) btnWrap.classList.toggle('is-open', !collapsed);
		});
	}

	/** d1 항목의 접힘 상태를 토글 */
	function toggleCollapse(d1El) {
		var id = d1El.dataset.id;
		collapsedState[id] = !collapsedState[id];
		applyAllCollapseStates();
	}

	/**
	 * 트리 전체를 스캔해 자식이 있는 d1 항목에 토글 버튼을 추가/제거합니다.
	 * 드래그·인덴트 조작 후 호출하세요.
	 */
	function updateToggleButtons() {
		document.querySelectorAll('#tree-root > .he-sorts-item').forEach(function (el) {
			if (parseInt(el.dataset.depth || '1', 10) !== 1) return;
			var hasKids  = hasChildItems(el);
			var existing = el.querySelector('.hs-toggle-btn');

			if (hasKids && !existing) {
				var id        = el.dataset.id;
				var collapsed = collapsedState[id] !== false; // undefined = 접힘
				var btn = document.createElement('button');
				btn.type      = 'button';
				btn.className = 'he-sorts-action-btn hs-toggle-btn' + (collapsed ? '' : ' is-open');
				btn.title     = '하위 메뉴 펼치기/접기';
				btn.innerHTML = '<span class="dashicons ' +
					(collapsed ? 'dashicons-arrow-right-alt2' : 'dashicons-arrow-down-alt2') +
					'"></span>';
				// item-actions 바로 앞에 삽입
				var actions = el.querySelector('.he-sorts-item-actions');
				if (actions) el.insertBefore(btn, actions);
				else         el.appendChild(btn);
			} else if (!hasKids && existing) {
				existing.remove();
			}
		});
	}

	// ── 구분선 추가 ──────────────────────────────────────────────
	function addSeparatorItem() {
		var id  = 'separator::' + Math.random().toString(36).slice(2, 10);
		var el  = document.createElement('div');
		el.className         = 'he-sorts-item hs-d1 he-sorts-separator';
		el.dataset.id        = id;
		el.dataset.type      = 'separator';
		el.dataset.depth     = '1';
		el.dataset.parentId  = '';
		el.dataset.hidden    = 'false';

		el.innerHTML =
			'<span class="he-sorts-drag-handle dashicons dashicons-move"></span>' +
			'<span class="hs-sep-line"></span>' +
			'<div class="he-sorts-item-actions">' +
				'<button class="he-sorts-action-btn he-sorts-toggle-visibility" title="숨기기" data-hidden="false">' +
					'<span class="dashicons dashicons-visibility"></span>' +
				'</button>' +
			'</div>';

		var root = document.getElementById('tree-root');
		if (selectedItem && selectedItem.parentNode === root) {
			root.insertBefore(el, selectedItem.nextSibling);
		} else {
			root.appendChild(el);
		}

		updateToggleButtons();
		showToast('구분선이 추가되었습니다.');
	}

	// ── 이벤트 바인딩 ─────────────────────────────────────────────
	function bindEvents() {
		var tree = document.getElementById('he-sorts-tree');
		if (!tree) return;

		tree.addEventListener('click', function (e) {
			var item = e.target.closest('.he-sorts-item');
			if (!item) return;

			// 접힘 토글 버튼
			if (e.target.closest('.hs-toggle-btn')) {
				e.stopPropagation();
				toggleCollapse(item);
				return;
			}

			if (e.target.closest('.he-sorts-indent')) {
				e.stopPropagation();
				handleIndent(item);
				return;
			}
			if (e.target.closest('.he-sorts-outdent')) {
				e.stopPropagation();
				handleOutdent(item);
				return;
			}
			if (e.target.closest('.he-sorts-toggle-visibility')) {
				e.stopPropagation();
				handleToggleVisibility(item, e.target.closest('.he-sorts-toggle-visibility'));
				return;
			}
			if (!e.target.closest('.he-sorts-item-actions') && !e.target.closest('.he-sorts-drag-handle')) {
				selectItem(item);
			}
		});

		document.getElementById('he-sorts-save').addEventListener('click', handleSave);
		document.getElementById('he-sorts-reset').addEventListener('click', handleReset);
		document.getElementById('he-sorts-add-item').addEventListener('click', function () { openModal(); });
		document.getElementById('he-sorts-add-sep').addEventListener('click', addSeparatorItem);

		document.getElementById('prop-apply').addEventListener('click', handlePropsApply);
		document.getElementById('prop-delete').addEventListener('click', handlePropsDelete);

		var propIcon = document.getElementById('prop-icon');
		if (propIcon) propIcon.addEventListener('input', function () {
			updateIconPreview('prop-icon-preview', this.value);
		});

		document.getElementById('modal-close').addEventListener('click', closeModal);
		document.getElementById('modal-cancel').addEventListener('click', closeModal);
		document.getElementById('modal-confirm').addEventListener('click', handleModalConfirm);
		document.getElementById('he-sorts-modal').addEventListener('click', function (e) {
			if (e.target === this) closeModal();
		});

		var modalIcon = document.getElementById('modal-icon');
		if (modalIcon) modalIcon.addEventListener('input', function () {
			updateIconPreview('modal-icon-preview', this.value);
		});

		// 아이콘 선택 버튼 + 미리보기 클릭 → 픽커 열기
		document.addEventListener('click', function (e) {
			var btn = e.target.closest('.hs-pick-icon-btn, .hs-icon-pick-preview');
			if (btn) {
				openPicker(btn.dataset.target, btn.dataset.preview);
				return;
			}
			// 픽커 오버레이 클릭 시 닫기
			var picker = document.getElementById('hs-icon-picker');
			if (picker && e.target === picker) closePicker();
		});

		// 픽커 닫기 버튼
		document.getElementById('hs-icon-picker-close').addEventListener('click', closePicker);

		// 픽커 검색
		document.getElementById('hs-icon-search').addEventListener('input', function () {
			filterPicker(this.value.trim().toLowerCase());
		});

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				var picker = document.getElementById('hs-icon-picker');
				if (picker && picker.style.display !== 'none') {
					closePicker();
				} else {
					closeModal();
				}
			}
		});

		// ── 드래그 depth 트래킹 ────────────────────────────────────
		// 드래그 핸들 mousedown → 시작 X 기록
		document.addEventListener('mousedown', function (e) {
			if (e.target.closest('.he-sorts-drag-handle')) {
				dragStartX = e.clientX;
			}
		});

		// 드래그 중 마우스 이동 → depth 계산 + 배지/가이드 갱신
		document.addEventListener('mousemove', function (e) {
			if (!isDragging) return;

			var newDepth = calcDepthFromDelta(e.clientX);
			dragTargetDepth = newDepth;

			// 배지 생성 및 위치
			if (!dragDepthBadge) {
				dragDepthBadge = document.createElement('div');
				dragDepthBadge.className = 'hs-drag-badge';
				document.body.appendChild(dragDepthBadge);
			}
			dragDepthBadge.textContent = newDepth + '뎁스';
			dragDepthBadge.style.left  = (e.clientX + 14) + 'px';
			dragDepthBadge.style.top   = (e.clientY - 28) + 'px';
			dragDepthBadge.style.display = '';
			dragDepthBadge.className = 'hs-drag-badge hs-drag-badge--d' + newDepth;

			// 가이드 활성 구역 갱신
			updateGuideActive(newDepth);
		});
	}

	// ── 항목 선택 ────────────────────────────────────────────────
	function selectItem(el) {
		if (selectedItem) selectedItem.classList.remove('is-selected');
		selectedItem = el;
		el.classList.add('is-selected');

		var label        = el.dataset.label || '';
		var origLabel    = el.dataset.originalLabel || label;
		var isCustom     = el.dataset.type === 'custom';
		var isHidden     = el.dataset.hidden === 'true';

		document.getElementById('prop-label').value    = label;
		document.getElementById('prop-hidden').checked = isHidden;
		document.getElementById('prop-original-label').textContent = origLabel ? '기본값: ' + origLabel : '';

		document.querySelectorAll('.he-sorts-custom-only').forEach(function (f) {
			f.style.display = isCustom ? '' : 'none';
		});
		if (isCustom) {
			document.getElementById('prop-url').value        = el.dataset.url || '';
			document.getElementById('prop-icon').value       = el.dataset.icon || '';
			document.getElementById('prop-capability').value = el.dataset.capability || 'read';
			document.getElementById('prop-target').value     = el.dataset.target || '_self';
			updateIconPreview('prop-icon-preview', el.dataset.icon || '');
		}

		document.getElementById('props-empty').style.display = 'none';
		document.getElementById('props-form').style.display  = '';
	}

	// ── 들여쓰기 (depth +1) ───────────────────────────────────────
	function handleIndent(item) {
		var depth = parseInt(item.dataset.depth || '1', 10);
		if (depth >= 3) { showToast(i18n.maxDepth, 'error'); return; }

		var newDepth = depth + 1;
		item.dataset.depth = String(newDepth);
		item.className = item.className.replace(/\bhs-d\d\b/, 'hs-d' + newDepth);

		updateDepthButtons(item, newDepth);
		recalculateParents();
		updateToggleButtons();
		applyAllCollapseStates();
	}

	// ── 내보내기 (depth -1) ───────────────────────────────────────
	function handleOutdent(item) {
		var depth = parseInt(item.dataset.depth || '1', 10);
		if (depth <= 1) return;

		var newDepth = depth - 1;
		item.dataset.depth = String(newDepth);
		item.className = item.className.replace(/\bhs-d\d\b/, 'hs-d' + newDepth);

		updateDepthButtons(item, newDepth);
		recalculateParents();
		updateToggleButtons();
		applyAllCollapseStates();
	}

	function updateDepthButtons(item, depth) {
		var actions = item.querySelector('.he-sorts-item-actions');
		if (!actions) return;

		var indentBtn  = actions.querySelector('.he-sorts-indent');
		var outdentBtn = actions.querySelector('.he-sorts-outdent');

		if (depth >= 3) {
			if (indentBtn) indentBtn.remove();
		} else if (!indentBtn) {
			var btn = document.createElement('button');
			btn.className = 'he-sorts-action-btn he-sorts-indent';
			btn.title = '하위로';
			btn.innerHTML = '<span class="dashicons dashicons-arrow-right-alt"></span>';
			actions.insertBefore(btn, actions.firstChild);
		}

		if (depth <= 1) {
			if (outdentBtn) outdentBtn.remove();
		} else if (!outdentBtn) {
			var btn2 = document.createElement('button');
			btn2.className = 'he-sorts-action-btn he-sorts-outdent';
			btn2.title = '상위로';
			btn2.innerHTML = '<span class="dashicons dashicons-arrow-left-alt"></span>';
			var indBtnNow = actions.querySelector('.he-sorts-indent');
			if (indBtnNow) {
				actions.insertBefore(btn2, indBtnNow.nextSibling);
			} else {
				actions.insertBefore(btn2, actions.firstChild);
			}
		}
	}

	// ── 숨기기 토글 ──────────────────────────────────────────────
	function handleToggleVisibility(item, btn) {
		var isHidden = item.dataset.hidden === 'true';
		var newHidden = !isHidden;

		item.dataset.hidden = newHidden ? 'true' : 'false';
		btn.dataset.hidden  = newHidden ? 'true' : 'false';

		item.classList.toggle('is-hidden', newHidden);
		btn.querySelector('.dashicons').className = 'dashicons ' + (newHidden ? 'dashicons-hidden' : 'dashicons-visibility');

		if (selectedItem === item) {
			document.getElementById('prop-hidden').checked = newHidden;
		}
		updateHiddenBadge(item, newHidden);
	}

	function updateHiddenBadge(item, isHidden) {
		var existing = item.querySelector('.hs-badge--hidden');
		if (isHidden && !existing) {
			var badge = document.createElement('span');
			badge.className = 'hs-badge hs-badge--hidden';
			badge.textContent = '숨김';
			var label = item.querySelector('.hs-label');
			if (label) label.insertAdjacentElement('afterend', badge);
		} else if (!isHidden && existing) {
			existing.remove();
		}
	}

	// ── 속성 패널 적용 ────────────────────────────────────────────
	function handlePropsApply() {
		if (!selectedItem) return;

		var newLabel = document.getElementById('prop-label').value.trim();
		var isHidden = document.getElementById('prop-hidden').checked;
		var isCustom = selectedItem.dataset.type === 'custom';

		if (!newLabel) { showToast('이름을 입력해 주세요.', 'error'); return; }

		selectedItem.dataset.label  = newLabel;
		selectedItem.dataset.hidden = isHidden ? 'true' : 'false';
		selectedItem.querySelector('.hs-label').textContent = newLabel;
		selectedItem.classList.toggle('is-hidden', isHidden);

		var visBtn = selectedItem.querySelector('.he-sorts-toggle-visibility');
		if (visBtn) {
			visBtn.querySelector('.dashicons').className = 'dashicons ' + (isHidden ? 'dashicons-hidden' : 'dashicons-visibility');
			visBtn.dataset.hidden = isHidden ? 'true' : 'false';
		}
		updateHiddenBadge(selectedItem, isHidden);

		if (isCustom) {
			selectedItem.dataset.url        = document.getElementById('prop-url').value.trim();
			selectedItem.dataset.icon       = document.getElementById('prop-icon').value.trim();
			selectedItem.dataset.capability = document.getElementById('prop-capability').value;
			selectedItem.dataset.target     = document.getElementById('prop-target').value;

			var iconEl = selectedItem.querySelector('.hs-icon');
			if (iconEl) {
				var ic = selectedItem.dataset.icon || 'dashicons-admin-generic';
				iconEl.className = 'dashicons ' + ic + ' hs-icon';
			}
		}

		showToast('적용되었습니다. 저장 버튼을 눌러 반영하세요.');
	}

	// ── 항목 삭제 ────────────────────────────────────────────────
	function handlePropsDelete() {
		if (!selectedItem) return;
		if (!confirm(i18n.confirmDelete)) return;

		selectedItem.remove();
		selectedItem = null;
		document.getElementById('props-empty').style.display = '';
		document.getElementById('props-form').style.display  = 'none';
		recalculateParents();
		showToast('항목이 삭제되었습니다.');
	}

	// ── 저장 ─────────────────────────────────────────────────────
	function handleSave() {
		var btn = document.getElementById('he-sorts-save');
		btn.disabled = true;

		var config = serializeList();

		fetch(heSortsData.ajaxUrl, {
			method:  'POST',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			body:    new URLSearchParams({
				action: 'he_sorts_save_config',
				nonce:  heSortsData.nonce,
				config: JSON.stringify({version: 1, items: config}),
			}).toString(),
		})
		.then(function (r) { return r.json(); })
		.then(function (data) {
			btn.disabled = false;
			showToast(data.success ? i18n.saved : i18n.saveFailed, data.success ? 'success' : 'error');
		})
		.catch(function () { btn.disabled = false; showToast(i18n.saveFailed, 'error'); });
	}

	// ── 초기화 ───────────────────────────────────────────────────
	function handleReset() {
		if (!confirm(i18n.confirmReset)) return;
		fetch(heSortsData.ajaxUrl, {
			method:  'POST',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			body:    new URLSearchParams({action: 'he_sorts_reset_config', nonce: heSortsData.nonce}).toString(),
		})
		.then(function (r) { return r.json(); })
		.then(function (data) {
			if (data.success) { showToast(i18n.reset, 'success'); setTimeout(function () { location.reload(); }, 900); }
		});
	}

	// ── 직렬화 ───────────────────────────────────────────────────
	function serializeList() {
		var items = Array.from(document.querySelectorAll('#tree-root > .he-sorts-item'));
		return items.map(function (el) {
			var depth    = parseInt(el.dataset.depth || '1', 10);
			var parentId = el.dataset.parentId || null;

			var data = {
				id:        el.dataset.id       || '',
				type:      el.dataset.type     || 'original',
				depth:     depth,
				wp_slug:   el.dataset.wpSlug   || null,
				parent_id: parentId || null,
				label:     el.dataset.label    || '',
				hidden:    el.dataset.hidden === 'true',
			};

			if (data.type === 'custom') {
				data.url        = el.dataset.url        || '';
				data.icon       = el.dataset.icon       || 'dashicons-admin-generic';
				data.capability = el.dataset.capability || 'read';
				data.target     = el.dataset.target     || '_self';
			}

			if (data.type === 'separator') data.type = 'separator';
			return data;
		});
	}

	// ── 모달 ─────────────────────────────────────────────────────
	function openModal() {
		document.getElementById('modal-label').value      = '';
		document.getElementById('modal-url').value        = '';
		document.getElementById('modal-icon').value       = 'dashicons-admin-generic';
		document.getElementById('modal-capability').value = 'read';
		document.getElementById('modal-target').value     = '_self';
		document.getElementById('modal-depth').value      = '1';
		updateIconPreview('modal-icon-preview', 'dashicons-admin-generic');
		document.getElementById('he-sorts-modal').style.display = '';
		setTimeout(function () { document.getElementById('modal-label').focus(); }, 50);
	}
	function closeModal() {
		document.getElementById('he-sorts-modal').style.display = 'none';
	}

	function handleModalConfirm() {
		var label   = document.getElementById('modal-label').value.trim();
		var url     = document.getElementById('modal-url').value.trim();
		var icon    = document.getElementById('modal-icon').value.trim() || 'dashicons-admin-generic';
		var cap     = document.getElementById('modal-capability').value;
		var target  = document.getElementById('modal-target').value;
		var depth   = parseInt(document.getElementById('modal-depth').value, 10);

		if (!label) { document.getElementById('modal-label').focus(); return; }
		if (!url)   { document.getElementById('modal-url').focus();   return; }

		var parentId = null;
		if (depth === 2 && selectedItem) {
			var selDepth = parseInt(selectedItem.dataset.depth || '1', 10);
			parentId = selDepth === 1 ? selectedItem.dataset.id : (selectedItem.dataset.parentId || null);
		}

		fetch(heSortsData.ajaxUrl, {
			method:  'POST',
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			body:    new URLSearchParams({
				action:     'he_sorts_add_custom_item',
				nonce:      heSortsData.nonce,
				label:      label, url: url, icon: icon,
				capability: cap,   target: target,
				depth:      depth, parent_id: parentId || '',
			}).toString(),
		})
		.then(function (r) { return r.json(); })
		.then(function (data) {
			if (data.success) {
				appendItem(data.data, parentId);
				closeModal();
				showToast(i18n.customAdded, 'success');
				recalculateParents();
			}
		});
	}

	function appendItem(item, parentId) {
		var depth = item.depth || 1;
		var icon  = item.icon || 'dashicons-admin-generic';
		var iconClass = icon.indexOf('dashicons-') === 0 ? ('dashicons ' + icon) : 'dashicons dashicons-admin-generic';

		var el = document.createElement('div');
		el.className = 'he-sorts-item hs-d' + depth;
		el.dataset.id         = item.id || '';
		el.dataset.type       = 'custom';
		el.dataset.depth      = String(depth);
		el.dataset.wpSlug     = '';
		el.dataset.parentId   = parentId || '';
		el.dataset.label      = item.label || '';
		el.dataset.originalLabel = item.label || '';
		el.dataset.icon       = icon;
		el.dataset.url        = item.url || '';
		el.dataset.capability = item.capability || 'read';
		el.dataset.target     = item.target || '_self';
		el.dataset.hidden     = 'false';

		el.innerHTML =
			'<span class="he-sorts-drag-handle dashicons dashicons-move"></span>' +
			'<span class="' + escAttr(iconClass) + ' hs-icon"></span>' +
			'<span class="hs-label">' + escHtml(item.label || '') + '</span>' +
			'<div class="he-sorts-item-actions">' +
				(depth < 3 ? '<button class="he-sorts-action-btn he-sorts-indent" title="하위로"><span class="dashicons dashicons-arrow-right-alt"></span></button>' : '') +
				(depth > 1 ? '<button class="he-sorts-action-btn he-sorts-outdent" title="상위로"><span class="dashicons dashicons-arrow-left-alt"></span></button>' : '') +
				'<button class="he-sorts-action-btn he-sorts-toggle-visibility" title="숨기기" data-hidden="false"><span class="dashicons dashicons-visibility"></span></button>' +
			'</div>';

		// 선택된 항목 다음에 삽입, 없으면 맨 뒤
		var root = document.getElementById('tree-root');
		if (selectedItem && selectedItem.parentNode === root) {
			root.insertBefore(el, selectedItem.nextSibling);
		} else {
			root.appendChild(el);
		}

		updateToggleButtons();
		applyAllCollapseStates();
	}

	// ── 아이콘 미리보기 ───────────────────────────────────────────
	function updateIconPreview(id, val) {
		var el = document.getElementById(id);
		if (!el) return;
		val = (val || '').trim();
		if (!val) val = 'dashicons-admin-generic';
		var cls = val.indexOf('dashicons-') === 0 ? val : ('dashicons-' + val);
		el.className = 'dashicons ' + cls + (el.classList.contains('hs-icon-pick-preview') ? ' hs-icon-pick-preview' : '');
	}

	// ── Dashicons 픽커 ────────────────────────────────────────────
	function buildPickerGrid() {
		if (pickerBuilt) return;
		pickerBuilt = true;
		var grid = document.getElementById('hs-icon-grid');
		if (!grid) return;
		var frag = document.createDocumentFragment();
		DASHICONS.forEach(function (name) {
			var cell = document.createElement('button');
			cell.type = 'button';
			cell.className = 'hs-icon-cell';
			cell.dataset.icon = name;
			cell.title = name;
			cell.innerHTML = '<span class="dashicons dashicons-' + name + '"></span>';
			cell.addEventListener('click', function () {
				selectPickerIcon(name);
			});
			frag.appendChild(cell);
		});
		grid.appendChild(frag);
	}

	function openPicker(targetId, previewId) {
		pickerTarget  = targetId;
		pickerPreview = previewId;
		buildPickerGrid();

		// 현재 선택된 아이콘 표시
		var currentVal = (document.getElementById(targetId || '') || {}).value || '';
		currentVal = currentVal.replace('dashicons-', '');
		var cells = document.querySelectorAll('#hs-icon-grid .hs-icon-cell');
		cells.forEach(function (c) {
			c.classList.toggle('is-selected', c.dataset.icon === currentVal);
		});

		document.getElementById('hs-icon-search').value = '';
		filterPicker('');

		var picker = document.getElementById('hs-icon-picker');
		if (picker) {
			picker.style.display = '';
			setTimeout(function () { document.getElementById('hs-icon-search').focus(); }, 60);
		}
	}

	function closePicker() {
		var picker = document.getElementById('hs-icon-picker');
		if (picker) picker.style.display = 'none';
	}

	function selectPickerIcon(name) {
		var fullName = 'dashicons-' + name;
		if (pickerTarget) {
			var input = document.getElementById(pickerTarget);
			if (input) { input.value = fullName; input.dispatchEvent(new Event('input')); }
		}
		if (pickerPreview) {
			updateIconPreview(pickerPreview, fullName);
		}
		closePicker();
	}

	function filterPicker(query) {
		var grid = document.getElementById('hs-icon-grid');
		if (!grid) return;
		var cells = grid.querySelectorAll('.hs-icon-cell');
		var found = 0;
		cells.forEach(function (c) {
			var match = !query || c.dataset.icon.indexOf(query) !== -1;
			c.style.display = match ? '' : 'none';
			if (match) found++;
		});
		var noResult = grid.querySelector('.hs-icon-no-result');
		if (!found) {
			if (!noResult) {
				noResult = document.createElement('p');
				noResult.className = 'hs-icon-no-result';
				noResult.textContent = '검색 결과가 없습니다.';
				grid.appendChild(noResult);
			}
		} else if (noResult) {
			noResult.remove();
		}
	}

	// ── 토스트 ───────────────────────────────────────────────────
	function showToast(msg, type) {
		var t = document.getElementById('he-sorts-toast');
		if (!t) return;
		t.textContent = msg;
		t.className = 'he-sorts-toast' + (type ? ' is-' + type : '');
		t.classList.add('is-visible');
		clearTimeout(t._timer);
		t._timer = setTimeout(function () { t.classList.remove('is-visible'); }, 3000);
	}

	// ── 유틸 ─────────────────────────────────────────────────────
	function escHtml(s) {
		return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	}
	function escAttr(s) {
		return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#039;');
	}

	document.addEventListener('DOMContentLoaded', init);
}());
