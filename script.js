// --- 1. Firebase Initialization ---
// IMPORTANT: REPLACE WITH YOUR ACTUAL FIREBASE CONFIG FROM THE CONSOLE
// KEEP THIS INFORMATION PRIVATE AND DO NOT SHARE IT WIDELY IN PRODUCTION!
const firebaseConfig = {
  apiKey: "AIzaSyAY7m8jsU6_fIYsdUl_HEHxTCx7ssop0vo", // Your actual key
  authDomain: "finalechoesapp.firebaseapp.com",      // Your actual domain
  projectId: "finalechoesapp",                      // Your actual project ID
  storageBucket: "finalechoesapp.firebasestorage.app",
  messagingSenderId: "111535498051",
  appId: "1:111535498051:web:3ea8094fd86160f32145f6",
  measurementId: "G-5L31R9C56D" // Only if you enabled Analytics
};

// Initialize Firebase App
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Firestore Persistence (FIXED: Using FirestoreSettings.cache) ---
db.settings({
    cache: {
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    }
});

db.enablePersistence()
  .then(() => {
    console.log("Firestore persistence enabled successfully using FirestoreSettings.cache.");
    updateConnectionStatus("Cosmic link established. Archives are accessible.", "success");
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore persistence could not be enabled (multiple tabs or browser limitation).");
      updateConnectionStatus("Cosmic link established, but deep memory (offline persistence) is limited (multiple tabs?).", "warning");
    } else if (err.code === 'unimplemented') {
      console.error("Firestore persistence not supported in this browser.");
      updateConnectionStatus("Cosmic link established, but deep memory (offline persistence) not supported by your vessel.", "warning");
    } else {
      console.error("Error enabling Firestore persistence:", err);
      updateConnectionStatus(`Cosmic link unstable. Error: ${err.message}`, "error");
    }
  });


// --- 2. DOM Elements ---
// Main Container
const appContainer = document.getElementById('app-container');

// Navigation Buttons
const navProfileBtn = document.getElementById('nav-profile');
const navMyEchoBtn = document.getElementById('nav-my-echo');
const navAllEchoesBtn = document.getElementById('nav-all-echoes');
const navButtons = [navProfileBtn, navMyEchoBtn, navAllEchoesBtn];

// Content Sections (corresponding to navigation)
const profileSection = document.getElementById('profile-section');
const noteSubmissionSection = document.getElementById('note-submission-section'); // Renamed for consistency with nav
const notesDisplaySection = document.getElementById('notes-display-section');
const singleNoteView = document.getElementById('single-note-view'); // Still exists for individual note display
const contentSections = [profileSection, noteSubmissionSection, notesDisplaySection, singleNoteView];

// Header & Status
const connectionStatusElement = document.getElementById('connection-status');

// Age Verification Modal
const ageVerificationModal = document.getElementById('age-verification-modal');
const ageConfirmBtn = document.getElementById('age-confirm-btn');

