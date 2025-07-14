// --- 1. Firebase Initialization ---
// ALWAYS REPLACE WITH YOUR ACTUAL FIREBASE CONFIG FROM THE CONSOLE
// KEEP THIS INFORMATION PRIVATE AND DO NOT SHARE IT WIDELY IN PRODUCTION!
const firebaseConfig = {
  apiKey: "AIzaSyAY7m9jsU6_fIYsdUl_HEHxTCx7ssop0vo",
  authDomain: "finalechoesapp.firebaseapp.com",
  projectId: "finalechoesapp",
  storageBucket: "finalechoesapp.firebasestorage.app",
  messagingSenderId: "111535498051",
  appId: "1:111535498051:web:3ea8094fd86160f32145f6",
  measurementId: "G-5L31R9C56D"
};

// Initialize Firebase App
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Firestore Offline Persistence (for robustness and EU data resilience) ---
// This allows Firestore to cache data and handle writes/reads when offline,
// syncing automatically when connection is re-established. Crucial for robust UX.
db.enablePersistence()
  .then(() => {
    console.log("Firestore persistence enabled successfully.");
    updateConnectionStatus("Cosmic link established. Archives are accessible.", "success");
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one.
      console.warn("Firestore persistence could not be enabled (multiple tabs or browser limitation).");
      updateConnectionStatus("Cosmic link established, but deep memory (offline persistence) is limited (multiple tabs?).", "warning");
    } else if (err.code === 'unimplemented') {
      // The browser does not support all features required for persistence.
      console.error("Firestore persistence not supported in this browser.");
      updateConnectionStatus("Cosmic link established, but deep memory (offline persistence) not supported by your vessel.", "warning");
    } else {
      console.error("Error enabling Firestore persistence:", err);
      updateConnectionStatus(`Cosmic link unstable. Error: ${err.message}`, "error");
    }
  });


// --- 2. DOM Elements ---
// Main Views
const appView = document.getElementById('app-view');
const singleNoteView = document.getElementById('single-note-view');
const backToAllNotesBtn = document.getElementById('back-to-all-notes-btn');

// Header & Status
const connectionStatusElement = document.getElementById('connection-status');

// Auth Section
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const authStatus = document.getElementById('auth-status');
const authForms = document.getElementById('auth-forms');
const authActions = document.querySelector('.auth-actions');
const userEmailDisplay = document.getElementById('user-email-display');

// Note Submission Section
const noteSubmissionSection = document.getElementById('note-submission-section');
const finalWordsInput = document.getElementById('final-words-input');
const charCountSpan = document.getElementById('char-count');
const submitNoteBtn = document.getElementById('submit-note-btn');
const submissionStatus = document.getElementById('submission-status');

// Notes Display Section
const notesList = document.getElementById('notes-list');
const noNotesMessage = document.getElementById('no-notes-message');
const loadMoreBtn = document.getElementById('load-more-btn');
const randomNoteBtn = document.getElementById('random-note-btn');

// Single Note Display
const singleNoteText = document.getElementById('single-note-text');
const singleNoteAuthor = document.getElementById('single-note-author');
const singleNoteStatus = document.getElementById('single-note-status');

// Cookie Consent
const cookieConsentBanner = document.getElementById('cookie-consent-banner');
const acceptCookiesBtn = document.getElementById('accept-cookies-btn');


// --- 3. Global Variables & Constants ---
let lastVisibleNote = null; // For pagination
const NOTES_PER_LOAD = 8; // How many echoes to summon at a time
const COOKIE_CONSENT_KEY = 'finalEchoes_cookie_consent';

// --- 4. Utility Functions ---

/**
 * Updates a status message element with content and styling.
 * @param {HTMLElement} element The DOM element to update (e.g., authStatus, submissionStatus).
 * @param {string} message The text message to display.
 * @param {'success'|'error'|'info'|'warning'|''} type The type of message for styling.
 */
function updateStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message ${type}-message`;
    // Clear message after a few seconds for success/info messages
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status-message'; // Clear class too
        }, 6000); // Increased timeout for reading
    }
}

/**
 * Updates the global connection status message.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'|''} type
 */
function updateConnectionStatus(message, type) {
    updateStatus(connectionStatusElement, message, type);
}

/**
 * Anonymizes an email for public display, adhering to privacy principles.
 * @param {string} email
 * @returns {string} Anonymized email string (e.g., joh***@example.com) or a generic label.
 */
function anonymizeEmail(email) {
    if (!email || !email.includes('@')) {
        return 'a forgotten spirit';
    }
    const [name, domain] = email.split('@');
    const displayDomain = domain.split('.').slice(-2).join('.'); // e.g., example.com from sub.example.com
    if (name.length <= 3) {
        return `${name.substring(0, 1)}**@${displayDomain}`;
    }
    return `${name.substring(0, 3)}***@${displayDomain}`;
}

/**
 * Copies text to clipboard and provides feedback.
 * @param {string} text The text to copy.
 * @param {HTMLElement} feedbackElement The element to display feedback on.
 */
async function copyToClipboard(text, feedbackElement) {
    try {
        await navigator.clipboard.writeText(text);
        updateStatus(feedbackElement, 'Link copied to clipboard! Share the echo.', 'success');
    } catch (err) {
        updateStatus(feedbackElement, 'Failed to copy link. Please copy manually.', 'error');
        console.error('Failed to copy text:', err);
    }
}

// --- 5. Authentication Functions ---

signupBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        updateStatus(authStatus, 'Your essence (email) and arcane key (password) are vital. They cannot be empty.', 'error');
        return;
    }
    if (password.length < 6) {
        updateStatus(authStatus, 'The arcane key (password) must be at least 6 characters long to secure your passage.', 'error');
        return;
    }

    try {
        updateStatus(authStatus, 'Engraving your existence in the cosmic ledger...', 'info');
        await auth.createUserWithEmailAndPassword(email, password);
        updateStatus(authStatus, 'Existence engraved! Welcome to the cosmic archives.', 'success');
        emailInput.value = ''; // Clear inputs on success
        passwordInput.value = '';
    } catch (error) {
        let errorMessage = 'Failed to engrave your existence.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This essence (email) is already bound. Try rejoining the astral plane (login) or use another.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'The essence (email) format appears malformed.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'The arcane key (password) is too frail. Choose a stronger one.';
        }
        updateStatus(authStatus, `${errorMessage} Error: ${error.message}`, 'error');
        console.error("Sign up error:", error);
    }
});

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        updateStatus(authStatus, 'Provide your essence and arcane key to re-enter the astral plane.', 'error');
        return;
    }

    try {
        updateStatus(authStatus, 'Rejoining the astral plane...', 'info');
        await auth.signInWithEmailAndPassword(email, password);
        updateStatus(authStatus, 'Astral plane rejoined! Your echo awaits your command.', 'success');
        emailInput.value = ''; // Clear inputs on success
        passwordInput.value = '';
    } catch (error) {
        let errorMessage = 'Failed to rejoin the astral plane.';
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            errorMessage = 'Incorrect arcane key or unknown essence. Verify your credentials.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'The essence (email) format appears malformed.';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'Your essence has been suspended from the cosmic network.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Cosmic connection faltered during login. Check your network.';
        }
        updateStatus(authStatus, `${errorMessage} Error: ${error.message}`, 'error');
        console.error("Login error:", error);
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        updateStatus(authStatus, 'Fading from the cosmic connection...', 'info');
        await auth.signOut();
        updateStatus(authStatus, 'You have left the echoes behind.', 'success');
    } catch (error) {
        updateStatus(authStatus, `Failed to fade: ${error.message}. Try again.`, 'error');
        console.error("Logout error:", error);
    }
});

// --- Account Deletion Function ---
deleteAccountBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        updateStatus(authStatus, 'No cosmic traveler is currently bound to silence their echo.', 'error');
        return;
    }

    if (!confirm('Are you absolutely certain you wish to silence your own echo and sever your direct connection? Your account will be permanently deleted. Your *public echo (note)* will remain in the archives as an unalterable mark. For full data removal, contact the administrators.')) {
        return; // User cancelled
    }

    updateStatus(authStatus, 'Initiating the silencing ritual...', 'info');
    try {
        // Firebase requires recent re-authentication for sensitive operations.
        // If this fails due to 'auth/requires-recent-login', user needs to re-authenticate.
        await user.delete();
        updateStatus(authStatus, 'Your account has been silenced. Your echo remains in the archives.', 'success');
        // Note: The 'finalWords' document in Firestore associated with this UID will persist,
        // fulfilling the theme's idea of "final words" even if the account is gone.
        // If you intended to delete the note as well, you would add:
        // await db.collection('finalWords').doc(user.uid).delete();
    } catch (error) {
        let errorMessage = 'Failed to silence your echo.';
        if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Your presence must be recent. Please log out, then log back in, and immediately attempt to silence your echo again.';
        } else if (error.code === 'auth/network-request-failed') {
             errorMessage = 'Cosmic connection faltered during the silencing ritual. Check your network.';
        }
        updateStatus(authStatus, `${errorMessage} Error: ${error.message}`, 'error');
        console.error("Account deletion error:", error);
    }
});

// --- 6. User State Management (Core Logic & UI Toggling) ---

auth.onAuthStateChanged(async user => {
    // Reset UI state first
    notesList.innerHTML = ''; // Clear notes list immediately
    lastVisibleNote = null; // Reset pagination
    loadMoreBtn.style.display = 'none'; // Hide load more button initially

    if (user) {
        // User is logged in
        userEmailDisplay.textContent = anonymizeEmail(user.email);
        authForms.style.display = 'none'; // Hide login/signup forms
        authActions.style.display = 'flex'; // Show logout/delete buttons
        noteSubmissionSection.style.display = 'block'; // Show submission section

        updateStatus(authStatus, `Welcome, cosmic traveler: ${anonymizeEmail(user.email)}`, 'success');
        await checkUserSubmissionStatus(user.uid); // Check if they've submitted their echo
    } else {
        // User is logged out
        updateStatus(authStatus, 'To engrave your eternal mark, please sign up or rejoin the astral plane.', 'info');
        authForms.style.display = 'flex'; // Show login/signup forms
        authActions.style.display = 'none'; // Hide logout/delete buttons
        noteSubmissionSection.style.display = 'none'; // Hide submission section if logged out

        // Reset submission section state
        finalWordsInput.disabled = false;
        submitNoteBtn.style.display = 'block';
        finalWordsInput.value = '';
        charCountSpan.textContent = '0';
        updateStatus(submissionStatus, '', ''); // Clear submission status
    }
    // After handling auth state, determine view based on URL
    handleRouting();
});

// --- 7. Final Words Submission ---

finalWordsInput.addEventListener('input', () => {
    const currentLength = finalWordsInput.value.length;
    charCountSpan.textContent = currentLength;
    if (currentLength > 500) {
        charCountSpan.style.color = 'var(--color-error)';
        submitNoteBtn.disabled = true;
        updateStatus(submissionStatus, 'Your echo is too verbose! (Max 500 characters)', 'error');
    } else {
        charCountSpan.style.color = 'var(--color-text-secondary)';
        submitNoteBtn.disabled = false;
        updateStatus(submissionStatus, '', ''); // Clear error if length is good
    }
});

submitNoteBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        updateStatus(submissionStatus, 'You must be bound to the cosmos (logged in) to release your unalterable mark.', 'error');
        return;
    }

    const finalWords = finalWordsInput.value.trim();
    if (finalWords.length === 0) {
        updateStatus(submissionStatus, 'Your echo cannot be empty. What is your message to eternity?', 'error');
        return;
    }
    if (finalWords.length > 500) {
        updateStatus(submissionStatus, 'Your echo is too verbose! (Max 500 characters). Please condense your message.', 'error');
        return;
    }

    submitNoteBtn.disabled = true;
    submitNoteBtn.textContent = 'Releasing Echo...';
    updateStatus(submissionStatus, 'Recording your eternal echo in the cosmic ledger...', 'info');

    try {
        // The Firestore security rule for 'create' ensures this is a one-time operation per user UID.
        await db.collection('finalWords').doc(user.uid).set({
            userId: user.uid,
            emailDisplay: anonymizeEmail(user.email), // Store anonymized email for privacy
            note: finalWords,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        updateStatus(submissionStatus, 'Your final words have been permanently etched into the cosmos!', 'success');
        finalWordsInput.value = ''; // Clear input
        finalWordsInput.disabled = true; // Disable further submission
        submitNoteBtn.style.display = 'none'; // Hide button
        charCountSpan.textContent = '0';
        charCountSpan.style.color = 'var(--color-text-secondary)';
        await checkUserSubmissionStatus(user.uid); // Re-check to update UI state
        loadNotes(true); // Reset and reload all notes to show the new one immediately
    } catch (error) {
        let errorMessage = 'Failed to release your echo.';
        if (error.code === 'permission-denied') {
            errorMessage = 'Your echo already exists in the archives. A cosmic law prevents you from leaving another.';
            finalWordsInput.disabled = true;
            submitNoteBtn.style.display = 'none';
        } else if (error.code === 'unavailable' || error.code === 'aborted' || error.code === 'resource-exhausted' || error.code === 'internal') {
             errorMessage = 'Cosmic interference detected during submission. Try again in a moment.';
        } else if (error.code === 'network-request-failed') {
            errorMessage = 'The cosmic connection is unstable. Check your internet connection.';
        }
        updateStatus(submissionStatus, `${errorMessage} Error: ${error.message}`, 'error');
        console.error("Submission error:", error);
        submitNoteBtn.disabled = false;
        submitNoteBtn.textContent = 'Release My Echo';
    }
});

/**
 * Checks if the current user has already submitted their final words.
 * @param {string} uid User's Firebase UID.
 */
async function checkUserSubmissionStatus(uid) {
    const userNoteRef = db.collection('finalWords').doc(uid);
    try {
        const doc = await userNoteRef.get();
        if (doc.exists) {
            // User has already submitted
            finalWordsInput.value = doc.data().note; // Pre-fill with their existing note
            finalWordsInput.disabled = true;
            submitNoteBtn.style.display = 'none';
            updateStatus(submissionStatus, 'Your echo is already enshrined in the cosmos. It cannot be altered or replaced.', 'info');
        } else {
            // User has not submitted
            finalWordsInput.disabled = false;
            submitNoteBtn.style.display = 'block';
            finalWordsInput.value = ''; // Ensure input is clear for a new echo
            updateStatus(submissionStatus, 'Speak your final, unalterable words below. This act can only be performed once.', 'info');
        }
    } catch (error) {
        let errorMessage = 'Failed to access the cosmic archives for your submission status.';
        if (error.code === 'unavailable' || error.code === 'aborted' || error.code === 'network-request-failed') {
            errorMessage = 'The cosmic connection is weak. Check your internet connection. Your submission status could not be confirmed.';
        }
        console.error("Error checking user submission status:", error);
        updateStatus(submissionStatus, `${errorMessage} Error: ${error.message}`, 'error');
        // If error checking, assume for safety they cannot submit, or allow retry
        finalWordsInput.disabled = true;
        submitNoteBtn.style.display = 'none';
    }
}

// --- 8. Displaying Notes (Enhanced with Pagination & Random) ---

/**
 * Creates a note item element for display in the list.
 * @param {Object} noteData - The data of the note.
 * @param {string} docId - The Firestore document ID for the note (user's UID).
 * @param {boolean} isShareable - Whether to add a share button.
 * @returns {HTMLElement} The created note element.
 */
function createNoteElement(noteData, docId, isShareable = true) {
    const noteElement = document.createElement('div');
    noteElement.className = 'note-item';

    const formattedTimestamp = noteData.timestamp ?
        new Date(noteData.timestamp.seconds * 1000).toLocaleString() :
        'Lost in time'; // Fallback for missing timestamp

    const safeNote = DOMPurify.sanitize(noteData.note || 'No message provided.'); // Sanitize and fallback
    const safeEmailDisplay = DOMPurify.sanitize(noteData.emailDisplay || 'an unknown spirit'); // Sanitize and fallback

    noteElement.innerHTML = `
        <p>${safeNote}</p>
        <div class="note-author">
            — From ${safeEmailDisplay} on ${formattedTimestamp}
        </div>
    `;

    if (isShareable) {
        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-btn';
        shareBtn.textContent = 'Share Echo';
        shareBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent clicking the note item if it had a parent listener
            const shareUrl = `${window.location.origin}/#${docId}`; // Construct shareable URL
            copyToClipboard(shareUrl, noteElement); // Provide feedback on the note element itself
        });
        noteElement.appendChild(shareBtn);
    }
    return noteElement;
}


