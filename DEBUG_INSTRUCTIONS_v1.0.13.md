# HE SORTS — Claude Code 수정 지시서 (v1.0.13 대상)

> 이 파일은 v1.0.12 디버깅 세션 이후, 직접 수정하지 못하고 남겨둔 항목들을 Claude Code가 처리하기 위한 지시서입니다.  
> 수정 완료 후 버전을 **1.0.13** 으로 올리고, `README.md` changelog 와 `he-sorts.php` / `HE_SORTS_VERSION` 상수도 함께 업데이트하세요.

---

## [S9] 부모 항목 삭제 시 자식 항목도 함께 삭제

### 문제 설명

`handlePropsDelete()` 는 선택된 항목만 DOM에서 제거하고 `recalculateParents()`를 호출합니다.  
부모(d1)를 삭제하면 하위 항목(d2, d3)들은 고아(orphan)가 되어 `recalculateParents()` 에 의해 depth가 강제로 1 감소됩니다.  
결과적으로 기존 d2 항목들이 d1으로 승격되는데, 사용자 입장에서는 부모를 삭제했을 때 자식들이 살아남는 것이 더 혼란스럽습니다.

**기대 동작**: 부모 항목 삭제 시 모든 하위 항목(getItemBlock 기준)도 함께 삭제.

### 수정 위치

파일: `assets/js/he-sorts-editor.js`  
함수: `handlePropsDelete()`

### 현재 코드

```javascript
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
```

### 수정 방법

`selectedItem.remove()` 전에 `getItemBlock(selectedItem)` 으로 블록 전체를 가져와 모두 제거합니다.  
confirm 메시지도 하위 항목 수를 포함해 안내하도록 변경합니다.

```javascript
function handlePropsDelete() {
    if (!selectedItem) return;

    var block = getItemBlock(selectedItem);
    var childCount = block.length - 1; // 본인 제외 하위 항목 수

    var msg = childCount > 0
        ? '이 항목과 하위 항목 ' + childCount + '개가 모두 삭제됩니다. 계속하시겠습니까?'
        : i18n.confirmDelete;

    if (!confirm(msg)) return;

    block.forEach(function (node) { node.remove(); });
    selectedItem = null;
    document.getElementById('props-empty').style.display = '';
    document.getElementById('props-form').style.display  = 'none';
    recalculateParents();
    updateToggleButtons();
    showToast('항목이 삭제되었습니다.');
}
```

---

## [S10] CSS 높이 계산 `calc(100vh - 73px)` 부정확

### 문제 설명

`assets/css/he-sorts-editor.css` 에서 에디터 컨테이너 높이를 `calc(100vh - 73px)` 로 고정합니다.  
이 값은 WP 관리자 바(32px) + 에디터 헤더(약 41px)를 합산한 추정치인데,  
WP 버전/테마/화면 해상도에 따라 관리자 바가 46px으로 변하거나 헤더 높이가 달라져 스크롤 overflow가 생기거나 빈 공간이 남습니다.

### 수정 위치

파일: `assets/css/he-sorts-editor.css`  
파일: `assets/js/he-sorts-editor.js` (JS로 동적 계산 추가)

### 수정 방법 — CSS-only 방식 (권장)

`calc(100vh - Xpx)` 대신 CSS 변수와 flex/grid를 활용해 컨테이너가 남은 뷰포트를 자동으로 채우게 합니다.

```css
/* 기존 */
.he-sorts-wrap {
    height: calc(100vh - 73px);
    /* ... */
}

/* 수정: 부모를 flex column 으로 만들고 wrap 이 남은 공간을 채우게 */
#wpwrap {
    display: flex;
    flex-direction: column;
}
.he-sorts-page {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
}
.he-sorts-wrap {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    /* height: calc(...) 제거 */
}
```

**주의**: `#wpwrap` 과 `.he-sorts-page` 는 WP 관리자 전체 레이아웃에 영향을 주므로,  
HE SORTS 에디터 페이지(`body.toplevel_page_he-sorts`)에만 적용하도록 선택자를 좁혀야 합니다.

```css
body.toplevel_page_he-sorts #wpwrap {
    display: flex;
    flex-direction: column;
}
body.toplevel_page_he-sorts .wrap {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding-bottom: 0;
}
.he-sorts-wrap {
    flex: 1;
    min-height: 0;
    /* height: calc(100vh - 73px) 제거 */
}
```

또한 `.he-sorts-props-panel` 의 `sticky top: 32px` 도 실제 WP 관리자 바 높이(`#wpadminbar` 의 offsetHeight)를 JS로 읽어 CSS 변수로 주입하는 것이 더 정확합니다:

```javascript
// init() 초반에 추가
var adminBarH = (document.getElementById('wpadminbar') || {offsetHeight: 32}).offsetHeight;
document.documentElement.style.setProperty('--wp-admin-bar-h', adminBarH + 'px');
```

```css
.he-sorts-props-panel {
    top: var(--wp-admin-bar-h, 32px);
}
```

---

## 수정 완료 후 체크리스트

1. `he-sorts.php` Plugin header `Version:` → `1.0.13`
2. `he-sorts.php` `HE_SORTS_VERSION` 상수 → `'1.0.13'`
3. `README.md` 버전 뱃지 → `1.0.13`
4. `README.md` 변경 이력 → `### v1.0.13 (날짜)` 항목 추가
5. 브라우저에서 에디터 실제 동작 확인:
   - 부모 항목 삭제 → 자식도 함께 삭제되는지
   - 에디터 높이가 화면을 꽉 채우고 스크롤 이상 없는지