// Auth Section
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup-btn');
const loginBtn = document.getElementById('login-btn');
const resetPasswordBtn = document.getElementById('reset-password-btn');
const logoutBtn = document.getElementById('logout-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const exportDataBtn = document.getElementById('export-data-btn');
const authStatus = document.getElementById('auth-status');
const authForms = document.getElementById('auth-forms');
const authActions = document.querySelector('.auth-actions');
const userEmailDisplay = document.getElementById('user-email-display');

// Note Submission Section (My Echo)
const finalWordsInput = document.getElementById('final-words-input');
const charCountSpan = document.getElementById('char-count');
const moodSelect = document.getElementById('mood-select');
const originSelect = document.getElementById('origin-select');
const permanentEchoConsent = document.getElementById('permanent-echo-consent');
const submitNoteBtn = document.getElementById('submit-note-btn');
const submissionStatus = document.getElementById('submission-status');

// Notes Display Section (Cosmic Echoes)
const notesList = document.getElementById('notes-list');
const noNotesMessage = document.getElementById('no-notes-message');
const loadMoreBtn = document.getElementById('load-more-btn');
const randomNoteBtn = document.getElementById('random-note-btn');
const randomJourneyBtn = document.getElementById('random-journey-btn');

// Single Note Display (within Cosmic Echoes)
const singleNoteText = document.getElementById('single-note-text');
const singleNoteDetails = document.getElementById('single-note-details');
const singleNoteAuthor = document.getElementById('single-note-author');
const singleNoteStatus = document.getElementById('single-note-status');
const backToAllNotesBtn = document.getElementById('back-to-all-notes-btn');

// Cookie Consent
const cookieConsentBanner = document.getElementById('cookie-consent-banner');
const acceptCookiesBtn = document.getElementById('accept-cookies-btn');

// --- 3. Global Variables & Constants ---
let lastVisibleNote = null; // For pagination
const NOTES_PER_LOAD = 8; // How many echoes to summon at a time
const COOKIE_CONSENT_KEY = 'finalEchoes_cookie_consent';
const AGE_VERIFICATION_KEY = 'finalEchoes_age_verified';
let randomJourneyInterval = null; // For the continuous random note display
let currentUserNoteSnapshot = null; // Store the current user's note snapshot

// --- 4. Utility Functions ---

/**
 * Updates a status message element with content and styling, and ensures accessibility.
 * @param {HTMLElement} element The DOM element to update (e.g., authStatus, submissionStatus).
 * @param {string} message The text message to display.
 * @param {'success'|'error'|'info'|'warning'|''} type The type of message for styling.
 */
function updateStatus(element, message, type) {
    element.textContent = message;
    // Clear previous classes and add the new one
    element.className = `status-message text-sm p-3 rounded-md mb-6 ${type}-message`;
    element.setAttribute('role', type === 'error' ? 'alert' : 'status'); // Accessibility
    // Clear message after a few seconds for success/info messages
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.textContent = '';
            element.className = 'status-message text-sm p-3 rounded-md mb-6'; // Clear class too
            element.removeAttribute('role');
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
    // Remove margin bottom for connection status if it's not currently showing a message
    if (message === '') {
        connectionStatusElement.classList.remove('mb-6');
    } else {
        connectionStatusElement.classList.add('mb-6');
    }
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

/**
 * Sanitizes and formats optional note details.
 * @param {string} mood
 * @param {string} origin
 * @returns {string} Formatted HTML string or empty if no details.
 */
function formatNoteDetails(mood, origin) {
    let details = [];
    if (mood) details.push(`Mood: ${DOMPurify.sanitize(mood)}`);
    if (origin) details.push(`Origin: ${DOMPurify.sanitize(origin)}`);
    return details.length > 0 ? `<p>${details.join(' | ')}</p>` : '';
}

/**
 * Shows a specific content section and hides others.
 * @param {HTMLElement} sectionToShow
 * @param {HTMLElement} activeNavBtn
 */
function showSection(sectionToShow, activeNavBtn = null) {
    contentSections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('fade-in'); // Remove animation class before hiding
    });
    navButtons.forEach(btn => btn.classList.remove('active', 'bg-teal-600', 'text-white')); // Remove active state from all nav buttons
    navButtons.forEach(btn => btn.classList.add('bg-gray-700', 'text-teal-300')); // Reset to default inactive styles

    sectionToShow.style.display = 'block';
    sectionToShow.classList.add('fade-in'); // Add fade-in animation

    if (activeNavBtn) {
        activeNavBtn.classList.add('active', 'bg-teal-600', 'text-white'); // Add active state to the clicked button
        activeNavBtn.classList.remove('bg-gray-700', 'text-teal-300'); // Remove default inactive styles
    }

    // Special handling for single note view within notes-display-section
    if (sectionToShow === singleNoteView) {
        notesDisplaySection.style.display = 'block'; // Keep parent visible
        notesDisplaySection.classList.remove('fade-in'); // Don't animate parent twice
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
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        // REMOVED: await userCredential.user.sendEmailVerification(); // No longer sending verification email
        updateStatus(authStatus, 'Existence engraved! You are now bound to the cosmos.', 'success');
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
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'Email/Password sign-up is currently disabled. Contact administrators.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Cosmic connection faltered during signup. Check your network.';
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
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many attempts. Your vessel is temporarily blocked. Try again later.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Cosmic connection faltered during login. Check your network.';
        }
        updateStatus(authStatus, `${errorMessage} Error: ${error.message}`, 'error');
        console.error("Login error:", error);
    }
});

resetPasswordBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) {
        updateStatus(authStatus, 'Enter your email to receive a new arcane key.', 'warning');
        return;
    }

    try {
        updateStatus(authStatus, 'Dispatching new arcane key...', 'info');
        await auth.sendPasswordResetEmail(email);
        updateStatus(authStatus, `A cosmic link to reset your arcane key has been sent to ${email}. Check your inbox.`, 'success');
    } catch (error) {
        let errorMessage = 'Failed to dispatch new arcane key.';
        if (error.code === 'auth/invalid-email') {
            errorMessage = 'The email format is invalid.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'No cosmic vessel found with that email.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Cosmic connection faltered. Check your network.';
        }
        updateStatus(authStatus, `${errorMessage} Error: ${error.message}`, 'error');
        console.error("Reset password error:", error);
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        updateStatus(authStatus, 'Fading from the cosmic connection...', 'info');
        await auth.signOut();
        updateStatus(authStatus, 'You have left the echoes behind.', 'success');
        // After logout, show profile section by default
        showSection(profileSection, navProfileBtn);
    } catch (error) {
        updateStatus(authStatus, `Failed to fade: ${error.message}. Try again.`, 'error');
        console.error("Logout error:", error);
    }
});

// --- Account Deletion & Data Export ---
deleteAccountBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        updateStatus(authStatus, 'No cosmic traveler is currently bound to silence their echo.', 'error');
        return;
    }

    if (!confirm('Are you absolutely certain you wish to silence your own echo and sever your direct connection? Your account will be permanently deleted from our authentication system. However, your *public echo (note)* will remain enshrined in the archives as an unalterable testament. For complete data removal of your echo from the public archives, please contact the cosmic administrators.')) {
        return; // User cancelled
    }

    updateStatus(authStatus, 'Initiating the silencing ritual...', 'info');
    try {
        await user.delete();
        updateStatus(authStatus, 'Your account has been silenced. Your echo remains in the archives.', 'success');
        // After deletion, show profile section by default
        showSection(profileSection, navProfileBtn);
    } catch (error) {
        let errorMessage = 'Failed to silence your echo.';
        if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Your presence must be recent. Please log out, then log back in, and immediately attempt to silence your echo again.';
        } else if (error.code === 'auth/network-request-failed') {
             errorMessage = 'Cosmic connection faltered during the silencing ritual. Check your network.';
        } else if (error.code === 'auth/missing-android-pkg-name' || error.code === 'auth/missing-continue-uri' || error.code === 'auth/unauthorized-domain') {
            errorMessage = 'Account deletion service not properly configured. Contact administrators.';
        }
        updateStatus(authStatus, `${errorMessage} Error: ${error.message}`, 'error');
        console.error("Account deletion error:", error);
    }
});

exportDataBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        updateStatus(authStatus, 'No cosmic traveler is logged in to export data.', 'error');
        return;
    }

    updateStatus(authStatus, 'Gathering your cosmic data...', 'info');
    try {
        const userNoteRef = db.collection('finalWords').doc(user.uid);
        const docSnapshot = await userNoteRef.get();

        const dataToExport = {
            userId: user.uid,
            email: user.email,
            authCreationTime: user.metadata.creationTime,
            authLastSignInTime: user.metadata.lastSignInTime,
            submittedNote: null
        };

        if (docSnapshot.exists) {
            dataToExport.submittedNote = docSnapshot.data();
            delete dataToExport.submittedNote.userId; // Remove redundant userId
        }

        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `final_echoes_data_${user.uid.substring(0, 8)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        updateStatus(authStatus, 'Your cosmic data has been downloaded.', 'success');
    } catch (error) {
        let errorMessage = 'Failed to download your cosmic data.';
        if (error.code === 'unavailable' || error.code === 'aborted' || error.code === 'network-request-failed') {
            errorMessage = 'Cosmic connection lost. Cannot export data.';
        }
        updateStatus(authStatus, `${errorMessage} Error: ${error.message}`, 'error');
        console.error("Data export error:", error);
    }
});

// --- 6. User State Management (Core Logic & UI Toggling) ---

auth.onAuthStateChanged(async user => {
    // Stop any ongoing random journey before re-rendering
    if (randomJourneyInterval) {
        clearInterval(randomJourneyInterval);
        randomJourneyInterval = null;
        randomJourneyBtn.textContent = 'Begin a Random Echo Journey'; // Reset button text
    }

    // Reset UI state first when auth state changes
    notesList.innerHTML = ''; // Clear notes list immediately
    lastVisibleNote = null; // Reset pagination
    loadMoreBtn.style.display = 'none'; // Hide load more button initially

    if (user) {
        // User is logged in
        userEmailDisplay.textContent = anonymizeEmail(user.email);
        authForms.style.display = 'none'; // Hide login/signup forms
        authActions.style.display = 'flex'; // Show logout/delete/export buttons

        updateStatus(authStatus, `Welcome, cosmic traveler: ${anonymizeEmail(user.email)}`, 'success');

        await checkUserSubmissionStatus(user.uid); // Always check submission status if logged in
    } else {
        // User is logged out
        updateStatus(authStatus, 'To engrave your eternal mark, please sign up or rejoin the astral plane.', 'info');
        authForms.style.display = 'flex'; // Show login/signup forms
        authActions.style.display = 'none'; // Hide logout/delete/export buttons

        // Reset submission section state
        finalWordsInput.disabled = false;
        submitNoteBtn.style.display = 'block'; // Ensure button is visible for new user
        permanentEchoConsent.disabled = false;
        permanentEchoConsent.checked = false; // Uncheck consent
        moodSelect.disabled = false;
        originSelect.disabled = false;
        finalWordsInput.value = '';
        charCountSpan.textContent = '0';
        moodSelect.value = ''; // Reset dropdowns
        originSelect.value = '';
        updateStatus(submissionStatus, '', ''); // Clear submission status
    }
    // After handling auth state, determine initial view
    handleInitialView();
});

// --- 7. Final Words Submission ---

finalWordsInput.addEventListener('input', () => {
    const currentLength = finalWordsInput.value.length;
    charCountSpan.textContent = currentLength;
    if (currentLength > 500) {
        charCountSpan.classList.add('text-red-500'); // Tailwind error color
        submitNoteBtn.disabled = true;
        updateStatus(submissionStatus, 'Your echo is too verbose! (Max 500 characters)', 'error');
    } else {
        charCountSpan.classList.remove('text-red-500'); // Remove error color
        charCountSpan.classList.add('text-gray-400'); // Tailwind default color
        submitNoteBtn.disabled = !permanentEchoConsent.checked || currentLength === 0; // Disable if consent not checked or empty
        updateStatus(submissionStatus, '', ''); // Clear error if length is good
    }
});

permanentEchoConsent.addEventListener('change', () => {
    const currentLength = finalWordsInput.value.length;
    submitNoteBtn.disabled = !permanentEchoConsent.checked || currentLength === 0 || currentLength > 500;
});


submitNoteBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        updateStatus(submissionStatus, 'You must be bound to the cosmos (logged in) to release your unalterable mark.', 'error');
        return;
    }
    // REMOVED: Email verification check

    const finalWords = finalWordsInput.value.trim();
    if (finalWords.length === 0) {
        updateStatus(submissionStatus, 'Your echo cannot be empty. What is your message to eternity?', 'error');
        return;
    }
    if (finalWords.length > 500) {
        updateStatus(submissionStatus, 'Your echo is too verbose! (Max 500 characters). Please condense your message.', 'error');
        return;
    }
    if (!permanentEchoConsent.checked) {
        updateStatus(submissionStatus, 'You must consent to the unalterable nature of your echo before releasing it.', 'error');
        return;
    }

    const selectedMood = moodSelect.value || null; // Store null if not selected
    const selectedOrigin = originSelect.value || null; // Store null if not selected

    submitNoteBtn.disabled = true;
    submitNoteBtn.textContent = 'Releasing Echo...';
    updateStatus(submissionStatus, 'Recording your eternal echo in the cosmic ledger...', 'info');

    try {
        // The Firestore security rule for 'create' ensures this is a one-time operation per user UID.
        await db.collection('finalWords').doc(user.uid).set({
            userId: user.uid,
            emailDisplay: anonymizeEmail(user.email), // Store anonymized email for privacy
            note: finalWords,
            mood: selectedMood, // New field
            origin: selectedOrigin, // New field
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        updateStatus(submissionStatus, 'Your final words have been permanently etched into the cosmos!', 'success');
        finalWordsInput.value = ''; // Clear input
        finalWordsInput.disabled = true; // Disable further submission
        submitNoteBtn.style.display = 'none'; // Hide button
        charCountSpan.textContent = '0';
        charCountSpan.classList.remove('text-red-500');
        charCountSpan.classList.add('text-gray-400');
        permanentEchoConsent.checked = false; // Reset consent checkbox
        permanentEchoConsent.disabled = true;
        moodSelect.value = ''; // Reset dropdowns
        originSelect.value = '';
        moodSelect.disabled = true;
        originSelect.disabled = true;

        await checkUserSubmissionStatus(user.uid); // Re-check to update UI state for "My Echo"
        loadNotes(true); // Reset and reload all notes to show the new one immediately
    } catch (error) {
        let errorMessage = 'Failed to release your echo.';
        if (error.code === 'permission-denied') {
            errorMessage = 'Your echo already exists in the archives. A cosmic law prevents you from leaving another.';
            finalWordsInput.disabled = true;
            submitNoteBtn.style.display = 'none';
            permanentEchoConsent.disabled = true;
            moodSelect.disabled = true;
            originSelect.disabled = true;
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
 * Updates the 'My Echo' section accordingly.
 * @param {string} uid User's Firebase UID.
 */
async function checkUserSubmissionStatus(uid) {
    const userNoteRef = db.collection('finalWords').doc(uid);
    try {
        const doc = await userNoteRef.get();
        currentUserNoteSnapshot = doc; // Store snapshot for direct access
        if (doc.exists) {
            // User has already submitted
            finalWordsInput.value = doc.data().note; // Pre-fill with their existing note
            finalWordsInput.disabled = true;
            submitNoteBtn.style.display = 'none'; // Hide button
            permanentEchoConsent.disabled = true; // Disable checkbox
            permanentEchoConsent.checked = true; // Mark as checked since note exists
            moodSelect.value = doc.data().mood || ''; // Pre-fill mood/origin
            originSelect.value = doc.data().origin || '';
            moodSelect.disabled = true;
            originSelect.disabled = true;
            updateStatus(submissionStatus, 'Your echo is already enshrined in the cosmos. It cannot be altered or replaced.', 'info');
        } else {
            // User has not submitted
            finalWordsInput.disabled = false;
            submitNoteBtn.style.display = 'block';
            permanentEchoConsent.disabled = false;
            permanentEchoConsent.checked = false; // Ensure unchecked for new submission
            moodSelect.disabled = false;
            originSelect.disabled = false;
            finalWordsInput.value = ''; // Ensure input is clear for a new echo
            moodSelect.value = ''; // Reset dropdowns
            originSelect.value = '';
            charCountSpan.textContent = '0';
            permanentEchoConsent.checked = false; // Make sure consent is not checked by default
            submitNoteBtn.disabled = true; // Disable by default until consent and text are valid
            updateStatus(submissionStatus, 'Speak your final, unalterable words below. This act can only be performed once. Remember to confirm its permanence.', 'info');
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
        permanentEchoConsent.disabled = true;
        moodSelect.disabled = true;
        originSelect.disabled = true;
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
    noteElement.className = 'note-item bg-gray-700 border border-gray-600 rounded-lg p-6 shadow-md transition-all duration-300 hover:bg-gray-600 cursor-pointer flex flex-col justify-between';
    noteElement.setAttribute('tabindex', '0'); // Make div focusable for keyboard navigation
    noteElement.setAttribute('role', 'listitem'); // Accessibility

    const formattedTimestamp = noteData.timestamp ?
        new Date(noteData.timestamp.seconds * 1000).toLocaleString() :
        'Lost in time'; // Fallback for missing timestamp

    const safeNote = DOMPurify.sanitize(noteData.note || 'No message provided.'); // Sanitize and fallback
    const safeEmailDisplay = DOMPurify.sanitize(noteData.emailDisplay || 'an unknown spirit'); // Sanitize and fallback
    const noteDetailsHtml = formatNoteDetails(noteData.mood, noteData.origin); // New: format details

    noteElement.innerHTML = `
        <p class="text-lg text-gray-200 mb-4 leading-relaxed">${safeNote}</p>
        <div class="note-details text-sm text-gray-400 italic mb-2">${noteDetailsHtml}</div>
        <div class="note-author text-xs text-gray-500 text-right mt-auto">
            — From ${safeEmailDisplay} on ${formattedTimestamp}
        </div>
    `;

    // Click listener to view single note
    noteElement.addEventListener('click', () => {
        window.location.hash = docId; // Change hash to trigger routing
    });


    if (isShareable) {
        const shareBtn = document.createElement('button');
        shareBtn.className = 'share-btn mt-4 self-end bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75';
        shareBtn.textContent = 'Share Echo';
        shareBtn.setAttribute('aria-label', `Share echo by ${safeEmailDisplay}`);
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
            noNotesMessage.className = 'info-message text-gray-400 text-center p-4 bg-gray-700 rounded-md';
            loadMoreBtn.style.display = 'none';
            return;
        } else if (querySnapshot.empty && lastVisibleNote) {
            // No more notes to load
            noNotesMessage.textContent = 'All known echoes have been revealed.';
            noNotesMessage.className = 'info-message text-gray-400 text-center p-4 bg-gray-700 rounded-md';
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
        notesList.innerHTML = `<p class="status-message error-message bg-red-700 text-gray-100 p-4 rounded-md">${errorMessage} Error: ${error.message}</p>`;
        noNotesMessage.style.display = 'none';
        loadMoreBtn.style.display = 'none';
    }
}

// --- Load More Notes Button ---
loadMoreBtn.addEventListener('click', () => {
    loadNotes(); // Load next batch
});

// --- Random Note & Random Journey ---
randomNoteBtn.addEventListener('click', async () => {
    // Stop any ongoing random journey
    if (randomJourneyInterval) {
        clearInterval(randomJourneyInterval);
        randomJourneyInterval = null;
        randomJourneyBtn.textContent = 'Begin a Random Echo Journey';
    }
    await glimpseRandomEcho();
});

randomJourneyBtn.addEventListener('click', () => {
    if (randomJourneyInterval) {
        // Stop the journey
        clearInterval(randomJourneyInterval);
        randomJourneyInterval = null;
        randomJourneyBtn.textContent = 'Begin a Random Echo Journey';
        updateStatus(singleNoteStatus, 'Random echo journey paused.', 'info');
        // Return to main view after stopping
        window.location.hash = ''; // Will trigger handleRouting and loadNotes
    } else {
        // Start the journey
        randomJourneyBtn.textContent = 'Pause Journey...';
        updateStatus(singleNoteStatus, 'Embarking on a random echo journey...', 'info');
        glimpseRandomEcho(); // Show first one immediately
        randomJourneyInterval = setInterval(glimpseRandomEcho, 7000); // New random echo every 7 seconds
    }
});

async function glimpseRandomEcho() {
    try {
        const allNotesSnapshot = await db.collection('finalWords').get();

        if (allNotesSnapshot.empty) {
            updateStatus(singleNoteStatus, 'The cosmic archives are empty. No whispers yet to glimpse.', 'info');
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
        updateStatus(singleNoteStatus, 'A random echo has been revealed!', 'info');

    } catch (error) {
        let errorMessage = 'Failed to glimpse a random whisper from the cosmos.';
        if (error.code === 'unavailable' || error.code === 'aborted' || error.code === 'network-request-failed') {
            errorMessage = 'The cosmic connection is lost. Cannot retrieve random echo.';
        }
        console.error("Error fetching random note:", error);
        updateStatus(singleNoteStatus, `${errorMessage} Error: ${error.message}`, 'error');
        // If error, stop any journey too
        if (randomJourneyInterval) {
            clearInterval(randomJourneyInterval);
            randomJourneyInterval = null;
            randomJourneyBtn.textContent = 'Begin a Random Echo Journey';
        }
    }
}

// --- 9. Single Note View & Routing ---

/**
 * Displays a single note in a dedicated view within the "Cosmic Echoes" section.
 * @param {Object} noteData - The data of the note.
 * @param {string} docId - The Firestore document ID for the note.
 */
function showSingleNote(noteData, docId) {
    showSection(singleNoteView, navAllEchoesBtn); // Keep nav active for "All Echoes"

    const formattedTimestamp = noteData.timestamp ?
        new Date(noteData.timestamp.seconds * 1000).toLocaleString() :
        'Lost in time';
    const safeNote = DOMPurify.sanitize(noteData.note || 'No message provided.');
    const safeEmailDisplay = DOMPurify.sanitize(noteData.emailDisplay || 'an unknown spirit');
    const noteDetailsHtml = formatNoteDetails(noteData.mood, noteData.origin);

    singleNoteText.innerHTML = safeNote;
    singleNoteDetails.innerHTML = noteDetailsHtml;
    singleNoteAuthor.innerHTML = `— From ${safeEmailDisplay} on ${formattedTimestamp}`;
    updateStatus(singleNoteStatus, '', ''); // Clear previous status
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
            singleNoteText.innerHTML = '<p class="text-xl text-red-300">This echo has vanished into the ether...</p>';
            singleNoteDetails.innerHTML = '';
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
        singleNoteText.innerHTML = `<p class="text-xl text-red-300">Failed to load echo: ${error.message}</p>`;
        singleNoteDetails.innerHTML = '';
        singleNoteAuthor.innerHTML = '';
        setTimeout(() => { window.location.hash = ''; }, 5000);
    }
}

/**
 * Handles routing based on the URL hash.
 * If hash exists, tries to display a single note. Otherwise, shows the "Cosmic Echoes" (all notes) section.
 */
function handleRouting() {
    // Stop random journey if we are about to switch views
    if (randomJourneyInterval) {
        clearInterval(randomJourneyInterval);
        randomJourneyInterval = null;
        randomJourneyBtn.textContent = 'Begin a Random Echo Journey';
    }

    const hash = window.location.hash.substring(1); // Get hash without '#'
    if (hash) {
        fetchAndShowSingleNote(hash);
    } else {
        // Default to "Cosmic Echoes" section when no hash
        showSection(notesDisplaySection, navAllEchoesBtn);
        loadNotes(true); // Always reset and load when returning to main notes view
    }
}

// Listeners for sidebar navigation
navProfileBtn.addEventListener('click', () => {
    showSection(profileSection, navProfileBtn);
    updateStatus(authStatus, '', ''); // Clear auth status when navigating away
});
navMyEchoBtn.addEventListener('click', async () => {
    showSection(noteSubmissionSection, navMyEchoBtn);
    const user = auth.currentUser;
    if (user) {
        await checkUserSubmissionStatus(user.uid); // Ensure my echo section is updated
    } else {
        updateStatus(submissionStatus, 'Please login to view or submit your echo.', 'info');
        finalWordsInput.disabled = true;
        submitNoteBtn.style.display = 'none';
        permanentEchoConsent.disabled = true;
        moodSelect.disabled = true;
        originSelect.disabled = true;
    }
});
navAllEchoesBtn.addEventListener('click', () => {
    window.location.hash = ''; // Clear hash to ensure all notes view
});
backToAllNotesBtn.addEventListener('click', () => {
    window.location.hash = ''; // Clear hash to return to all notes
});


// Listen for hash changes in the URL
window.addEventListener('hashchange', handleRouting);

/**
 * Determines which section to show initially based on login status and hash.
 * Called once after initial auth state is determined and age is verified.
 */
function handleInitialView() {
    const user = auth.currentUser;
    const hash = window.location.hash.substring(1);

    if (hash) {
        fetchAndShowSingleNote(hash);
    } else if (user) {
        // If logged in, default to "My Echo" view
        showSection(noteSubmissionSection, navMyEchoBtn);
        checkUserSubmissionStatus(user.uid); // Ensure the section is properly initialized
    } else {
        // If not logged in, default to "Profile" view
        showSection(profileSection, navProfileBtn);
    }
    appContainer.style.display = 'flex'; // Show the main app container after deciding initial view
}


// --- 10. Cookie Consent (EU Compliance) ---
const COOKIE_CONSENT_DURATION_DAYS = 365; // Remember consent for a year

function setCookieConsent() {
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_CONSENT_DURATION_DAYS);
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    localStorage.setItem(`${COOKIE_CONSENT_KEY}_expires`, expires.toISOString());
    cookieConsentBanner.style.display = 'none';
}

function checkCookieConsent() {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const expires = localStorage.getItem(`${COOKIE_CONSENT_KEY}_expires`);
    if (consent === 'accepted' && expires && new Date(expires) > new Date()) {
        cookieConsentBanner.style.display = 'none';
        return true;
    } else {
        localStorage.removeItem(COOKIE_CONSENT_KEY); // Remove expired consent
        localStorage.removeItem(`${COOKIE_CONSENT_KEY}_expires`);
        cookieConsentBanner.style.display = 'flex';
        return false;
    }
}

acceptCookiesBtn.addEventListener('click', () => {
    setCookieConsent();
    // After accepting cookies, check age verification to proceed
    if (!checkAgeVerification()) {
        ageVerificationModal.style.display = 'flex';
        document.body.classList.add('no-scroll');
    }
});

// --- 11. Age Verification (EU Compliance) ---
const AGE_VERIFICATION_DURATION_DAYS = 365;

function setAgeVerification() {
    const expires = new Date();
    expires.setDate(expires.getDate() + AGE_VERIFICATION_DURATION_DAYS);
    localStorage.setItem(AGE_VERIFICATION_KEY, 'verified');
    localStorage.setItem(`${AGE_VERIFICATION_KEY}_expires`, expires.toISOString());
    ageVerificationModal.style.display = 'none';
    document.body.classList.remove('no-scroll'); // Re-enable scrolling
    // Now that age is verified, initialize the app
    handleInitialView(); // This will show the main app container and route correctly
}

function checkAgeVerification() {
    const verified = localStorage.getItem(AGE_VERIFICATION_KEY);
    const expires = localStorage.getItem(`${AGE_VERIFICATION_KEY}_expires`);
    if (verified === 'verified' && expires && new Date(expires) > new Date()) {
        ageVerificationModal.style.display = 'none';
        return true;
    } else {
        localStorage.removeItem(AGE_VERIFICATION_KEY); // Remove expired verification
        localStorage.removeItem(`${AGE_VERIFICATION_KEY}_expires`);
        ageVerificationModal.style.display = 'flex';
        document.body.classList.add('no-scroll'); // Prevent scrolling while modal is open
        return false;
    }
}

ageConfirmBtn.addEventListener('click', () => {
    setAgeVerification();
});

// --- 12. Network Status Listener ---
// Initial check
if (navigator.onLine) {
    updateConnectionStatus("Establishing cosmic link...", "info"); // Will be updated by persistence callback
} else {
    updateConnectionStatus("Cosmic connection lost. Operating in offline mode.", "warning");
}

window.addEventListener('online', () => {
    updateConnectionStatus("Reconnected to the cosmic network. Resuming cosmic operations.", "success");
    // Only re-load if we are in the main view or trying to fetch a single note that failed
    handleInitialView(); // Re-evaluate view state on reconnect
});

window.addEventListener('offline', () => {
    updateConnectionStatus("Cosmic connection lost. Operating in offline mode.", "warning");
});


// --- Initial App Load Sequence ---
document.addEventListener('DOMContentLoaded', () => {
    // Check cookie consent first
    const consentGiven = checkCookieConsent();

    if (consentGiven) {
        // If cookie consent is already given, then check age verification
        const ageVerified = checkAgeVerification();
        if (ageVerified) {
            // If both verified, proceed with full app initialization
            handleInitialView();
        }
        // If age not verified, modal is already shown by checkAgeVerification
    }
    // If consent not given, cookie banner is shown by checkCookieConsent, and appContainer remains hidden.
    // The age verification check will only proceed after cookies are accepted.
});
