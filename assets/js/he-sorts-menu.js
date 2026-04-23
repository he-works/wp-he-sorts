/**
 * HE SORTS - 전체 관리자 페이지 적용 스크립트
 *
 * ① 커스텀 부모(he-sorts-custom) 아래 서브메뉴 링크 URL 정규화
 *    - PHP 에서 정규화하면 $submenu 슬러그 키가 바뀌어 플러그인 권한 체크 실패
 *    - 따라서 클라이언트 JS 에서 href 를 수정합니다.
 *
 * ② 커스텀 메뉴 항목 클릭 시 WP 관리자 사이드바 아코디언 열림 처리
 *    - WordPress 는 커스텀 URL(#, 외부 URL) 부모는 현재 페이지 강조 안 함
 *    - 현재 URL 의 page 파라미터로 서브메뉴 링크를 찾아 부모를 열림 상태로 설정
 */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {

		// ── ① 커스텀 부모 하위 서브메뉴 URL 정규화 ──────────────────
		fixCustomParentSubmenuUrls();

		// ── ② 커스텀 메뉴 현재 페이지 강조(아코디언 열림) ───────────
		openCurrentCustomMenu();

	});

	/**
	 * li.he-sorts-custom 바로 아래 .wp-submenu a 의 href 를 검사합니다.
	 * WordPress 가 커스텀 부모(#, 외부 URL)의 서브메뉴를 렌더링할 때
	 * admin_url($slug) → "wp-admin/slug" 형태로 잘못된 경로를 생성하므로
	 * "wp-admin/admin.php?page=slug" 형태로 교정합니다.
	 */
	function fixCustomParentSubmenuUrls() {
		// wp-admin 기본 경로 추출
		var adminBase = getAdminBase();
		if ( ! adminBase ) return;

		document.querySelectorAll( '#adminmenu li.he-sorts-custom .wp-submenu a' ).forEach( function ( a ) {
			var href = a.href; // 브라우저가 full URL 로 정규화한 값

			if ( ! href ) return;
			// 이미 올바른 형태이면 건너뜀
			if ( href.indexOf( 'admin.php?' ) !== -1 ) return;
			if ( href.indexOf( '.php' )       !== -1 ) return;
			if ( href.indexOf( '#' )          === 0  ) return;

			// adminBase 로 시작하고 쿼리스트링·해시 없는 경우만 처리
			if ( href.indexOf( adminBase ) === 0 ) {
				var slug = href.substring( adminBase.length );
				// 슬래시, 공백 없는 순수 slug 이면 정규화
				if ( slug && slug.indexOf( '/' ) === -1 && slug.indexOf( '?' ) === -1 ) {
					a.href = adminBase + 'admin.php?page=' + slug;
				}
			}
		} );
	}

	/**
	 * 현재 페이지 URL 의 ?page= 값을 기준으로, 그 서브메뉴 항목을 가진
	 * he-sorts-custom 부모 li 에 WordPress 아코디언 클래스를 추가합니다.
	 */
	function openCurrentCustomMenu() {
		var params   = new URLSearchParams( window.location.search );
		var pageSlug = params.get( 'page' );
		if ( ! pageSlug ) return;

		var found = false;

		// 서브메뉴 링크 중 현재 page slug 와 일치하는 링크 탐색
		document.querySelectorAll( '#adminmenu li.he-sorts-custom .wp-submenu a' ).forEach( function ( a ) {
			if ( found ) return;

			var href = a.getAttribute( 'href' ) || '';
			// "admin.php?page=slug" or "admin.php?page=slug&…" 패턴
			if ( href.indexOf( 'page=' + pageSlug ) !== -1 || href === pageSlug ) {
				var topLi = a.closest( '#adminmenu > li' );
				if ( ! topLi ) return;

				// WordPress 아코디언 오픈 클래스 부여
				topLi.classList.remove( 'wp-not-current-submenu' );
				topLi.classList.add( 'wp-has-current-submenu', 'wp-menu-open', 'current' );

				// 해당 서브메뉴 li 에도 current 표시
				var subLi = a.parentElement;
				if ( subLi ) subLi.classList.add( 'current' );

				// 아코디언 서브메뉴 표시 (WP 기본 동작에 맞게 inline style 제거)
				var subUl = topLi.querySelector( '.wp-submenu' );
				if ( subUl ) subUl.style.display = '';

				found = true;
			}
		} );
	}

	/** 현재 경로에서 /wp-admin/ 까지의 경로를 반환합니다. */
	function getAdminBase() {
		var path  = window.location.pathname;
		var idx   = path.indexOf( '/wp-admin/' );
		if ( idx === -1 ) return '';
		return window.location.origin + path.substring( 0, idx + 10 ); // 끝에 '/' 포함
	}

}());
