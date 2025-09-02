let modal = null;
let currentSelectionInfo = null;
let currentOriginalText = null;

function showModal(correctedText, originalText = null, selectionInfo = null) {
    // Zapisz informacje o selekcji
    currentSelectionInfo = selectionInfo;
    currentOriginalText = originalText;

    // Usuń stary modal, jeśli istnieje
    if (modal) {
        modal.remove();
    }

    // Sprawdź czy powinien być wyświetlony przycisk "Zastosuj"
    const showApplyButton = selectionInfo && selectionInfo.isEditable;

    // Stwórz HTML dla modala
    modal = document.createElement('div');
    modal.id = 'gemini-modal-overlay';
    modal.innerHTML = `
    <div id="gemini-modal-container">
      <h3>Poprawiona wersja tekstu</h3>
      <textarea id="gemini-modal-textarea" rows="6"></textarea>
      <div id="gemini-modal-buttons">
        <button id="gemini-copy-btn" class="gemini-modal-button">Kopiuj</button>
        ${showApplyButton ? '<button id="gemini-apply-btn" class="gemini-modal-button gemini-apply-btn">Zastosuj</button>' : ''}
        <button id="gemini-close-btn" class="gemini-modal-button">Zamknij</button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    const textarea = modal.querySelector('#gemini-modal-textarea');
    textarea.value = correctedText;

    // Funkcjonalność przycisków
    const copyBtn = modal.querySelector('#gemini-copy-btn');
    const closeBtn = modal.querySelector('#gemini-close-btn');
    const applyBtn = modal.querySelector('#gemini-apply-btn');

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(correctedText).then(() => {
            copyBtn.textContent = 'Skopiowano!';
            setTimeout(() => {
                copyBtn.textContent = 'Kopiuj';
                modal.remove();
            }, 20);
        });
    });

    // Obsługa przycisku "Zastosuj"
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            applyTextToElement(correctedText);
            applyBtn.textContent = 'Zastosowano!';
            setTimeout(() => {
                modal.remove();
            }, 100);
        });
    }

    const closeModal = () => {
        modal.remove();
        modal = null;
        currentSelectionInfo = null;
        currentOriginalText = null;
    };

    closeBtn.addEventListener('click', closeModal);
    // Zamykanie po kliknięciu w tło
    modal.addEventListener('click', (event) => {
        if (event.target.id === 'gemini-modal-overlay') {
            closeModal();
        }
    });
}

function applyTextToElement(newText) {
    if (!currentSelectionInfo || !currentSelectionInfo.isEditable || !currentOriginalText) {
        return;
    }

    try {
        // Znajdź element do edycji
        let targetElement = null;
        
        // Użyj ID jeśli jest dostępne
        if (currentSelectionInfo.elementInfo && currentSelectionInfo.elementInfo.elementId) {
            targetElement = document.getElementById(currentSelectionInfo.elementInfo.elementId);
        }

        if (!targetElement) {
            console.warn('Nie można znaleźć elementu docelowego do zastąpienia tekstu');
            return;
        }

        // Zastąp tekst w zależności od typu elementu
        if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
            const value = targetElement.value;
            let startPos = currentSelectionInfo.elementInfo.textStart;
            let endPos = currentSelectionInfo.elementInfo.textEnd;
            
            // Sprawdź czy mamy prawidłowe pozycje
            if (startPos !== -1 && endPos !== -1) {
                const textAtPosition = value.substring(startPos, endPos);
                if (textAtPosition === currentOriginalText) {
                    // Zastąp tekst na zapisanej pozycji
                    targetElement.value = value.substring(0, startPos) + newText + value.substring(endPos);
                    targetElement.selectionStart = targetElement.selectionEnd = startPos + newText.length;
                } else {
                    console.warn('Tekst na zapisanej pozycji nie pasuje do oryginału');
                    return;
                }
            } else {
                console.warn('Brak prawidłowych pozycji tekstu');
                return;
            }
            
            // Wywołaj event 'input' aby powiadomić o zmianie
            targetElement.dispatchEvent(new Event('input', { bubbles: true }));
            targetElement.focus();
            
        } else if (targetElement.contentEditable === 'true' || targetElement.isContentEditable) {
            // Dla elementów contentEditable - zamień całą zawartość tekstową
            const elementText = targetElement.textContent || '';
            if (elementText.includes(currentOriginalText)) {
                const newContent = elementText.replace(currentOriginalText, newText);
                targetElement.textContent = newContent;
                targetElement.focus();
            } else {
                console.warn('Nie można znaleźć oryginalnego tekstu w elemencie contentEditable');
            }
        }

    } catch (error) {
        console.error('Błąd podczas zastępowania tekstu:', error);
    }
}


// Nasłuchuj na wiadomość z background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Odpowiedz na "ping", aby background.js wiedział, że skrypt jest aktywny
    if (request.action === "ping") {
        sendResponse({ status: "ready" });
        return true; // Ważne, aby utrzymać otwarty kanał odpowiedzi
    }

    if (request.action === "showModal") {
        showModal(request.text, request.originalText, request.selectionInfo);
    }
});