/**
 * Loads notes from Firestore with pagination.
 * @param {boolean} reset - If true, clears existing notes and resets pagination.
 */
async function loadNotes(reset = false) {
    if (reset) {
        notesList.innerHTML = ''; // Clear existing notes
        lastVisibleNote = null;
        loadMoreBtn.style.display = 'none'; // Hide load more button initially
    }

    noNotesMessage.textContent = 'The cosmic archives are stirring, summoning echoes...';
    noNotesMessage.style.display = 'block'; // Always show loading message initially

    let query = db.collection('finalWords').orderBy('timestamp', 'desc').limit(NOTES_PER_LOAD);
    if (lastVisibleNote) {
        query = query.startAfter(lastVisibleNote);
    }

    try {
        const querySnapshot = await query.get();

        if (querySnapshot.empty && !lastVisibleNote) {
            // No notes at all on first load
            noNotesMessage.textContent = 'The cosmos awaits its first echo. Be the one to break the silence!';
            noNotesMessage.className = 'status-message info-message';
            loadMoreBtn.style.display = 'none';
            return;
        } else if (querySnapshot.empty && lastVisibleNote) {
            // No more notes to load
            noNotesMessage.textContent = 'All known echoes have been revealed.';
            noNotesMessage.className = 'status-message info-message';
            loadMoreBtn.style.display = 'none';
            return;
        }

        noNotesMessage.style.display = 'none'; // Hide loading message once notes are found

        querySnapshot.forEach(doc => {
            const noteElement = createNoteElement(doc.data(), doc.id);
            notesList.appendChild(noteElement);
        });

        // Update the last visible document for the next pagination query
        lastVisibleNote = querySnapshot.docs[querySnapshot.docs.length - 1];

        // If fewer notes than requested were returned, it means we've reached the end
        if (querySnapshot.docs.length < NOTES_PER_LOAD) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }

    } catch (error) {
        let errorMessage = 'Failed to retrieve echoes from the cosmic archives.';
        if (error.code === 'unavailable' || error.code === 'aborted' || error.code === 'network-request-failed') {
            errorMessage = 'The cosmic connection is lost. Check your internet connection. Cannot load echoes.';
        }
        console.error("Error loading notes:", error);
        notesList.innerHTML = `<p class="status-message error-message">${errorMessage} Error: ${error.message}</p>`;
        noNotesMessage.style.display = 'none';
        loadMoreBtn.style.display = 'none';
    }
}

