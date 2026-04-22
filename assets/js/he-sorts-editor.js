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
	var pickerTarget  = null;   // input id
	var pickerPreview = null;   // preview span id
	var pickerBuilt   = false;

	// ── 초기화 ──────────────────────────────────────────────────
	function init() {
		initSortable();
		bindEvents();
	}

	// ── SortableJS (단일 플랫 리스트) ────────────────────────────
	function initSortable() {
		if (sortable) sortable.destroy();
		var root = document.getElementById('tree-root');
		if (!root) return;

		sortable = Sortable.create(root, {
			handle:      '.he-sorts-drag-handle',
			animation:   150,
			ghostClass:  'sortable-ghost',
			dragClass:   'sortable-drag',
			onEnd: function () {
				// 드래그 후 parent_id 를 인접 항목 기준으로 재계산
				recalculateParents();
			},
		});
	}

	/**
	 * flat list 에서 각 항목의 parent_id 를 재계산합니다.
	 * 규칙: 자신보다 depth 가 1 작은 직전 항목이 부모.
	 */
	function recalculateParents() {
		var items = Array.from(document.querySelectorAll('#tree-root > .he-sorts-item'));
		items.forEach(function (el, idx) {
			var depth = parseInt(el.dataset.depth || '1', 10);
			if (depth === 1) {
				el.dataset.parentId = '';
				return;
			}
			// 역방향으로 depth-1 작은 항목 검색
			for (var i = idx - 1; i >= 0; i--) {
				var prev = items[i];
				var prevDepth = parseInt(prev.dataset.depth || '1', 10);
				if (prevDepth === depth - 1) {
					el.dataset.parentId = prev.dataset.id;
					return;
				}
				if (prevDepth < depth - 1) break; // 더 올라갈 필요 없음
			}
			// 부모를 못 찾으면 depth 강제 조정
			el.dataset.depth = String(depth - 1);
			el.className = el.className.replace(/\bhs-d\d\b/, 'hs-d' + (depth - 1));
			el.dataset.parentId = '';
		});
	}

	// ── 이벤트 바인딩 ─────────────────────────────────────────────
	function bindEvents() {
		var tree = document.getElementById('he-sorts-tree');
		if (!tree) return;

		tree.addEventListener('click', function (e) {
			var item = e.target.closest('.he-sorts-item');
			if (!item) return;

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

		// 들여쓰기/내보내기 버튼 갱신
		updateDepthButtons(item, newDepth);
		recalculateParents();
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
