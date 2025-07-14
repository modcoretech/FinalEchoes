// --- 1. Firebase Initialization ---
// REPLACE WITH YOUR ACTUAL FIREBASE CONFIG FROM THE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyAY7m9jsU6_fIYsdUl_HEHxTCx7ssop0vo",
    authDomain: "finalechoesapp.firebaseapp.com",
    projectId: "finalechoesapp",
    storageBucket: "finalechoesapp.firebasestorage.app",
    messagingSenderId: "111535498051",
    appId: "1:111535498051:web:3ea8094fd86160f32145f6",
    measurementId: "G-5L31R9C56D"
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
const authStatus = document.getElementById('auth-status');
const noteSubmissionSection = document.getElementById('note-submission-section');
const finalWordsInput = document.getElementById('final-words-input');
const charCountSpan = document.getElementById('char-count');
const submitNoteBtn = document.getElementById('submit-note-btn');
const submissionStatus = document.getElementById('submission-status');
const notesList = document.getElementById('notes-list');
const noNotesMessage = document.getElementById('no-notes-message');

// --- 3. Authentication Functions ---

signupBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await auth.createUserWithEmailAndPassword(email, password);
        setStatus(authStatus, 'Sign up successful! You are now logged in.', 'success');
    } catch (error) {
        setStatus(authStatus, `Sign up error: ${error.message}`, 'error');
    }
});

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
        setStatus(authStatus, 'Login successful!', 'success');
    } catch (error) {
        setStatus(authStatus, `Login error: ${error.message}`, 'error');
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        setStatus(authStatus, 'Logged out.', 'success');
    } catch (error) {
        setStatus(authStatus, `Logout error: ${error.message}`, 'error');
    }
});

// --- 4. User State Management ---

auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in
        authStatus.textContent = `Logged in as: ${user.email}`;
        logoutBtn.style.display = 'block';
        document.getElementById('auth-forms').style.display = 'none';

        checkUserSubmissionStatus(user.uid);
    } else {
        // User is logged out
        authStatus.textContent = 'Please sign up or log in.';
        authStatus.className = ''; // Clear status class
        logoutBtn.style.display = 'none';
        document.getElementById('auth-forms').style.display = 'block';
        noteSubmissionSection.style.display = 'none'; // Hide submission if logged out
    }
    loadNotes(); // Always load notes for everyone
});

// --- 5. Final Words Submission ---

finalWordsInput.addEventListener('input', () => {
    const currentLength = finalWordsInput.value.length;
    charCountSpan.textContent = currentLength;
    if (currentLength > 500) {
        charCountSpan.style.color = 'red';
        submitNoteBtn.disabled = true;
    } else {
        charCountSpan.style.color = '#666';
        submitNoteBtn.disabled = false;
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
    setStatus(submissionStatus, 'Submitting your words...', '');

    try {
        // Attempt to create a document with the user's UID as the ID
        // The Firestore security rule will prevent this if a document with this UID already exists
        await db.collection('finalWords').doc(user.uid).set({
            userId: user.uid,
            email: user.email, // Store email for display or debugging
            note: finalWords,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        setStatus(submissionStatus, 'Your final words have been recorded!', 'success');
        finalWordsInput.value = ''; // Clear input
        finalWordsInput.disabled = true; // Disable further submission
        submitNoteBtn.style.display = 'none'; // Hide button
        charCountSpan.textContent = '0';
        charCountSpan.style.color = '#666';
        checkUserSubmissionStatus(user.uid); // Re-check to update UI
        loadNotes(); // Reload notes to show the new one
    } catch (error) {
        if (error.code === 'permission-denied') {
            setStatus(submissionStatus, 'You have already submitted your final words. You cannot submit again.', 'error');
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
            noteSubmissionSection.style.display = 'block';
            finalWordsInput.value = doc.data().note; // Pre-fill with their existing note
            finalWordsInput.disabled = true;
            submitNoteBtn.style.display = 'none';
            setStatus(submissionStatus, 'You have already submitted your final words. This is your permanent echo.', 'info');
        } else {
            // User has not submitted
            noteSubmissionSection.style.display = 'block';
            finalWordsInput.disabled = false;
            submitNoteBtn.style.display = 'block';
            setStatus(submissionStatus, 'Enter your final words below. This can only be done once.', '');
        }
    } catch (error) {
        console.error("Error checking user submission status:", error);
        setStatus(submissionStatus, 'Error checking submission status.', 'error');
    }
}

// --- 6. Displaying Notes ---

async function loadNotes() {
    notesList.innerHTML = ''; // Clear existing notes
    noNotesMessage.style.display = 'block'; // Show loading message initially

    try {
        const querySnapshot = await db.collection('finalWords').orderBy('timestamp', 'desc').get();
        if (querySnapshot.empty) {
            noNotesMessage.textContent = 'No echoes yet. Be the first!';
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

            noteElement.innerHTML = `
                <p>${safeNote}</p>
                <div class="note-author">
                    — From ${noteData.email ? noteData.email.split('@')[0] : 'anonymousecho'} on ${formattedTimestamp}
                </div>
            `;
            notesList.appendChild(noteElement);
        });
    } catch (error) {
        console.error("Error loading notes:", error);
        notesList.innerHTML = `<p class="error">Error loading echoes: ${error.message}</p>`;
        noNotesMessage.style.display = 'none';
    }
}

// --- Utility Function ---
function setStatus(element, message, type) {
    element.textContent = message;
    element.className = type; // 'success', 'error', 'info', or ''
}

// --- Initial Load ---
loadNotes(); // Load notes when page loads
