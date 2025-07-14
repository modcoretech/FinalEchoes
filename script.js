// --- 1. Firebase Initialization ---
// REPLACE WITH YOUR ACTUAL FIREBASE CONFIG FROM THE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyAY7m9jsU6_fIYsdUl_HEHxTCx7ssop0vo", // Your actual key
  authDomain: "finalechoesapp.firebaseapp.com",      // Your actual domain
  projectId: "finalechoesapp",                      // Your actual project ID
  storageBucket: "finalechoesapp.firebasestorage.app",
  messagingSenderId: "111535498051",
  appId: "1:111535498051:web:3ea8094fd86160f32145f6",
  measurementId: "G-5L31R9C56D" // Uncomment if you enabled Analytics
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- 2. DOM Elements ---
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn'); // New
const authStatus = document.getElementById('auth-status');
const noteSubmissionSection = document.getElementById('note-submission-section');
const finalWordsInput = document.getElementById('final-words-input');
const charCountSpan = document.getElementById('char-count');
const submitNoteBtn = document.getElementById('submit-note-btn');
const submissionStatus = document.getElementById('submission-status');
const notesList = document.getElementById('notes-list');
const noNotesMessage = document.getElementById('no-notes-message');
const loadMoreBtn = document.getElementById('load-more-btn'); // New
const randomNoteBtn = document.getElementById('random-note-btn'); // New

let lastVisibleNote = null; // For pagination
const NOTES_PER_LOAD = 5; // How many notes to load at a time

// --- 3. Authentication Functions ---

signupBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        setStatus(authStatus, 'Email and password cannot be empty.', 'error');
        return;
    }
    try {
        await auth.createUserWithEmailAndPassword(email, password);
        setStatus(authStatus, 'Sign up successful! Welcome to the Echoes.', 'success');
    } catch (error) {
        setStatus(authStatus, `Sign up error: ${error.message}`, 'error');
    }
});

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        setStatus(authStatus, 'Email and password cannot be empty.', 'error');
        return;
    }
    try {
        await auth.signInWithEmailAndPassword(email, password);
        setStatus(authStatus, 'Login successful! Your echo awaits.', 'success');
    } catch (error) {
        setStatus(authStatus, `Login error: ${error.message}`, 'error');
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        setStatus(authStatus, 'You have left the echoes.', 'success');
    } catch (error) {
        setStatus(authStatus, `Logout error: ${error.message}`, 'error');
    }
});

// --- NEW: Account Deletion Function ---
deleteAccountBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        setStatus(authStatus, 'No user logged in to delete.', 'error');
        return;
    }

    if (!confirm('Are you absolutely sure you want to delete your account? This action is irreversible.')) {
        return; // User cancelled
    }

    // Firebase requires recent re-authentication for sensitive operations like deleting an account.
    // For simplicity here, we're skipping re-auth, but in a real app, you'd prompt for password again.
    try {
        // Note: This only deletes the user from Authentication.
        // Their 'finalWords' note in Firestore will remain as a permanent echo,
        // fulfilling the theme's idea of "final words" even if the account is gone.
        // If you wanted to delete the note too, you'd add:
        // await db.collection('finalWords').doc(user.uid).delete();

        await user.delete();
        setStatus(authStatus, 'Account successfully deleted. Your echo remains...', 'success');
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            setStatus(authStatus, 'Please log out and log back in, then try deleting your account immediately.', 'error');
        } else {
            setStatus(authStatus, `Error deleting account: ${error.message}`, 'error');
        }
    }
});


// --- 4. User State Management ---

auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in
        authStatus.textContent = `Logged in as: ${user.email}`;
        logoutBtn.style.display = 'inline-block';
        deleteAccountBtn.style.display = 'inline-block'; // Show delete button
        document.getElementById('auth-forms').style.display = 'none';
        noteSubmissionSection.style.display = 'block'; // Show submission section

        checkUserSubmissionStatus(user.uid);
    } else {
        // User is logged out
        authStatus.textContent = 'Please sign up or log in to leave your echo.';
        authStatus.className = ''; // Clear status class
        logoutBtn.style.display = 'none';
        deleteAccountBtn.style.display = 'none'; // Hide delete button
        document.getElementById('auth-forms').style.display = 'block';
        noteSubmissionSection.style.display = 'none'; // Hide submission if logged out
        finalWordsInput.disabled = false; // Ensure input is enabled for next login
        submitNoteBtn.style.display = 'block'; // Ensure button is shown for next login
        finalWordsInput.value = ''; // Clear input on logout
        setStatus(submissionStatus, '', ''); // Clear submission status
    }
    // Always clear notes and reload from scratch when auth state changes (or for pagination)
    notesList.innerHTML = '';
    lastVisibleNote = null; // Reset pagination
    loadNotes(); // Always load notes for everyone
});

