// Content script for TinyMCE v6 integration
// Handles context menu and keyboard shortcuts when TinyMCE blocks browser defaults

let tinymceInstances = new Map();
let isExtensionActive = false;

// Initialize the content script
function init() {
    console.log('Chrome AI Text Fixer: Initializing content script');
    
    // Check for existing TinyMCE instances
    checkForTinyMCE();
    
    // Monitor for dynamically loaded TinyMCE instances
    const observer = new MutationObserver(() => {
        checkForTinyMCE();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Add global keyboard shortcut listener
    document.addEventListener('keydown', handleGlobalKeyboard, true);
    
    isExtensionActive = true;
}

// Check for TinyMCE instances on the page
function checkForTinyMCE() {
    // Check if TinyMCE is loaded
    if (typeof window.tinymce === 'undefined') {
        return;
    }
    
    // Get all TinyMCE editors
    const editors = window.tinymce.editors;
    
    editors.forEach(editor => {
        if (!tinymceInstances.has(editor.id)) {
            console.log('Chrome AI Text Fixer: Found TinyMCE editor:', editor.id);
            setupTinyMCEIntegration(editor);
            tinymceInstances.set(editor.id, editor);
        }
    });
}

// Setup integration with a specific TinyMCE editor
function setupTinyMCEIntegration(editor) {
    // Wait for editor to be ready
    editor.on('init', () => {
        console.log('Chrome AI Text Fixer: Setting up TinyMCE integration for editor:', editor.id);
        
        // Add context menu integration
        setupContextMenu(editor);
        
        // Add keyboard shortcut integration
        setupKeyboardShortcuts(editor);
        
        // Optionally add a toolbar button
        addToolbarButton(editor);
    });
    
    // If editor is already initialized
    if (editor.initialized) {
        setupContextMenu(editor);
        setupKeyboardShortcuts(editor);
        addToolbarButton(editor);
    }
}

// Setup context menu for TinyMCE editor
function setupContextMenu(editor) {
    editor.on('contextmenu', (e) => {
        const selectedText = editor.selection.getContent({format: 'text'});
        
        if (selectedText && selectedText.trim().length > 0) {
            // Prevent TinyMCE's context menu if we have selected text
            e.preventDefault();
            
            // Show custom context menu
            showCustomContextMenu(e.clientX, e.clientY, selectedText, editor);
        }
    });
}

// Setup keyboard shortcuts for TinyMCE editor
function setupKeyboardShortcuts(editor) {
    editor.addShortcut('ctrl+shift+k', 'Popraw język z Gemini', () => {
        const selectedText = editor.selection.getContent({format: 'text'});
        if (selectedText && selectedText.trim().length > 0) {
            handleTextCorrection(selectedText, editor);
        } else {
            showNoSelectionMessage();
        }
    });
    
    // Also try meta+shift+k for Mac
    editor.addShortcut('meta+shift+k', 'Popraw język z Gemini', () => {
        const selectedText = editor.selection.getContent({format: 'text'});
        if (selectedText && selectedText.trim().length > 0) {
            handleTextCorrection(selectedText, editor);
        } else {
            showNoSelectionMessage();
        }
    });
}

// Add a toolbar button to TinyMCE
function addToolbarButton(editor) {
    editor.ui.registry.addButton('gemini-correct', {
        text: 'Popraw Język',
        tooltip: 'Popraw zaznaczony tekst z Gemini (Ctrl+Shift+K)',
        icon: 'spell-check',
        onAction: () => {
            const selectedText = editor.selection.getContent({format: 'text'});
            if (selectedText && selectedText.trim().length > 0) {
                handleTextCorrection(selectedText, editor);
            } else {
                showNoSelectionMessage();
            }
        }
    });
    
    // Add to toolbar if possible
    try {
        const toolbar = editor.settings.toolbar;
        if (toolbar && typeof toolbar === 'string' && !toolbar.includes('gemini-correct')) {
            editor.settings.toolbar = toolbar + ' | gemini-correct';
        }
    } catch (e) {
        console.log('Chrome AI Text Fixer: Could not add to toolbar automatically');
    }
}

// Handle global keyboard shortcuts (fallback for non-TinyMCE contexts)
function handleGlobalKeyboard(e) {
    // Check for Ctrl+Shift+K or Cmd+Shift+K
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        // Check if we're in a TinyMCE editor
        const activeElement = document.activeElement;
        
        // If we're in TinyMCE, let TinyMCE handle it
        if (activeElement && activeElement.closest('.tox-edit-area')) {
            return; // TinyMCE will handle this
        }
        
        // Otherwise, handle normally
        const selectedText = window.getSelection().toString();
        if (selectedText && selectedText.trim().length > 0) {
            e.preventDefault();
            handleTextCorrection(selectedText, null);
        }
    }
}

// Show custom context menu
function showCustomContextMenu(x, y, selectedText, editor) {
    // Remove any existing custom menu
    const existingMenu = document.getElementById('gemini-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // Create custom context menu
    const menu = document.createElement('div');
    menu.id = 'gemini-context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        padding: 5px 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        min-width: 180px;
    `;
    
    const menuItem = document.createElement('div');
    menuItem.style.cssText = `
        padding: 8px 15px;
        cursor: pointer;
        background: white;
        color: #333;
    `;
    menuItem.textContent = 'Popraw język z Gemini';
    
    menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = '#f0f0f0';
    });
    
    menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'white';
    });
    
    menuItem.addEventListener('click', () => {
        menu.remove();
        handleTextCorrection(selectedText, editor);
    });
    
    menu.appendChild(menuItem);
    document.body.appendChild(menu);
    
    // Remove menu when clicking elsewhere
    const removeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', removeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', removeMenu);
    }, 100);
}

// Handle text correction
function handleTextCorrection(selectedText, editor) {
    console.log('Chrome AI Text Fixer: Requesting correction for text:', selectedText);
    
    // Send message to background script
    chrome.runtime.sendMessage({
        action: 'correctText',
        text: selectedText,
        editorId: editor ? editor.id : null
    });
}

// Show message when no text is selected
function showNoSelectionMessage() {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 10px 15px;
        border-radius: 4px;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
    `;
    notification.textContent = 'Zaznacz tekst, aby go poprawić';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Handle corrected text from background script
function handleCorrectedText(correctedText, editorId) {
    if (editorId && tinymceInstances.has(editorId)) {
        // Replace text in TinyMCE editor
        const editor = tinymceInstances.get(editorId);
        const selection = editor.selection;
        
        // Store current selection
        const bookmark = selection.getBookmark();
        
        // Replace selected text with corrected text
        selection.setContent(correctedText);
        
        // Move cursor to end of inserted text
        selection.moveToBookmark(bookmark);
        selection.collapse(false);
    } else {
        // Show modal for non-TinyMCE contexts
        if (typeof showModal === 'function') {
            showModal(correctedText);
        }
    }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
        sendResponse({ status: "ready" });
        return true;
    }
    
    if (request.action === "showModal") {
        if (typeof showModal === 'function') {
            showModal(request.text);
        }
        return true;
    }
    
    if (request.action === "replaceText") {
        handleCorrectedText(request.text, request.editorId);
        return true;
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Also try to initialize after a short delay to catch dynamically loaded TinyMCE
setTimeout(init, 1000);