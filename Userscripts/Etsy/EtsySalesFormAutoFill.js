// ==UserScript==
// @name         Etsy Sales Form AutoFill
// @namespace    Violentmonkey Scripts
// @match        https://www.etsy.com/your/shops/me/sales-discounts*
// @grant        GM_setValue
// @grant        GM_getValue
// @version      2025.12.07
// @author       -
// @description  Automates Etsy sales form filling with date management (Observer-based)
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/mr-cfh/Home-Projects/refs/heads/main/Userscripts/Etsy/EtsySalesFormAutoFill.js
// @updateURL    https://raw.githubusercontent.com/mr-cfh/Home-Projects/refs/heads/main/Userscripts/Etsy/EtsySalesFormAutoFill.js
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    const CONFIG = {
        STORAGE_KEY: 'etsy_sales_date',
        DISCOUNT_VALUE: '50',
        FLOAT_BUTTON: {
            size: '50px',
            bottom: '120px',
            right: '270px',
            backgroundColor: '#0C9',
            color: '#FFF'
        },
        OBSERVER_TIMEOUT: 10000 // Maximum time to wait for buttons (10 seconds)
    };

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

    let isProcessing = false; // Prevent multiple simultaneous executions
    let floatButton = null;
    let modalObserver = null;
    let buttonObserver = null;
    let currentStep = null; // Track current workflow step

    // ============================================================================
    // DATE UTILITIES
    // ============================================================================

    /**
     * Adds a specified number of days to a date
     * @param {Date} date - The original date
     * @param {number} days - Number of days to add
     * @returns {Date} - New date with days added
     */
    function addDays(date, days) {
        const result = new Date(date.valueOf());
        result.setDate(result.getDate() + days);
        return result;
    }

    /**
     * Converts YYYYMMDD string to Date object
     * @param {string} dateString - Date in YYYYMMDD format
     * @returns {Date} - Parsed date object
     */
    function parseYYYYMMDD(dateString) {
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(dateString.substring(6, 8));
        return new Date(year, month, day);
    }

    /**
     * Formats date as YYYYMMDD string
     * @param {Date} date - Date object to format
     * @returns {string} - Date in YYYYMMDD format
     */
    function formatAsYYYYMMDD(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    /**
     * Formats date as MM/DD/YYYY string (for form input)
     * @param {Date} date - Date object to format
     * @returns {string} - Date in MM/DD/YYYY format
     */
    function formatAsMMDDYYYY(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}/${day}/${year}`;
    }

    // ============================================================================
    // STORAGE MANAGEMENT
    // ============================================================================

    /**
     * Gets the sales date from URL parameter or GM storage
     * @returns {string} - Sales date in YYYYMMDD format
     */
    function getSalesDate() {
        // Check URL parameter first
        const urlParams = new URLSearchParams(window.location.search);
        const urlDate = urlParams.get('salesDate');

        if (urlDate && /^\d{8}$/.test(urlDate)) {
            console.log('[Etsy Sales] Using date from URL:', urlDate);
            return urlDate;
        }

        // Fallback to GM storage
        const storedDate = GM_getValue(CONFIG.STORAGE_KEY, null);
        if (storedDate) {
            console.log('[Etsy Sales] Using date from storage:', storedDate);
            return storedDate;
        }

        // Default to today if no date found
        const today = formatAsYYYYMMDD(new Date());
        console.log('[Etsy Sales] No date found, using today:', today);
        return today;
    }

    /**
     * Saves the next sales date (current date + 1 day) to GM storage
     * @param {string} currentDateYYYYMMDD - Current sales date in YYYYMMDD format
     */
    function saveNextSalesDate(currentDateYYYYMMDD) {
        const currentDate = parseYYYYMMDD(currentDateYYYYMMDD);
        const nextDate = addDays(currentDate, 1);
        const nextDateString = formatAsYYYYMMDD(nextDate);

        GM_setValue(CONFIG.STORAGE_KEY, nextDateString);
        console.log('[Etsy Sales] Saved next sales date:', nextDateString);
    }

    // ============================================================================
    // FORM INTERACTION
    // ============================================================================

    /**
     * Triggers various events on an element to simulate user interaction
     * @param {HTMLElement} element - The element to trigger events on
     * @param {string} eventType - Type of event (e.g., 'input', 'change', 'click')
     */
    function triggerEvent(element, eventType) {
        const event = new Event(eventType, {
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
    }

    /**
     * Sets value on an input field and triggers appropriate events
     * @param {HTMLElement} field - The input field
     * @param {string} value - Value to set
     * @param {boolean} needsFocus - Whether to trigger focus events
     */
    function setFieldValue(field, value, needsFocus = false) {
        if (!field) {
            console.error('[Etsy Sales] Field not found');
            return;
        }

        if (needsFocus) {
            triggerEvent(field, 'focusin');
        }

        field.value = value;
        triggerEvent(field, 'input');
        triggerEvent(field, 'change');

        if (needsFocus) {
            triggerEvent(field, 'focusout');
        }
    }

    /**
     * Fills the sales form with the specified date
     * @param {string} salesDateYYYYMMDD - Sales date in YYYYMMDD format
     */
    function fillSalesForm(salesDateYYYYMMDD) {
        console.log('[Etsy Sales] Filling form with date:', salesDateYYYYMMDD);

        const salesDate = parseYYYYMMDD(salesDateYYYYMMDD);
        const dateFormatted = formatAsMMDDYYYY(salesDate);

        try {
            // Set discount percentage
            const fieldDiscount = document.getElementById("reward-percentage");
            if (fieldDiscount) {
                setFieldValue(fieldDiscount, CONFIG.DISCOUNT_VALUE);
                console.log('[Etsy Sales] Set discount to:', CONFIG.DISCOUNT_VALUE);
            }

            // Set start date
            const fieldSaleStartDate = document.getElementsByClassName("input")[0];
            if (fieldSaleStartDate) {
                setFieldValue(fieldSaleStartDate, dateFormatted, true);
                console.log('[Etsy Sales] Set start date to:', dateFormatted);
            }

            // Set end date
            const fieldSaleEndDate = document.getElementsByClassName("input")[1];
            if (fieldSaleEndDate) {
                setFieldValue(fieldSaleEndDate, dateFormatted, true);
                console.log('[Etsy Sales] Set end date to:', dateFormatted);
            }

            // Set sale name
            const fieldSaleName = document.getElementsByClassName("input")[2];
            if (fieldSaleName) {
                setFieldValue(fieldSaleName, salesDateYYYYMMDD);
                console.log('[Etsy Sales] Set sale name to:', salesDateYYYYMMDD);
            }

            // Dismiss date picker by focusing on another element
            const additionalDetails = document.getElementById("additional-details");
            if (additionalDetails) {
                additionalDetails.focus();
            }

            console.log('[Etsy Sales] Form filled successfully');
            return true;
        } catch (error) {
            console.error('[Etsy Sales] Error filling form:', error);
            return false;
        }
    }

    /**
     * Finds a button by its text content
     * @param {string} buttonText - Text content of the button to find
     * @returns {HTMLElement|null} - The button element or null if not found
     */
    function findButtonByText(buttonText) {
        const buttons = Array.from(document.getElementsByTagName('button'));
        return buttons.find(btn => btn.textContent.trim() === buttonText) || null;
    }

    /**
     * Clicks a button element
     * @param {HTMLElement} button - The button to click
     * @param {string} buttonName - Name of button for logging
     */
    function clickButton(button, buttonName) {
        console.log(`[Etsy Sales] Clicking "${buttonName}" button`);
        triggerEvent(button, 'click');
        button.click(); // Use both methods for reliability
    }

    // ============================================================================
    // BUTTON OBSERVER SYSTEM
    // ============================================================================

    /**
     * Waits for a button to appear in the DOM and clicks it when found
     * @param {string} buttonText - Text content of the button to wait for
     * @param {Function} onSuccess - Callback function to execute after clicking
     * @param {number} timeout - Maximum time to wait in milliseconds
     * @returns {Promise} - Resolves when button is clicked, rejects on timeout
     */
    function waitForButtonAndClick(buttonText, onSuccess, timeout = CONFIG.OBSERVER_TIMEOUT) {
        return new Promise((resolve, reject) => {
            // First, check if button already exists
            const existingButton = findButtonByText(buttonText);
            if (existingButton) {
                console.log(`[Etsy Sales] "${buttonText}" button already present`);
                clickButton(existingButton, buttonText);
                if (onSuccess) onSuccess();
                resolve();
                return;
            }

            console.log(`[Etsy Sales] Waiting for "${buttonText}" button...`);

            let timeoutId;
            let observer;

            // Setup timeout
            timeoutId = setTimeout(() => {
                if (observer) observer.disconnect();
                console.error(`[Etsy Sales] Timeout waiting for "${buttonText}" button`);
                reject(new Error(`Timeout waiting for "${buttonText}" button`));
            }, timeout);

            // Setup observer to watch for button appearance
            observer = new MutationObserver((mutations) => {
                const button = findButtonByText(buttonText);

                if (button) {
                    console.log(`[Etsy Sales] "${buttonText}" button detected!`);

                    // Clean up
                    clearTimeout(timeoutId);
                    observer.disconnect();

                    // Click the button
                    clickButton(button, buttonText);

                    // Execute success callback
                    if (onSuccess) onSuccess();

                    resolve();
                }
            });

            // Observe the entire document for changes
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Store reference for cleanup
            buttonObserver = observer;
        });
    }

    // ============================================================================
    // MAIN WORKFLOW
    // ============================================================================

    /**
     * Main function to execute the sales form automation workflow
     * Uses observers to wait for buttons instead of timeouts
     */
    async function executeSalesWorkflow() {
        if (isProcessing) {
            console.log('[Etsy Sales] Already processing, skipping...');
            return;
        }

        isProcessing = true;
        currentStep = 'filling_form';
        console.log('[Etsy Sales] Starting sales workflow...');

        try {
            const salesDate = getSalesDate();

            // Step 1: Fill the form
            console.log('[Etsy Sales] Step 1: Filling form');
            const formFilled = fillSalesForm(salesDate);
            if (!formFilled) {
                throw new Error('Failed to fill form');
            }

            // Step 2: Wait for and click "Continue" button
            console.log('[Etsy Sales] Step 2: Waiting for Continue button');
            currentStep = 'waiting_continue';
            await waitForButtonAndClick('Continue', () => {
                console.log('[Etsy Sales] Continue button clicked, waiting for confirmation screen');
                currentStep = 'waiting_confirm';
            });

            // Step 3: Wait for and click "Review and confirm" button
            console.log('[Etsy Sales] Step 3: Waiting for Review and confirm button');
            currentStep = 'waiting_review';
            await waitForButtonAndClick('Review and confirm', () => {
                console.log('[Etsy Sales] Review and confirm button clicked, waiting for final confirmation');
                currentStep = 'waiting_final_confirm';
            });

            // Step 4: Wait for and click "Confirm and create sale" button
            console.log('[Etsy Sales] Step 4: Waiting for Confirm and create sale button');
            await waitForButtonAndClick('Confirm and create sale', () => {
                console.log('[Etsy Sales] Confirm and create sale button clicked');
                currentStep = 'saving_date';

                // Step 5: Save next date to storage
                saveNextSalesDate(salesDate);
                console.log('[Etsy Sales] Workflow completed successfully!');
                currentStep = 'completed';
            });

        } catch (error) {
            console.error('[Etsy Sales] Workflow error:', error);
            console.error('[Etsy Sales] Failed at step:', currentStep);
        } finally {
            // Clean up
            if (buttonObserver) {
                buttonObserver.disconnect();
                buttonObserver = null;
            }
            isProcessing = false;
            currentStep = null;
        }
    }

    // ============================================================================
    // UI COMPONENTS
    // ============================================================================

    /**
     * Creates and adds the floating action button to the page
     */
    function createFloatingButton() {
        floatButton = document.createElement('button');
        floatButton.id = 'etsy-sales-float-button';
        floatButton.innerHTML = '▶';
        floatButton.title = 'Fill Sales Form (Alt+A)';

        // Apply styles
        Object.assign(floatButton.style, {
            position: 'fixed',
            width: CONFIG.FLOAT_BUTTON.size,
            height: CONFIG.FLOAT_BUTTON.size,
            bottom: CONFIG.FLOAT_BUTTON.bottom,
            right: CONFIG.FLOAT_BUTTON.right,
            backgroundColor: CONFIG.FLOAT_BUTTON.backgroundColor,
            color: CONFIG.FLOAT_BUTTON.color,
            border: 'none',
            borderRadius: '50%',
            textAlign: 'center',
            boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            zIndex: '9999',
            fontSize: '20px',
            display: 'none',
            transition: 'all 0.3s ease'
        });

        // Hover effect
        floatButton.addEventListener('mouseenter', () => {
            floatButton.style.transform = 'scale(1.1)';
            floatButton.style.boxShadow = '2px 2px 12px rgba(0,0,0,0.5)';
        });

        floatButton.addEventListener('mouseleave', () => {
            floatButton.style.transform = 'scale(1)';
            floatButton.style.boxShadow = '2px 2px 8px rgba(0,0,0,0.3)';
        });

        // Click handler
        floatButton.addEventListener('click', executeSalesWorkflow);

        document.body.appendChild(floatButton);
        console.log('[Etsy Sales] Floating button created');
    }

    /**
     * Shows or hides the floating button based on modal presence
     */
    function updateFloatingButtonVisibility() {
        if (!floatButton) return;

        const modalContainer = document.getElementById('wt-modal-container');
        const isSalesModalOpen = modalContainer && modalContainer.childElementCount === 4;

        floatButton.style.display = isSalesModalOpen ? 'block' : 'none';
    }

    // ============================================================================
    // OBSERVERS
    // ============================================================================

    /**
     * Sets up MutationObserver to watch for sales modal opening/closing
     */
    function setupModalObserver() {
        const modalContainer = document.getElementById('wt-modal-container');

        if (!modalContainer) {
            console.warn('[Etsy Sales] Modal container not found, retrying in 1s...');
            setTimeout(setupModalObserver, 1000);
            return;
        }

        modalObserver = new MutationObserver((mutations) => {
            updateFloatingButtonVisibility();
        });

        modalObserver.observe(modalContainer, {
            attributes: true,
            childList: true,
            subtree: true
        });

        console.log('[Etsy Sales] Modal observer initialized');
    }

    // ============================================================================
    // KEYBOARD SHORTCUTS
    // ============================================================================

    /**
     * Sets up global keyboard shortcut (Alt+A)
     */
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Check for Alt+A
            if (event.altKey && event.key.toLowerCase() === 'a') {
                event.preventDefault();
                console.log('[Etsy Sales] Alt+A pressed');

                // Only execute if modal is open
                const modalContainer = document.getElementById('wt-modal-container');
                if (modalContainer && modalContainer.childElementCount === 4) {
                    executeSalesWorkflow();
                } else {
                    console.log('[Etsy Sales] Sales modal not open, ignoring shortcut');
                }
            }
        });

        console.log('[Etsy Sales] Keyboard shortcuts initialized (Alt+A)');
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * Main initialization function
     */
    function initialize() {
        console.log('[Etsy Sales] Initializing script...');

        // Create UI components
        createFloatingButton();

        // Setup observers and listeners
        setupModalObserver();
        setupKeyboardShortcuts();

        console.log('[Etsy Sales] Script initialized successfully!');
        console.log('[Etsy Sales] Current stored date:', GM_getValue(CONFIG.STORAGE_KEY, 'none'));
    }

    // Start the script when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();