// --- Load More Notes Button ---
loadMoreBtn.addEventListener('click', () => {
    loadNotes(); // Load next batch
});

// --- View Random Note Button (Client-side approximation) ---
randomNoteBtn.addEventListener('click', async () => {
    try {
        updateStatus(submissionStatus, 'Scrying the cosmos for a random whisper...', 'info');

        // Fetch ALL notes for true client-side randomness.
        // WARNING: This can be slow and expensive for very large collections (>1000s of documents).
        // For production with vast numbers of notes, consider server-side solutions or approximate randomness (e.g., random sort key).
        const allNotesSnapshot = await db.collection('finalWords').get();

        if (allNotesSnapshot.empty) {
            updateStatus(submissionStatus, 'The cosmic archives are empty. No whispers yet to glimpse.', 'info');
            return;
        }

        const notes = [];
        allNotesSnapshot.forEach(doc => {
            notes.push({ id: doc.id, data: doc.data() });
        });

        const randomIndex = Math.floor(Math.random() * notes.length);
        const { id: randomNoteId, data: randomNoteData } = notes[randomIndex];

        // Display the random note in the single-note view
        showSingleNote(randomNoteData, randomNoteId);
        updateStatus(singleNoteStatus, 'A random echo has been revealed! It will fade into the full list in 10 seconds.', 'info');

        // After a delay, return to the full app view
        setTimeout(() => {
            window.location.hash = ''; // Clear hash to return to main view
            // handleRouting() will be called by hashchange listener or auth state change
        }, 10000); // Display random note for 10 seconds

    } catch (error) {
        let errorMessage = 'Failed to glimpse a random whisper from the cosmos.';
        if (error.code === 'unavailable' || error.code === 'aborted' || error.code === 'network-request-failed') {
            errorMessage = 'The cosmic connection is lost. Cannot retrieve random echo.';
        }
        console.error("Error fetching random note:", error);
        updateStatus(submissionStatus, `${errorMessage} Error: ${error.message}`, 'error');
    }
});

