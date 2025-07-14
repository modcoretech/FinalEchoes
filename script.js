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

// --- Firestore Offline Persistence (for robustness) ---
// This allows Firestore to cache data and handle writes/reads when offline,
// syncing automatically when connection is re-established.
db.enablePersistence()
  .then(() => {
    console.log("Firestore persistence enabled successfully.");
    updateConnectionStatus("Connected to the cosmic archives.", "info");
  })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one.
      console.warn("Firestore persistence could not be enabled (multiple tabs or browser limitation).");
      updateConnectionStatus("Connected, but offline persistence limited (multiple tabs?).", "warning");
    } else if (err.code == 'unimplemented') {
      // The browser does not support all features required for persistence.
      console.error("Firestore persistence not supported in this browser.");
      updateConnectionStatus("Connected, but offline persistence not supported.", "warning");
    } else {
      console.error("Error enabling Firestore persistence:", err);
      updateConnectionStatus(`Connection error: ${err.message}`, "error");
    }
  });


// --- 2. DOM Elements ---
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const authStatus = document.getElementById('auth-status');
const authForms = document.getElementById('auth-forms');
const authActions = document.querySelector('.auth-actions'); // Get the div for buttons
const userEmailDisplay = document.getElementById('user-email-display'); // For logged in user email

const noteSubmissionSection = document.getElementById('note-submission-section');
const finalWordsInput = document.getElementById('final-words-input');
const charCountSpan = document.getElementById('char-count');
const submitNoteBtn = document.getElementById('submit-note-btn');
const submissionStatus = document.getElementById('submission-status');

const notesList = document.getElementById('notes-list');
const noNotesMessage = document.getElementById('no-notes-message');
const loadMoreBtn = document.getElementById('load-more-btn');
const randomNoteBtn = document.getElementById('random-note-btn');

const connectionStatusElement = document.getElementById('connection-status');

let lastVisibleNote = null; // For pagination
const NOTES_PER_LOAD = 8; // More notes per load for better Browse

// --- 3. Utility Functions ---

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
        }, 5000);
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
 * Anonymizes an email for display.
 * @param {string} email
 * @returns {string} Anonymized email string (e.g., joh***@example.com)
 */
function anonymizeEmail(email) {
    if (!email || !email.includes('@')) {
        return 'a forgotten spirit';
    }
    const [name, domain] = email.split('@');
    if (name.length <= 3) {
        return `${name.substring(0, 1)}**@${domain}`;
    }
    return `${name.substring(0, 3)}***@${domain}`;
}

// --- 4. Authentication Functions ---

signupBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        updateStatus(authStatus, 'Email and password are the essence. They cannot be empty.', 'error');
        return;
    }
    if (password.length < 6) {
        updateStatus(authStatus, 'The key to your realm (password) must be at least 6 characters long.', 'error');
        return;
    }

    try {
        updateStatus(authStatus, 'Engraving your existence...', 'info');
        await auth.createUserWithEmailAndPassword(email, password);
        updateStatus(authStatus, 'Existence engraved! Welcome to the cosmic archives.', 'success');
        emailInput.value = ''; // Clear inputs on success
        passwordInput.value = '';
    } catch (error) {
        let errorMessage = 'Failed to engrave your existence.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This vessel (email) is already claimed. Try logging in or use another.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'The vessel (email) format is malformed.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'The key (password) is too weak. Choose a stronger one.';
        }
        updateStatus(authStatus, `${errorMessage} Error: ${error.message}`, 'error');
        console.error("Sign up error:", error);
    }
});

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        updateStatus(authStatus, 'Provide your email and password to re-enter the astral plane.', 'error');
        return;
    }

    try {
        updateStatus(authStatus, 'Rejoining the astral plane...', 'info');
        await auth.signInWithEmailAndPassword(email, password);
        updateStatus(authStatus, 'Astral plane rejoined! Your echo awaits.', 'success');
        emailInput.value = ''; // Clear inputs on success
        passwordInput.value = '';
    } catch (error) {
        let errorMessage = 'Failed to rejoin the astral plane.';
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            errorMessage = 'Incorrect key or vessel. Check your credentials.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'The vessel (email) format is malformed.';
        }
        updateStatus(authStatus, `${errorMessage} Error: ${error.message}`, 'error');
        console.error("Login error:", error);
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        updateStatus(authStatus, 'Fading into the void...', 'info');
        await auth.signOut();
        updateStatus(authStatus, 'You have left the echoes.', 'success');
    } catch (error) {
        updateStatus(authStatus, `Failed to fade into the void: ${error.message}`, 'error');
        console.error("Logout error:", error);
    }
});