// --- 5. Final Words Submission ---

finalWordsInput.addEventListener('input', () => {
    const currentLength = finalWordsInput.value.length;
    charCountSpan.textContent = currentLength;
    if (currentLength > 500) {
        charCountSpan.style.color = 'red';
        submitNoteBtn.disabled = true;
        setStatus(submissionStatus, 'Note is too long! (Max 500 characters)', 'error');
    } else {
        charCountSpan.style.color = '#666';
        submitNoteBtn.disabled = false;
        setStatus(submissionStatus, '', ''); // Clear error if length is good
    }
});

submitNoteBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        setStatus(submissionStatus, 'You must be logged in to submit a note.', 'error');
        return;
    }

    const finalWords = finalWordsInput.value.trim();
    if (finalWords.length === 0 || finalWords.length > 500) {
        setStatus(submissionStatus, 'Please enter between 1 and 500 characters.', 'error');
        return;
    }

    submitNoteBtn.disabled = true;
    submitNoteBtn.textContent = 'Submitting...';
    setStatus(submissionStatus, 'Recording your echo...', '');

    try {
        await db.collection('finalWords').doc(user.uid).set({
            userId: user.uid,
            // To hide full emails, we can store a hashed version or just the first part
            // For now, let's keep it simple with first part + asterisks for a more "anonymous" feel
            emailDisplay: user.email ? `${user.email.split('@')[0].substring(0, 3)}***@${user.email.split('@')[1]}` : 'anonymous_echo',
            note: finalWords,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        setStatus(submissionStatus, 'Your final words have been recorded! They are now a permanent echo.', 'success');
        finalWordsInput.value = ''; // Clear input
        finalWordsInput.disabled = true; // Disable further submission
        submitNoteBtn.style.display = 'none'; // Hide button
        charCountSpan.textContent = '0';
        charCountSpan.style.color = '#666';
        checkUserSubmissionStatus(user.uid); // Re-check to update UI
        // Don't reload all notes immediately, let the user trigger load more if needed
        // Or if you want immediate display, uncomment: loadNotes(true); // pass true to reset and reload
    } catch (error) {
        if (error.code === 'permission-denied') {
            setStatus(submissionStatus, 'You have already submitted your final words. This is your permanent echo.', 'error');
            finalWordsInput.disabled = true;
            submitNoteBtn.style.display = 'none';
        } else {
            setStatus(submissionStatus, `Error submitting note: ${error.message}`, 'error');
        }
        submitNoteBtn.disabled = false;
        submitNoteBtn.textContent = 'Submit My Final Words';
    }
});

async function checkUserSubmissionStatus(uid) {
    const userNoteRef = db.collection('finalWords').doc(uid);
    try {
        const doc = await userNoteRef.get();
        if (doc.exists) {
            // User has already submitted
            finalWordsInput.value = doc.data().note; // Pre-fill with their existing note
            finalWordsInput.disabled = true;
            submitNoteBtn.style.display = 'none';
            setStatus(submissionStatus, 'You have already submitted your final words. This is your permanent echo.', 'info');
        } else {
            // User has not submitted
            finalWordsInput.disabled = false;
            submitNoteBtn.style.display = 'block'; // Make sure button is visible
            setStatus(submissionStatus, 'Enter your final words below. This can only be done once, so choose them wisely.', '');
        }
        // Ensure submission section is visible if user is logged in
        noteSubmissionSection.style.display = 'block';
    } catch (error) {
        console.error("Error checking user submission status:", error);
        setStatus(submissionStatus, 'Error checking submission status.', 'error');
        // If there's an error checking, assume they can't submit to be safe, or allow to retry
        finalWordsInput.disabled = true;
        submitNoteBtn.style.display = 'none';
    }
}

// --- 6. Displaying Notes (Enhanced) ---

