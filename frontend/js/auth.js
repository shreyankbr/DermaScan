// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB8B1ZKOK6T0JIehHCrXB8oi_NGOWs2VHk",
    authDomain: "auth.dermascan.me",
    projectId: "skin-disease-3cbf9",
    storageBucket: "skin-disease-3cbf9.appspot.com",
    messagingSenderId: "117215400065",
    appId: "1:117215400065:web:4975b24971af7a37fc3d80"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log("Auth persistence set to LOCAL");
    })
    .catch((error) => {
        console.error("Error setting auth persistence:", error);
    });

// DOM elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');

// Toggle between login and signup forms
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// Login function
loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    loginError.textContent = '';

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            return db.collection('users').doc(userCredential.user.uid).set({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        })
        .then(() => {
            window.location.href = 'https://dermascan.me/diagnosis.html';
        })
        .catch((error) => {
            loginError.textContent = error.message;
        });
});

// Signup function
signupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    signupError.textContent = '';

    if (password !== confirmPassword) {
        signupError.textContent = 'Passwords do not match';
        return;
    }

    if (!name) {
        signupError.textContent = 'Please enter your full name';
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            // Update Firebase Auth displayName
            return user.updateProfile({ displayName: name }).then(() => {
                // Save user profile to Firestore
                return db.collection('users').doc(user.uid).set({
                    name: name,
                    email: email,
                    userId: user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });
        })
        .then(() => {
            window.location.href = 'https://dermascan.me/diagnosis.html';;
        })
        .catch((error) => {
            signupError.textContent = error.message;
        });
});

 //Check if user is logged in
auth.onAuthStateChanged((user) => {
    const currentPath = window.location.pathname;
    const protectedPaths = ['/diagnosis.html', '/history.html'];
    const publicPaths = ['/', '/index.html', '/login.html'];
    
    console.log(`Auth state changed. User: ${user ? user.email : 'none'}, Path: ${currentPath}`);

    if (user) {
        // User is logged in
        if (publicPaths.some(path => currentPath.endsWith(path))) {
            console.log("Redirecting to diagnosis");
            window.location.href = '/diagnosis.html';
        }
    } else {
        // User is not logged in
        if (protectedPaths.some(path => currentPath.endsWith(path))) {
            console.log("Redirecting to home");
            window.location.href = '/index.html';
        }
    }
});