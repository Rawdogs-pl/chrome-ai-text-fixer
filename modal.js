let modal = null;

function showModal(correctedText) {
    // Usuń stary modal, jeśli istnieje
    if (modal) {
        modal.remove();
    }

    // Stwórz HTML dla modala
    modal = document.createElement('div');
    modal.id = 'gemini-modal-overlay';
    modal.innerHTML = `
    <div id="gemini-modal-container">
      <h3>Poprawiona wersja tekstu</h3>
      <textarea id="gemini-modal-textarea" rows="6"></textarea>
      <div id="gemini-modal-buttons">
        <button id="gemini-copy-btn" class="gemini-modal-button">Kopiuj</button>
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

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(correctedText).then(() => {
            copyBtn.textContent = 'Skopiowano!';
            setTimeout(() => {
                copyBtn.textContent = 'Kopiuj';
                modal.remove();
            }, 20);
        });
    });

    const closeModal = () => {
        modal.remove();
        modal = null;
    };

    closeBtn.addEventListener('click', closeModal);
    // Zamykanie po kliknięciu w tło
    modal.addEventListener('click', (event) => {
        if (event.target.id === 'gemini-modal-overlay') {
            closeModal();
        }
    });
}


// Nasłuchuj na wiadomość z background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Odpowiedz na "ping", aby background.js wiedział, że skrypt jest aktywny
    if (request.action === "ping") {
        sendResponse({ status: "ready" });
        return true; // Ważne, aby utrzymać otwarty kanał odpowiedzi
    }

    if (request.action === "showModal") {
        showModal(request.text);
    }
});