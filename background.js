async function getCorrectionFromGemini(text) {
    const data = await chrome.storage.sync.get('apiKey');
    if (!data.apiKey) {
        return "BŁĄD: Klucz API do Gemini nie został ustawiony. Kliknij ikonę rozszerzenia, aby go dodać na stronie opcji.";
    }
    const apiKey = data.apiKey;

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

    const prompt = `Popraw poniższy tekst pod względem gramatyki, ortografii i stylu. Nie dodawaj żadnych dodatkowych komentarzy ani wyjaśnień. Zwróć tylko poprawioną wersję tekstu. Tekst do poprawy: "${text}"`;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                "contents": [{parts: [{text: prompt}]}],
                "generationConfig": {
                    "thinkingConfig": {
                        "thinkingBudget": 0
                    }
                }
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            return `Błąd odpowiedzi od API: ${errorData.error.message}`;
        }
        const responseData = await response.json();
        if (responseData.candidates && responseData.candidates[0].content.parts[0].text) {
            return responseData.candidates[0].content.parts[0].text;
        } else {
            return "Błąd: Otrzymano nieprawidłową odpowiedź od API.";
        }
    } catch (error) {
        return "Błąd: Nie udało się połączyć z API Gemini. Sprawdź połączenie internetowe.";
    }
}

// Wspólna logika dla menu i skrótu klawiaturowego
async function handleCorrection(text, tab, editorId = null) {
    if (!text || !tab) return;
    const correctedText = await getCorrectionFromGemini(text);

    try {
        await chrome.tabs.sendMessage(tab.id, {action: "ping"});
        
        // If editorId is provided, try to replace text directly in TinyMCE
        if (editorId) {
            chrome.tabs.sendMessage(tab.id, {
                action: "replaceText", 
                text: correctedText, 
                editorId: editorId
            });
        } else {
            // Otherwise show modal
            chrome.tabs.sendMessage(tab.id, {action: "showModal", text: correctedText});
        }
    } catch (error) {
        await chrome.scripting.insertCSS({target: {tabId: tab.id}, files: ['modal.css']});
        await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['modal.js']});
        
        if (editorId) {
            chrome.tabs.sendMessage(tab.id, {
                action: "replaceText", 
                text: correctedText, 
                editorId: editorId
            });
        } else {
            chrome.tabs.sendMessage(tab.id, {action: "showModal", text: correctedText});
        }
    }
}

// Listener do menu kontekstowego
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "correct-language-gemini") {
        handleCorrection(info.selectionText, tab);
    }
});

// Obsługa skrótu klawiaturowego
chrome.commands.onCommand.addListener(async (command, tab) => {
    if (command === "correct-language-shortcut") {
        const results = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => window.getSelection().toString(),
        });

        if (results && results[0] && results[0].result) {
            const selectedText = results[0].result;
            handleCorrection(selectedText, tab);
        }
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "correct-language-gemini",
        title: "Popraw język z Gemini",
        contexts: ["selection"]
    });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "correctText") {
        const tab = sender.tab;
        if (tab) {
            handleCorrection(request.text, tab, request.editorId);
        }
        sendResponse({status: "processing"});
        return true;
    }
});

chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});