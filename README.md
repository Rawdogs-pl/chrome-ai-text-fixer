# Chrome AI Text Fixer - TinyMCE v6 Integration Fix

## Problem Rozwiązany / Problem Solved

**Polski:** W edytorze TinyMCE v6, kliknięcie prawym przyciskiem myszy nie pokazuje menu kontekstowego przeglądarki, przez co użytkownicy nie mogą uzyskać dostępu do opcji rozszerzenia. Dodatkowo, skróty klawiaturowe również nie działają.

**English:** In TinyMCE v6 editor, right-clicking doesn't show the browser's context menu, preventing users from accessing the extension's options. Additionally, keyboard shortcuts also don't work.

## Rozwiązanie / Solution

Dodano **content script** (`content.js`), który:

1. **Wykrywa edytory TinyMCE v6** automatycznie na stronie
2. **Dodaje niestandardowe menu kontekstowe** gdy TinyMCE blokuje domyślne menu przeglądarki
3. **Implementuje skróty klawiaturowe** bezpośrednio w edytorze TinyMCE
4. **Opcjonalnie dodaje przycisk** do paska narzędzi TinyMCE
5. **Zachowuje kompatybilność** z innymi edytorami i textarea

### Kluczowe funkcje / Key Features:

- ✅ **Wykrywanie TinyMCE:** Automatyczne wykrywanie instancji TinyMCE v6
- ✅ **Niestandardowe menu kontekstowe:** Zastępuje zablokowane menu przeglądarki
- ✅ **Skróty klawiaturowe:** Ctrl+Shift+K (Cmd+Shift+K na Mac) działają w TinyMCE
- ✅ **Bezpośrednia zamiana tekstu:** Poprawiony tekst zastępuje zaznaczony tekst w edytorze
- ✅ **Przycisk paska narzędzi:** Opcjonalny przycisk "Popraw Język" w TinyMCE
- ✅ **Kompatybilność wsteczna:** Nadal działa z zwykłymi textarea i contenteditable

## Implementacja / Implementation

### Nowe pliki / New Files:

- **`content.js`** - Główny content script obsługujący integrację z TinyMCE
- **`test-simple.html`** - Strona testowa z symulacją TinyMCE
- **`validate-solution.js`** - Skrypt walidacji rozwiązania

### Zmodyfikowane pliki / Modified Files:

- **`manifest.json`** - Dodano content_scripts sekcję
- **`background.js`** - Dodano obsługę wiadomości z content script

## Jak to działa / How It Works

### 1. Wykrywanie TinyMCE / TinyMCE Detection
```javascript
// Sprawdza czy TinyMCE jest załadowany
if (typeof window.tinymce !== 'undefined') {
    const editors = window.tinymce.editors;
    // Konfiguruje integrację dla każdego edytora
}
```

### 2. Menu kontekstowe / Context Menu
```javascript
editor.on('contextmenu', (e) => {
    const selectedText = editor.selection.getContent({format: 'text'});
    if (selectedText && selectedText.trim().length > 0) {
        e.preventDefault();
        showCustomContextMenu(e.clientX, e.clientY, selectedText, editor);
    }
});
```

### 3. Skróty klawiaturowe / Keyboard Shortcuts
```javascript
// Dodaje skrót bezpośrednio do TinyMCE
editor.addShortcut('ctrl+shift+k', 'Popraw język z Gemini', () => {
    const selectedText = editor.selection.getContent({format: 'text'});
    if (selectedText && selectedText.trim().length > 0) {
        handleTextCorrection(selectedText, editor);
    }
});
```

### 4. Zamiana tekstu / Text Replacement
```javascript
// Zastępuje zaznaczony tekst poprawionym tekstem
function handleCorrectedText(correctedText, editorId) {
    if (editorId && tinymceInstances.has(editorId)) {
        const editor = tinymceInstances.get(editorId);
        editor.selection.setContent(correctedText);
    }
}
```

## Testowanie / Testing

### Test lokalny / Local Testing:

1. Załaduj rozszerzenie w Chrome (tryb programisty)
2. Otwórz `test-simple.html` w przeglądarce
3. Testuj różne scenariusze:
   - Zwykły textarea
   - ContentEditable div
   - Symulacja TinyMCE (blokuje menu kontekstowe)

### Scenariusze testowe / Test Scenarios:

- **Test 1:** Podstawowy textarea - standardowe menu kontekstowe
- **Test 2:** ContentEditable div - działa jak TinyMCE
- **Test 3:** Symulacja TinyMCE - niestandardowe menu i skróty

## Kompatybilność / Compatibility

- ✅ **TinyMCE v6+** - Pełna obsługa z niestandardowymi elementami UI
- ✅ **TinyMCE v5** - Podstawowa obsługa poprzez content script
- ✅ **Standardowe textarea** - Oryginalna funkcjonalność zachowana
- ✅ **ContentEditable** - Wsparcie dla edytorów podobnych do TinyMCE
- ✅ **Inne edytory** - Automatyczne wykrywanie i obsługa

## Instalacja / Installation

Rozszerzenie automatycznie wykrywa i konfiguruje obsługę TinyMCE. Nie wymaga dodatkowej konfiguracji.

## Funkcje dodatkowe / Additional Features

### Przycisk paska narzędzi / Toolbar Button
Content script próbuje dodać przycisk "Popraw Język" do paska narzędzi TinyMCE:

```javascript
editor.ui.registry.addButton('gemini-correct', {
    text: 'Popraw Język',
    tooltip: 'Popraw zaznaczony tekst z Gemini (Ctrl+Shift+K)',
    onAction: () => { /* obsługa korekty */ }
});
```

### Debug / Debugging
Content script ustawia flagę `window.chromeAITextFixerActive = true` dla celów debugowania.

## Rozwiązywanie problemów / Troubleshooting

### TinyMCE nie jest wykrywane:
- Sprawdź czy TinyMCE jest w pełni załadowany
- Content script ma opóźnienie 1 sekundy dla dynamicznie ładowanych edytorów

### Skróty klawiaturowe nie działają:
- Upewnij się, że tekst jest zaznaczony
- Sprawdź czy inne rozszerzenia nie przechwytują skrótu

### Menu kontekstowe nie pojawia się:
- Sprawdź console browser dla błędów
- Upewnij się, że tekst jest zaznaczony przed kliknięciem prawym przyciskiem

## Changelog

### v1.1 (Ta wersja)
- ✅ Dodano pełną obsługę TinyMCE v6
- ✅ Implementowano niestandardowe menu kontekstowe
- ✅ Dodano skróty klawiaturowe specyficzne dla TinyMCE
- ✅ Opcjonalny przycisk paska narzędzi
- ✅ Automatyczne wykrywanie edytorów
- ✅ Bezpośrednia zamiana tekstu w edytorze
- ✅ Zachowano kompatybilność wsteczną

### v1.0 (Poprzednia wersja)
- Podstawowa funkcjonalność z menu kontekstowym przeglądarki
- Ograniczona obsługa TinyMCE