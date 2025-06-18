// === Firebase Config ===
const firebaseConfig = {              // Replace with your Firebase config
    apiKey: "A",
    authDomain: "s.firebaseapp.com",
    projectId: "s",
    storageBucket: "s.appspot.com",
    messagingSenderId: "1",
    appId: "1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// === DOM Elements ===
const historyList = document.getElementById('history-list');
const backBtn = document.getElementById('back-btn');
const logoutBtn = document.getElementById('logout-btn');

// === Auth State Listener ===
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = 'index.html'; // Not logged in
    } else {
        loadDiagnosisHistory(user.uid);
    }
});

// === Load Diagnosis History ===
function loadDiagnosisHistory(userId) {
    historyList.innerHTML = '<p>Loading diagnosis history...</p>';

    db.collection('users')
        .doc(userId)
        .collection('diagnoses')
        .orderBy('date', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                historyList.innerHTML = '<p>No diagnosis history found.</p>';
                return;
            }

            historyList.innerHTML = '';

            snapshot.forEach(doc => {
                const data = doc.data();

                // Robust date handling with multiple fallbacks
                let displayDate;
                try {
                    if (data.date?.toDate) {
                        // Firestore Timestamp
                        displayDate = data.date.toDate();
                    } else if (data.date) {
                        // ISO String or other date format
                        displayDate = new Date(data.date);
                    } else {
                        // Fallback to document ID timestamp or current date
                        displayDate = new Date();
                    }

                    // Format the date consistently
                    displayDate = displayDate.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                } catch (e) {
                    console.warn('Error formatting date:', e);
                    displayDate = "Date not available";
                }

                // Process results with null checks
                const results = data.results ? Object.entries(data.results)
                    .map(([name, prob]) => ({ name, prob }))
                    .sort((a, b) => b.prob - a.prob)
                    .slice(0, 3) : [];

                // Create history item
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div class="history-date"><strong>Date:</strong> ${displayDate}</div>
                    ${data.imageUrl ? `<img src="${data.imageUrl}" class="history-image" alt="Diagnosis preview" />` : ''}
                    <div class="history-results">
                        <strong>Top Results:</strong>
                        <ul>
                            ${results.map(result =>
                            `<li>${result.name}: ${(result.prob * 100).toFixed(1)}%</li>`
                            ).join('')}
                        </ul>
                    </div>
                    <div class="history-symptoms">
                        <strong>Symptoms:</strong>
                        <ul>
                            ${data.symptoms?.itching ? '<li>✓ Itching</li>' : ''}
                            ${data.symptoms?.bleeding ? '<li>✓ Bleeding</li>' : ''}
                            ${data.symptoms?.scaly_skin ? '<li>✓ Scaly Skin</li>' : ''}
                            ${data.symptoms?.white_patches ? '<li>✓ White Patches</li>' : ''}
                            ${data.symptoms?.sudden_onset ? '<li>✓ Sudden Onset</li>' : ''}
                            ${!data.symptoms?.itching &&
                            !data.symptoms?.bleeding &&
                            !data.symptoms?.scaly_skin &&
                            !data.symptoms?.white_patches &&
                            !data.symptoms?.sudden_onset ? '<li>No symptoms selected</li>' : ''}
                         </ul>
                    </div>
                `;

                historyList.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error loading history:', error);
            historyList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error loading history. Please try again later.</p>
                </div>
            `;
        });
}

// === Buttons ===
backBtn.addEventListener('click', () => {
    window.location.href = 'diagnosis.html';
});

logoutBtn.addEventListener('click', () => {
    auth.signOut()
        .then(() => window.location.href = 'index.html')
        .catch(error => console.error('Logout error:', error));
});