// --- 9. Single Note View & Routing ---

/**
 * Displays a single note in a dedicated view.
 * @param {Object} noteData - The data of the note.
 * @param {string} docId - The Firestore document ID for the note.
 */
function showSingleNote(noteData, docId) {
    appView.style.display = 'none';
    singleNoteView.style.display = 'block';

    const formattedTimestamp = noteData.timestamp ?
        new Date(noteData.timestamp.seconds * 1000).toLocaleString() :
        'Lost in time';
    const safeNote = DOMPurify.sanitize(noteData.note || 'No message provided.');
    const safeEmailDisplay = DOMPurify.sanitize(noteData.emailDisplay || 'an unknown spirit');

    singleNoteText.innerHTML = safeNote;
    singleNoteAuthor.innerHTML = `— From ${safeEmailDisplay} on ${formattedTimestamp}`;
    updateStatus(singleNoteStatus, '', ''); // Clear previous status

    // Optional: Add a share button specific to the single note view if desired here
    // Or users can just copy the URL from their browser.
}

/**
 * Fetches and displays a single note based on its ID.
 * @param {string} noteId - The ID of the note to fetch.
 */
async function fetchAndShowSingleNote(noteId) {
    updateStatus(singleNoteStatus, 'Summoning the specific echo...', 'info');
    try {
        const docRef = db.collection('finalWords').doc(noteId);
        const doc = await docRef.get();

        if (doc.exists) {
            showSingleNote(doc.data(), doc.id);
            updateStatus(singleNoteStatus, 'Echo retrieved.', 'success');
        } else {
            updateStatus(singleNoteStatus, 'The requested echo could not be found in the archives.', 'error');
            singleNoteText.innerHTML = 'This echo has vanished into the ether...';
            singleNoteAuthor.innerHTML = '';
            // Offer to return to main view
            setTimeout(() => { window.location.hash = ''; }, 3000);
        }
    } catch (error) {
        let errorMessage = 'Failed to retrieve the specific echo from the archives.';
        if (error.code === 'unavailable' || error.code === 'aborted' || error.code === 'network-request-failed') {
            errorMessage = 'Cosmic connection lost. Check your network. Cannot retrieve specific echo.';
        }
        console.error("Error fetching single note:", error);
        updateStatus(singleNoteStatus, `${errorMessage} Error: ${error.message}`, 'error');
        singleNoteText.innerHTML = `Failed to load echo: ${error.message}`;
        singleNoteAuthor.innerHTML = '';
        setTimeout(() => { window.location.hash = ''; }, 5000);
    }
}

