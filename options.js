document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('save');
    const apiKeyInput = document.getElementById('apiKey');
    const statusDiv = document.getElementById('status');

    // Wczytaj zapisany klucz przy otwarciu opcji, aby użytkownik widział, że jest ustawiony
    chrome.storage.sync.get('apiKey', (data) => {
        if (data.apiKey) {
            apiKeyInput.value = data.apiKey;
        }
    });

    // Zapisz klucz po kliknięciu przycisku
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim(); // .trim() usuwa białe znaki z początku i końca
        if (apiKey) {
            chrome.storage.sync.set({ apiKey: apiKey }, () => {
                statusDiv.textContent = 'Klucz API został zapisany!';
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 2500); // Komunikat zniknie po 2.5 sekundach
            });
        } else {
            statusDiv.textContent = 'Pole klucza API nie może być puste.';
            statusDiv.style.color = 'red';
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.style.color = '#4CAF50'; // Przywróć domyślny kolor
            }, 2500);
        }
    });
});