async function loadNotes(reset = false) {
    if (reset) {
        notesList.innerHTML = ''; // Clear existing notes
        lastVisibleNote = null;
        loadMoreBtn.style.display = 'none'; // Hide load more button initially
    }

    noNotesMessage.textContent = 'Loading echoes...';
    noNotesMessage.style.display = 'block';

    let query = db.collection('finalWords').orderBy('timestamp', 'desc').limit(NOTES_PER_LOAD);
    if (lastVisibleNote) {
        query = query.startAfter(lastVisibleNote);
    }

    try {
        const querySnapshot = await query.get();

        if (querySnapshot.empty && !lastVisibleNote) { // Only if no notes at all on first load
            noNotesMessage.textContent = 'No echoes yet. Be the first to leave a permanent mark!';
            loadMoreBtn.style.display = 'none';
            return;
        }

        noNotesMessage.style.display = 'none'; // Hide loading message

        querySnapshot.forEach(doc => {
            const noteData = doc.data();
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item';

            const formattedTimestamp = noteData.timestamp ?
                new Date(noteData.timestamp.seconds * 1000).toLocaleString() :
                'Date unknown';

            // Sanitize input to prevent XSS (basic example)
            const safeNote = DOMPurify.sanitize(noteData.note);
            const safeEmailDisplay = DOMPurify.sanitize(noteData.emailDisplay || 'anonymous_echo');


            noteElement.innerHTML = `
                <p>${safeNote}</p>
                <div class="note-author">
                    — A distant echo from ${safeEmailDisplay} on ${formattedTimestamp}
                </div>
            `;
            notesList.appendChild(noteElement);
        });

        // Set the last visible document for pagination
        lastVisibleNote = querySnapshot.docs[querySnapshot.docs.length - 1];

        // If fewer notes than requested were returned, it means we've reached the end
        if (querySnapshot.docs.length < NOTES_PER_LOAD) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }

    } catch (error) {
        console.error("Error loading notes:", error);
        notesList.innerHTML = `<p class="error">Failed to retrieve echoes: ${error.message}</p>`;
        noNotesMessage.style.display = 'none';
        loadMoreBtn.style.display = 'none';
    }
}

// --- NEW: Load More Notes Button ---
loadMoreBtn.addEventListener('click', () => {
    loadNotes(); // Load next batch
});

// --- NEW: View Random Note Button ---
randomNoteBtn.addEventListener('click', async () => {
    try {
        // Get total count (approximation/max to pick a random index)
        const allNotesSnapshot = await db.collection('finalWords').get();
        const totalNotes = allNotesSnapshot.size;

        if (totalNotes === 0) {
            setStatus(submissionStatus, 'No echoes available to view randomly yet.', 'info');
            return;
        }

        const randomIndex = Math.floor(Math.random() * totalNotes);

        // Fetch a single random note (this is an approximation for very large datasets)
        const randomNoteQuery = db.collection('finalWords').orderBy('timestamp').limit(1).offset(randomIndex);
        const randomNoteSnapshot = await randomNoteQuery.get();

        if (!randomNoteSnapshot.empty) {
            const noteData = randomNoteSnapshot.docs[0].data();
            notesList.innerHTML = ''; // Clear current display
            noNotesMessage.style.display = 'none';
            loadMoreBtn.style.display = 'none'; // Hide pagination when viewing random

            const noteElement = document.createElement('div');
            noteElement.className = 'note-item';
            noteElement.style.border = '2px solid #3498db'; // Highlight random note

            const formattedTimestamp = noteData.timestamp ?
                new Date(noteData.timestamp.seconds * 1000).toLocaleString() :
                'Date unknown';
            const safeNote = DOMPurify.sanitize(noteData.note);
            const safeEmailDisplay = DOMPurify.sanitize(noteData.emailDisplay || 'anonymous_echo');

            noteElement.innerHTML = `
                <p>${safeNote}</p>
                <div class="note-author">
                    — A haunting echo from ${safeEmailDisplay} on ${formattedTimestamp}
                </div>
            `;
            notesList.appendChild(noteElement);
            setStatus(submissionStatus, 'Displaying a random echo. Click "Load More Echoes" to see the list again.', 'info');

            // Reset notes display after a short while or when user interacts
            setTimeout(() => {
                notesList.innerHTML = ''; // Clear for next loadNotes
                lastVisibleNote = null;
                loadNotes(); // Reload the paginated list
                setStatus(submissionStatus, '', '');
            }, 10000); // Display random note for 10 seconds

        } else {
            setStatus(submissionStatus, 'Could not retrieve a random echo.', 'error');
        }

    } catch (error) {
        console.error("Error fetching random note:", error);
        setStatus(submissionStatus, `Error fetching random echo: ${error.message}`, 'error');
    }
});


// --- Utility Function ---
function setStatus(element, message, type) {
    element.textContent = message;
    element.className = type; // 'success', 'error', 'info', or ''
}

// --- Initial Load ---
// `onAuthStateChanged` will call `loadNotes()` initially, so no need for a separate call here.
