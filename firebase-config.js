// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyAf_dwJRk4Z9MEfzK24veLSlCVHo-sd7SA",
    authDomain: "megawebproject-f4c53.firebaseapp.com",
    projectId: "megawebproject-f4c53",
    storageBucket: "megawebproject-f4c53.firebasestorage.app",
    messagingSenderId: "568103465413",
    appId: "1:568103465413:web:da6b09c60de70bfefe5bac"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