/**
 * Handles routing based on the URL hash.
 * If hash exists, tries to display a single note. Otherwise, shows the main app.
 */
function handleRouting() {
    const hash = window.location.hash.substring(1); // Get hash without '#'
    if (hash) {
        fetchAndShowSingleNote(hash);
    } else {
        appView.style.display = 'block';
        singleNoteView.style.display = 'none';
        // Ensure main app's notes are loaded
        loadNotes(true); // Always reset and load when returning to main view
    }
}

// Listen for hash changes in the URL
window.addEventListener('hashchange', handleRouting);
backToAllNotesBtn.addEventListener('click', () => {
    window.location.hash = ''; // Clear hash to trigger main app view
});

// --- 10. Cookie Consent (EU Compliance) ---
function showCookieConsent() {
    if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
        cookieConsentBanner.style.display = 'flex';
    }
}

acceptCookiesBtn.addEventListener('click', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    cookieConsentBanner.style.display = 'none';
});


// --- 11. Network Status Listener ---
// Initial check
if (navigator.onLine) {
    updateConnectionStatus("Establishing cosmic link...", "info"); // Will be updated by persistence callback
} else {
    updateConnectionStatus("Cosmic connection lost. Operating in offline mode.", "warning");
}

window.addEventListener('online', () => {
    updateConnectionStatus("Reconnected to the cosmic network. Resuming cosmic operations.", "success");
    // Persistence handles sync, but refreshing main notes list can be helpful
    if (!window.location.hash) {
        loadNotes(true);
    } else {
        fetchAndShowSingleNote(window.location.hash.substring(1));
    }
});

window.addEventListener('offline', () => {
    updateConnectionStatus("Cosmic connection lost. Operating in offline mode.", "warning");
});

// --- Initial App Load ---
// This will be called on page load or refresh.
// `onAuthStateChanged` will trigger `handleRouting` which then calls `loadNotes`.
// `showCookieConsent` ensures banner appears if needed.
document.addEventListener('DOMContentLoaded', () => {
    showCookieConsent();
    // No direct call to handleRouting or loadNotes here;
    // auth.onAuthStateChanged will handle the initial display and data fetch.
});
