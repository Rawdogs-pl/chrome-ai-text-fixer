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
        const elementInfo = currentSelectionInfo.elementInfo;
        let targetElement = null;
        
        // Użyj ID jeśli jest dostępne
        if (elementInfo && elementInfo.elementId) {
            targetElement = document.getElementById(elementInfo.elementId);
        }
        
        // Jeśli nie ma ID, spróbuj użyć zapisanych referencji do elementów
        if (!targetElement && elementInfo) {
            if (elementInfo.elementType === 'input') {
                targetElement = elementInfo.editableElement || elementInfo.selectedElement;
            } else {
                targetElement = elementInfo.editableElement;
            }
        }

        if (!targetElement) {
            console.warn('Nie można znaleźć elementu docelowego do zastąpienia tekstu');
            return;
        }

        // Zastąp tekst w zależności od typu elementu
        if (elementInfo.elementType === 'input') {
            const value = targetElement.value;
            let startPos = elementInfo.textStart;
            let endPos = elementInfo.textEnd;
            
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
            
        } else if (elementInfo.elementType === 'contentEditable' || elementInfo.elementType === 'contentEditableParent') {
            // Dla elementów contentEditable - użyj bardziej zaawansowanej logiki
            if (replaceTextInContentEditable(targetElement, elementInfo.selectedElement, currentOriginalText, newText)) {
                targetElement.focus();
                
                // Wywołaj eventy aby powiadomić o zmianie
                targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                targetElement.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                console.warn('Nie udało się zastąpić tekstu w elemencie contentEditable');
            }
        }

    } catch (error) {
        console.error('Błąd podczas zastępowania tekstu:', error);
    }
}

function replaceTextInContentEditable(editableElement, selectedElement, originalText, newText) {
    // Sprawdź czy selectedElement nadal istnieje w DOM
    if (!document.contains(selectedElement)) {
        console.warn('Pierwotnie zaznaczony element nie istnieje już w DOM');
        return fallbackContentEditableReplace(editableElement, originalText, newText);
    }
    
    // Spróbuj zastąpić tekst w konkretnym elemencie gdzie była selekcja
    if (selectedElement.textContent && selectedElement.textContent.includes(originalText)) {
        // Jeśli to element tekstowy (np. <p>), zastąp jego zawartość
        if (selectedElement.textContent === originalText) {
            selectedElement.textContent = newText;
            return true;
        } else {
            // Częściowa zamiana w elemencie
            selectedElement.textContent = selectedElement.textContent.replace(originalText, newText);
            return true;
        }
    }
    
    // Spróbuj na poziomie węzłów tekstowych
    const walker = document.createTreeWalker(
        selectedElement,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let textNode;
    while (textNode = walker.nextNode()) {
        if (textNode.textContent && textNode.textContent.includes(originalText)) {
            textNode.textContent = textNode.textContent.replace(originalText, newText);
            return true;
        }
    }
    
    // Ostatni fallback - przeszukaj cały editable element
    return fallbackContentEditableReplace(editableElement, originalText, newText);
}

function fallbackContentEditableReplace(editableElement, originalText, newText) {
    // Sprawdź czy cały element zawiera oryginalny tekst
    const elementText = editableElement.textContent || '';
    if (elementText.includes(originalText)) {
        // Sprawdź czy to proste zastąpienie całego tekstu
        if (elementText.trim() === originalText.trim()) {
            editableElement.textContent = newText;
            return true;
        }
        
        // Dla Facebook Messenger i podobnych - spróbuj znaleźć odpowiedni element <p>
        const paragraphs = editableElement.querySelectorAll('p, div[contenteditable], span');
        for (const p of paragraphs) {
            if (p.textContent && p.textContent.includes(originalText)) {
                if (p.textContent.trim() === originalText.trim()) {
                    p.textContent = newText;
                    return true;
                } else {
                    p.textContent = p.textContent.replace(originalText, newText);
                    return true;
                }
            }
        }
        
        // Ostateczny fallback - zamień na poziomie węzłów tekstowych w całym elemencie
        const walker = document.createTreeWalker(
            editableElement,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let textNode;
        while (textNode = walker.nextNode()) {
            if (textNode.textContent && textNode.textContent.includes(originalText)) {
                textNode.textContent = textNode.textContent.replace(originalText, newText);
                return true;
            }
        }
    }
    
    return false;
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