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
async function handleCorrection(text, tab, selectionInfo = null) {
    if (!text || !tab) return;
    const correctedText = await getCorrectionFromGemini(text);

    try {
        await chrome.tabs.sendMessage(tab.id, {action: "ping"});
        chrome.tabs.sendMessage(tab.id, {
            action: "showModal", 
            text: correctedText, 
            originalText: text,
            selectionInfo: selectionInfo
        });
    } catch (error) {
        await chrome.scripting.insertCSS({target: {tabId: tab.id}, files: ['modal.css']});
        await chrome.scripting.executeScript({target: {tabId: tab.id}, files: ['modal.js']});
        chrome.tabs.sendMessage(tab.id, {
            action: "showModal", 
            text: correctedText, 
            originalText: text,
            selectionInfo: selectionInfo
        });
    }
}

// Listener do menu kontekstowego
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "correct-language-gemini") {
        // Pobierz dodatkowe informacje o selekcji
        const results = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: (selectedText) => {
                const selection = window.getSelection();
                if (!selection.rangeCount) return null;

                // Sprawdź czy selekcja pochodzi z edytowalnego elementu
                let isEditable = false;
                let elementInfo = null;

                const range = selection.getRangeAt(0);
                const container = range.commonAncestorContainer;
                const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
                
                // Sprawdź czy element jest edytowalny
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || 
                    element.contentEditable === 'true' || element.isContentEditable) {
                    isEditable = true;
                    
                    // Dla INPUT i TEXTAREA znajdź pozycję zaznaczonego tekstu w wartości elementu
                    let textStart = -1;
                    let textEnd = -1;
                    
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        const value = element.value;
                        if (selectedText && value.includes(selectedText)) {
                            // Znajdź pozycję zaznaczonego tekstu w wartości elementu
                            textStart = value.indexOf(selectedText);
                            if (textStart !== -1) {
                                textEnd = textStart + selectedText.length;
                            }
                        }
                    }
                    
                    // Stwórz unikalny selektor dla elementu
                    const getElementSelector = (el) => {
                        if (el.id) return `#${el.id}`;
                        
                        let selector = el.tagName.toLowerCase();
                        if (el.className) {
                            selector += '.' + el.className.split(' ').filter(c => c).join('.');
                        }
                        
                        // Dodaj indeks wśród elementów tego samego typu
                        const siblings = document.querySelectorAll(selector);
                        if (siblings.length > 1) {
                            const index = Array.from(siblings).indexOf(el);
                            selector += `:nth-of-type(${index + 1})`;
                        }
                        
                        return selector;
                    };
                    
                    elementInfo = {
                        tagName: element.tagName,
                        elementId: element.id || null,
                        className: element.className || null,
                        selector: getElementSelector(element),
                        textStart: textStart,
                        textEnd: textEnd,
                        currentSelectionStart: element.selectionStart,
                        currentSelectionEnd: element.selectionEnd
                    };
                }

                return {
                    isEditable: isEditable,
                    elementInfo: elementInfo
                };
            },
            args: [info.selectionText]
        });

        const selectionInfo = results && results[0] && results[0].result ? results[0].result : null;
        handleCorrection(info.selectionText, tab, selectionInfo);
    }
});

// Obsługa skrótu klawiaturowego
chrome.commands.onCommand.addListener(async (command, tab) => {
    if (command === "correct-language-shortcut") {
        const results = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => {
                const selection = window.getSelection();
                const selectedText = selection.toString();
                if (!selectedText) return null;

                // Sprawdź czy selekcja pochodzi z edytowalnego elementu
                let isEditable = false;
                let elementInfo = null;

                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer;
                    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
                    
                    // Sprawdź czy element jest edytowalny
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || 
                        element.contentEditable === 'true' || element.isContentEditable) {
                        isEditable = true;
                        
                        // Dla INPUT i TEXTAREA znajdź pozycję zaznaczonego tekstu w wartości elementu
                        let textStart = -1;
                        let textEnd = -1;
                        
                        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                            const value = element.value;
                            if (selectedText && value.includes(selectedText)) {
                                // Znajdź pozycję zaznaczonego tekstu w wartości elementu
                                textStart = value.indexOf(selectedText);
                                if (textStart !== -1) {
                                    textEnd = textStart + selectedText.length;
                                }
                            }
                        }
                        
                        // Stwórz unikalny selektor dla elementu
                        const getElementSelector = (el) => {
                            if (el.id) return `#${el.id}`;
                            
                            let selector = el.tagName.toLowerCase();
                            if (el.className) {
                                selector += '.' + el.className.split(' ').filter(c => c).join('.');
                            }
                            
                            // Dodaj indeks wśród elementów tego samego typu
                            const siblings = document.querySelectorAll(selector);
                            if (siblings.length > 1) {
                                const index = Array.from(siblings).indexOf(el);
                                selector += `:nth-of-type(${index + 1})`;
                            }
                            
                            return selector;
                        };
                        
                        elementInfo = {
                            tagName: element.tagName,
                            elementId: element.id || null,
                            className: element.className || null,
                            selector: getElementSelector(element),
                            textStart: textStart,
                            textEnd: textEnd,
                            currentSelectionStart: element.selectionStart,
                            currentSelectionEnd: element.selectionEnd
                        };
                    }
                }

                return {
                    text: selectedText,
                    isEditable: isEditable,
                    elementInfo: elementInfo
                };
            },
        });

        if (results && results[0] && results[0].result && results[0].result.text) {
            const result = results[0].result;
            handleCorrection(result.text, tab, {
                isEditable: result.isEditable,
                elementInfo: result.elementInfo
            });
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
chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});