// --- NEW: Account Deletion Function ---
deleteAccountBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        updateStatus(authStatus, 'No cosmic traveler is currently logged in to silence their echo.', 'error');
        return;
    }

    // A more robust confirmation
    if (!confirm('Are you absolutely certain you wish to silence your own echo? This action is irreversible for your account.')) {
        return; // User cancelled
    }

    // Firebase requires recent re-authentication for sensitive operations.
    // In a real app, you would prompt the user to re-enter their password here.
    // For this example, we'll provide a message if re-auth is needed.
    try {
        updateStatus(authStatus, 'Silencing your echo...', 'info');
        await user.delete();
        updateStatus(authStatus, 'Your account has been silenced. Your echo remains in the archives.', 'success');
        // Note: The 'finalWords' document in Firestore associated with this UID will persist,
        // fulfilling the theme's idea of "final words" even if the account is gone.
        // If you wanted to delete the note too, you would add:
        // await db.collection('finalWords').doc(user.uid).delete();
    } catch (error) {
        let errorMessage = 'Failed to silence your echo.';
        if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Your presence must be recent. Please log out, log back in, and immediately try to silence your echo again.';
        } else if (error.code === 'auth/network-request-failed') {
             errorMessage = 'Network issue during account deletion. Check your connection.';
        }
        updateStatus(authStatus, `${errorMessage} Error: ${error.message}`, 'error');
        console.error("Account deletion error:", error);
    }
});

// --- 5. User State Management (Core Logic) ---

auth.onAuthStateChanged(async user => {
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
        await checkUserSubmissionStatus(user.uid); // Check if they've submitted
    } else {
        // User is logged out
        updateStatus(authStatus, 'To leave your eternal mark, please sign up or log in.', 'info');
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
    // Always load notes for everyone, regardless of login status
    loadNotes();
});

// --- 6. Final Words Submission ---

finalWordsInput.addEventListener('input', () => {
    const currentLength = finalWordsInput.value.length;
    charCountSpan.textContent = currentLength;
    if (currentLength > 500) {
        charCountSpan.style.color = var(--color-error); /* Use CSS variable */
        submitNoteBtn.disabled = true;
        updateStatus(submissionStatus, 'Your echo is too verbose! (Max 500 characters)', 'error');
    } else {
        charCountSpan.style.color = var(--color-text-secondary); /* Use CSS variable */
        submitNoteBtn.disabled = false;
        updateStatus(submissionStatus, '', ''); // Clear error if length is good
    }
});

submitNoteBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        updateStatus(submissionStatus, 'You must log in to leave your unalterable mark.', 'error');
        return;
    }

    const finalWords = finalWordsInput.value.trim();
    if (finalWords.length === 0) {
        updateStatus(submissionStatus, 'Your echo cannot be empty. What is your message?', 'error');
        return;
    }
    if (finalWords.length > 500) {
        updateStatus(submissionStatus, 'Your echo is too verbose! (Max 500 characters)', 'error');
        return;
    }

    submitNoteBtn.disabled = true;
    submitNoteBtn.textContent = 'Releasing Echo...';
    updateStatus(submissionStatus, 'Recording your eternal echo...', 'info');

    try {
        // Attempt to create a document with the user's UID as the ID
        // The Firestore security rule will prevent this if a document with this UID already exists
        await db.collection('finalWords').doc(user.uid).set({
            userId: user.uid,
            emailDisplay: anonymizeEmail(user.email), // Store anonymized email for privacy
            note: finalWords,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        updateStatus(submissionStatus, 'Your final words have been permanently recorded in the cosmos!', 'success');
        finalWordsInput.value = ''; // Clear input
        finalWordsInput.disabled = true; // Disable further submission
        submitNoteBtn.style.display = 'none'; // Hide button
        charCountSpan.textContent = '0';
        charCountSpan.style.color = var(--color-text-secondary); /* Use CSS variable */
        await checkUserSubmissionStatus(user.uid); // Re-check to update UI state
        loadNotes(true); // Reset and reload all notes to show the new one immediately
    } catch (error) {
        let errorMessage = 'Failed to release your echo.';
        if (error.code === 'permission-denied') {
            errorMessage = 'Your echo already exists in the archives. You cannot leave another.';
            finalWordsInput.disabled = true;
            submitNoteBtn.style.display = 'none';
        } else if (error.code === 'unavailable' || error.code === 'aborted' || error.code === 'resource-exhausted' || error.code === 'internal') {
             errorMessage = 'Cosmic interference detected. Try again in a moment.'; // General network/server issue
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
            submitNoteBtn.style.display = 'block'; // Make sure button is visible
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

// --- 7. Displaying Notes (Enhanced with Pagination & Random) ---

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

    noNotesMessage.textContent = 'The cosmic archives are stirring...';
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
            loadMoreBtn.style.display = 'none';
            return;
        } else if (querySnapshot.empty && lastVisibleNote) {
            // No more notes to load
            noNotesMessage.textContent = 'All echoes have been revealed.';
            noNotesMessage.className = 'status-message info-message'; // Set styling
            loadMoreBtn.style.display = 'none';
            return;
        }

        noNotesMessage.style.display = 'none'; // Hide loading message once notes are found

        querySnapshot.forEach(doc => {
            const noteData = doc.data();
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
            updateStatus(submissionStatus, 'The cosmic archives are empty. No whispers yet.', 'info');
            return;
        }

        const notes = [];
        allNotesSnapshot.forEach(doc => {
            notes.push(doc.data());
        });

        const randomIndex = Math.floor(Math.random() * notes.length);
        const noteData = notes[randomIndex];

        notesList.innerHTML = ''; // Clear current display
        noNotesMessage.style.display = 'none'; // Hide message
        loadMoreBtn.style.display = 'none'; // Hide pagination when viewing random

        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        // Add a highlight for the random note
        noteElement.style.border = '2px solid var(--color-accent-primary)';
        noteElement.style.boxShadow = '0 0 20px rgba(var(--color-accent-primary), 0.7)';


        const formattedTimestamp = noteData.timestamp ?
            new Date(noteData.timestamp.seconds * 1000).toLocaleString() :
            'Lost in time';
        const safeNote = DOMPurify.sanitize(noteData.note || 'No message provided.');
        const safeEmailDisplay = DOMPurify.sanitize(noteData.emailDisplay || 'an unknown spirit');

        noteElement.innerHTML = `
            <p>${safeNote}</p>
            <div class="note-author">
                — A haunting whisper from ${safeEmailDisplay} on ${formattedTimestamp}
            </div>
        `;
        notesList.appendChild(noteElement);
        updateStatus(submissionStatus, 'A random echo has been revealed! It will fade in 10 seconds.', 'info');

        // Reset notes display after a short while or when user interacts
        setTimeout(() => {
            notesList.innerHTML = ''; // Clear for next loadNotes
            lastVisibleNote = null; // Reset pagination
            loadNotes(true); // Reload the paginated list, passing true to reset it
            updateStatus(submissionStatus, '', ''); // Clear random message
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

// --- Network Status Listener ---
// Listen for online/offline events to provide user feedback
window.addEventListener('online', () => {
    updateConnectionStatus("Reconnected to the cosmic network.", "success");
    loadNotes(true); // Attempt to reload notes if connection returns
});

window.addEventListener('offline', () => {
    updateConnectionStatus("Cosmic connection lost. Operating in offline mode.", "warning");
});

// --- Initial Load (Handled by onAuthStateChanged) ---
// The onAuthStateChanged listener handles the initial load of notes and UI setup.
// No explicit loadNotes() call here is needed outside of it.
