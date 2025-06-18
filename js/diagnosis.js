import { generateGradCAM, initGradCAM } from './gradcam.js';

// Firebase Config
const firebaseConfig = {               // Replace with your Firebase project config
    apiKey: "A",
    authDomain: "s.firebaseapp.com",
    projectId: "s",
    storageBucket: "s.appspot.com",
    messagingSenderId: "1",
    appId: "1"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Debug mode
const DEBUG_MODE = true;

document.addEventListener('DOMContentLoaded', function () {
    const uploadArea = document.getElementById('upload-area');
    const imageUpload = document.getElementById('image-upload');
    const previewContainer = document.getElementById('preview-container');
    const previewImage = document.getElementById('preview-image');
    const removeImageBtn = document.getElementById('remove-image');
    const diagnoseBtn = document.getElementById('diagnose-btn');
    const resultsSection = document.getElementById('results-section');
    const originalImage = document.getElementById('original-image');
    const gradcamImage = document.getElementById('gradcam-image');
    const topDiagnosis = document.getElementById('top-diagnosis');
    const otherDiagnoses = document.getElementById('other-diagnoses');
    const recommendations = document.getElementById('recommendations');
    const loadingModal = document.getElementById('loading-modal');
    const generateReportBtn = document.getElementById('generate-report');
    const newDiagnosisBtn = document.getElementById('new-diagnosis');
    const logoutBtn = document.getElementById('logout-btn');
    const historyBtn = document.getElementById('history-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const cameraModal = document.getElementById('camera-modal');
    const cameraFeed = document.getElementById('camera-feed');
    const captureBtn = document.getElementById('capture-btn');
    const closeCamera = document.querySelector('.close-camera');
    const cancelCameraBtn = document.getElementById('cancel-camera-btn');
    let stream = null;

    // Initialize GradCAM
    initGradCAM();

    // Event Listeners
    uploadArea.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', handleImageUpload);
    removeImageBtn.addEventListener('click', resetImageUpload);
    diagnoseBtn.addEventListener('click', startDiagnosis);
    generateReportBtn.addEventListener('click', generatePDFReport);
    newDiagnosisBtn.addEventListener('click', resetDiagnosis);
    logoutBtn.addEventListener('click', logoutUser);
    historyBtn.addEventListener('click', () => window.location.href = 'history.html');
    cameraBtn.addEventListener('click', startCamera);
    uploadBtn.addEventListener('click', () => imageUpload.click());
    closeCamera.addEventListener('click', stopCamera);
    captureBtn.addEventListener('click', capturePhoto);
    cancelCameraBtn.addEventListener('click', stopCamera);
    closeCamera.addEventListener('click', stopCamera);

    // Drag and Drop Handlers
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            imageUpload.files = e.dataTransfer.files;
            handleImageUpload({ target: imageUpload });
        }
    });

    // Functions
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.match('image.*')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImage.src = e.target.result;
                originalImage.src = e.target.result;
                previewContainer.style.display = 'block';
                uploadArea.style.display = 'none';
                diagnoseBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    }

    async function startDiagnosis() {
        // Set loading state
        diagnoseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        diagnoseBtn.disabled = true;

        const symptoms = {
            itching: document.getElementById('itching').checked,
            bleeding: document.getElementById('bleeding').checked,
            scaly_skin: document.getElementById('scaly_skin').checked,
            white_patches: document.getElementById('white_patches').checked,
            sudden_onset: document.getElementById('sudden_onset').checked
        };

        const file = imageUpload.files[0];
        if (!file) {
            alert("Please upload an image.");
            resetAnalyzeButton(); // Reset immediately if no file
            return;
        }

        loadingModal.style.display = 'flex';
        let analysisSuccess = false;

        try {
            const formData = new FormData();
            formData.append("image", file);
            Object.entries(symptoms).forEach(([key, value]) => {
                formData.append(key, value ? '1' : '0');
            });

            //API endpoint to use relative path
            const response = await fetch("/predict", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();
            if (!result.success) throw new Error(result.error || "API error");

            const predictions = {};
            result.predictions.forEach(pred => {
                predictions[pred.name] = pred.prob;
            });

            await displayResults(predictions);
            await saveDiagnosisToHistory(predictions);
            analysisSuccess = true;

        } catch (error) {
            console.error("Diagnosis failed:", error);
            showToast("Diagnosis failed. Please try again.", 'error');
        } finally {
            loadingModal.style.display = 'none';

            // Only reset button if analysis failed
            if (!analysisSuccess) {
                resetAnalyzeButton();
            }
            // If successful, displayResults() will handle UI updates
        }
    }

    // Helper function to reset button
    function resetAnalyzeButton() {
        diagnoseBtn.innerHTML = 'Analyze';
        diagnoseBtn.disabled = false;
    }

    async function saveDiagnosisToHistory(diagnosis) {
        if (DEBUG_MODE) console.group("[DEBUG] Saving Diagnosis History");

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};


            if (DEBUG_MODE) {
                console.log("User ID:", user.uid);
                console.log("Diagnosis data:", diagnosis);
            }

            const diagnosisData = {
                date: firebase.firestore.FieldValue.serverTimestamp(),
                imageUrl: previewImage.src,
                results: diagnosis,
                symptoms: {
                    itching: document.getElementById('itching').checked,
                    bleeding: document.getElementById('bleeding').checked,
                    scaly_skin: document.getElementById('scaly_skin').checked,
                    white_patches: document.getElementById('white_patches').checked,
                    sudden_onset: document.getElementById('sudden_onset').checked
                },
                userId: user.uid,
                patientName: user.displayName || userData?.name || 'Anonymous'
            };

            // Save to both collections for redundancy
            const docRef = await db.collection('diagnoses').add(diagnosisData);
            await db.collection('users').doc(user.uid).collection('diagnoses').doc(docRef.id).set(diagnosisData);

            if (DEBUG_MODE) {
                console.log("Successfully saved diagnosis with ID:", docRef.id);
                console.groupEnd();
            }
            return true;
        } catch (error) {
            console.error("Error saving diagnosis:", error);
            if (DEBUG_MODE) {
                console.groupEnd();
                alert(`Save failed: ${error.message}`);
            }
            return false;
        }
    }

    async function displayResults(results) {
        try {
            // Reset analyze button immediately when results start displaying
            resetAnalyzeButton();

            const resultsArray = Object.entries(results)
                .map(([name, prob]) => ({ name, prob }))
                .sort((a, b) => b.prob - a.prob);

            const topResult = resultsArray[0];
            const topProbPercent = (topResult.prob * 100).toFixed(1);

            // Update top diagnosis
            topDiagnosis.querySelector('.diagnosis-name').textContent = `${topResult.name}\u00A0\u00A0\u00A0`;
            topDiagnosis.querySelector('.diagnosis-probability').textContent = `${topProbPercent}%\u00A0\u00A0\u00A0`;
            topDiagnosis.querySelector('.confidence-bar').style.width = `${topProbPercent}%`;

            // Generate GradCAM visualization
            try {
                await generateGradCAM(previewImage, gradcamImage, topResult.name);
            } catch (gradcamError) {
                console.error("GradCAM generation failed:", gradcamError);
                gradcamImage.src = previewImage.src; // Fallback to original image
            }

            // Process other diagnoses
            otherDiagnoses.innerHTML = '';
            for (let i = 1; i < Math.min(4, resultsArray.length); i++) {
                const result = resultsArray[i];
                const probPercent = (result.prob * 100).toFixed(1);

                const diagnosisItem = document.createElement('div');
                diagnosisItem.className = 'diagnosis-item';
                diagnosisItem.innerHTML = `
                <div class="diagnosis-name">${result.name}\u00A0\u00A0\u00A0</div>
                <div class="diagnosis-probability">${probPercent}%\u00A0\u00A0\u00A0</div>
                <div class="confidence-meter">
                    <div class="confidence-bar" style="width: ${probPercent}%"></div>
                </div>
            `;
                otherDiagnoses.appendChild(diagnosisItem);
            }

            // Show recommendations
            displayRecommendations(topResult.name);

            // Enable doctor consultation
            const askDoctorBtn = document.getElementById('ask-doctor');
            if (askDoctorBtn) askDoctorBtn.style.display = 'block';

            // Display results section
            resultsSection.style.display = 'block';
            setTimeout(() => {
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }, 100);

            // Show success notification
            showToast(`Diagnosis complete! Found ${topResult.name} with ${topProbPercent}% confidence`, 'success');

        } catch (error) {
            console.error("Error displaying results:", error);
            showToast("Error displaying results. Please try again.", 'error');
            resetAnalyzeButton(); // Ensure button is reset even if display fails
        }
    }

    // Helper function for toast notifications
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => document.body.removeChild(toast), 300);
            }, 3000);
        }, 100);
    }

    function displayRecommendations(diagnosis) {
        const recommendationMap = {
            'Acne': [
                'Use gentle, non-comedogenic skincare products',
                'Avoid picking or squeezing pimples',
                'Consider benzoyl peroxide or salicylic acid treatments',
                'Consult a dermatologist for severe cases'
            ],
            'Eczema': [
                'Moisturize regularly with fragrance-free creams',
                'Avoid harsh soaps and known allergens',
                'Use mild laundry detergents',
                'See a dermatologist for prescription treatments'
            ],
            'Psoriasis': [
                'Use thick creams or ointments to moisturize',
                'Get moderate sunlight exposure (avoid sunburn)',
                'Reduce stress through relaxation techniques',
                'Consult a dermatologist for treatment options'
            ],
            'Vitiligo': [
                'Use sun protection on depigmented areas',
                'Consider cosmetic cover-ups if desired',
                'Consult a dermatologist about treatment options',
                'Join a support group if needed'
            ],
            'default': [
                'Keep the affected area clean and dry',
                'Avoid scratching or irritating the area',
                'Monitor for changes in size or appearance',
                'Consult a dermatologist for proper diagnosis'
            ]
        };

        const recs = recommendationMap[diagnosis] || recommendationMap['default'];
        recommendations.innerHTML = `
            <ul>
                ${recs.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        `;
    }

    async function generatePDFReport() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");

            // Get the most recent diagnosis to get the stored patient name
            const diagnosesSnapshot = await db.collection('users')
                .doc(user.uid)
                .collection('diagnoses')
                .orderBy('date', 'desc')
                .limit(1)
                .get();

            let patientName = 'Patient';

            // First try to get name from the diagnosis record
            if (!diagnosesSnapshot.empty) {
                const latestDiagnosis = diagnosesSnapshot.docs[0].data();
                patientName = latestDiagnosis.patientName || 'Patient';
            }

            // If not found in diagnosis, try user document
            if (patientName === 'Patient') {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    patientName = userDoc.data().name || user.displayName || 'Patient';
                }
            }

            // Document setup
            doc.setProperties({
                title: 'DermaScan Diagnosis Report',
                subject: 'Skin Disease Diagnosis Results',
                author: 'DermaScan AI'
            });

            // Header
            doc.setFontSize(20);
            doc.setTextColor(33, 150, 243);
            doc.setFont('helvetica', 'bold');
            doc.text('DERMASCAN AI DIAGNOSIS REPORT', 105, 20, { align: 'center' });

            // Patient Info
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('Patient Information:', 15, 35);
            doc.setFont('helvetica', 'normal');
            doc.text(`Name: ${patientName}`, 15, 45);
            doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, 55);

            // Diagnosis Results
            doc.setFontSize(16);
            doc.setTextColor(33, 150, 243);
            doc.setFont('helvetica', 'bold');
            doc.text('Diagnosis Results', 15, 70);

            const topDiag = topDiagnosis.querySelector('.diagnosis-name').textContent.trim();
            const topProb = topDiagnosis.querySelector('.diagnosis-probability').textContent.trim();

            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Primary Diagnosis:', 20, 85);
            doc.setFont('helvetica', 'bold');
            doc.text(`${topDiag} (${topProb})`, 20, 95);

            // Other diagnoses
            doc.setFont('helvetica', 'normal');
            doc.text('Other Possible Conditions:', 20, 110);
            const otherItems = otherDiagnoses.querySelectorAll('.diagnosis-item');
            let yPos = 120;
            otherItems.forEach((item) => {
                const name = item.querySelector('.diagnosis-name').textContent.trim();
                const prob = item.querySelector('.diagnosis-probability').textContent.trim();
                doc.text(`• ${name}: ${prob}`, 25, yPos);
                yPos += 7;
            });

            // Recommendations
            doc.setFontSize(16);
            doc.setTextColor(33, 150, 243);
            doc.setFont('helvetica', 'bold');
            doc.text('Medical Recommendations', 15, yPos + 10);

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            const recItems = recommendations.querySelectorAll('li');
            yPos += 20;
            recItems.forEach((item) => {
                doc.text(`✓ ${item.textContent.trim()}`, 20, yPos);
                yPos += 7;
            });

            // Images Section
            yPos += 10;
            doc.setFontSize(16);
            doc.setTextColor(33, 150, 243);
            doc.setFont('helvetica', 'bold');
            doc.text('Uploaded Image & Attention Map', 15, yPos);

            yPos += 10;

            // Load images as Data URLs and add to PDF
            const originalImageData = await getImageDataURL(originalImage);
            const gradcamImageData = await getImageDataURL(gradcamImage);

            // Resize image area to max width (70mm), keep aspect ratio
            const imgWidth = 70;
            const imgHeight = 70;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text('Original Image:', 15, yPos + 8);
            doc.addImage(originalImageData, 'JPEG', 15, yPos + 12, imgWidth, imgHeight);

            doc.text('Attention Map:', 110, yPos + 8);
            doc.addImage(gradcamImageData, 'JPEG', 110, yPos + 12, imgWidth, imgHeight);

            // Footer
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('This report is generated by DermaScan AI and should be reviewed by a healthcare professional.', 105, 285, { align: 'center' });
            doc.text('Confidential Patient Report - © 2025 DermaScan AI', 105, 290, { align: 'center' });

            // Save PDF - using the properly retrieved patientName
            const fileName = `DermaScan_${patientName.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            showToast('✅ Report downloaded!', 'success');
        } catch (error) {
            console.error("Error generating PDF:", error);
            showToast("Error generating report. Please try again.", 'error');
        }
    }

    function getImageDataURL(imgElement) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = imgElement.naturalWidth;
            canvas.height = imgElement.naturalHeight;
            ctx.drawImage(imgElement, 0, 0);
            canvas.toBlob((blob) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }, 'image/jpeg');
        });
    }

    //Placeholder for future integration
    function initVirtualDoctorChat() {
        const chatBtn = document.getElementById('ask-doctor');
        chatBtn.addEventListener('click', () => {
            // Implement WebRTC video call or chat interface
            alert("Connecting you to a dermatologist...");
            // Could integrate with Twilio API or similar service
        });
    }

    // Camera functions
    async function startCamera() {
        try {
            cameraModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent scrolling

            // Reset camera feed first
            cameraFeed.srcObject = null;

            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });
            cameraFeed.srcObject = stream;

            // Add keyboard escape handler
            document.addEventListener('keydown', handleEscapeKey);
        } catch (err) {
            console.error("Camera error:", err);
            alert("Camera access denied. Please check permissions.");
            stopCamera();
        }
    }

    function stopCamera() {
        document.removeEventListener('keydown', handleEscapeKey);

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        cameraModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        cameraFeed.srcObject = null;
    }

    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            stopCamera();
        }
    }

    // Update your close button event listener
    closeCamera.addEventListener('click', stopCamera);

    function capturePhoto() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = cameraFeed.videoWidth;
        canvas.height = cameraFeed.videoHeight;
        context.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);

        // Convert to blob and create file object
        canvas.toBlob((blob) => {
            const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            imageUpload.files = dataTransfer.files;

            // Display preview
            previewImage.src = URL.createObjectURL(blob);
            originalImage.src = URL.createObjectURL(blob);
            previewContainer.style.display = 'block';
            uploadArea.style.display = 'none';
            diagnoseBtn.disabled = false;

            stopCamera();
        }, 'image/jpeg', 0.9);
    }

    function resetDiagnosis() {
        // Reset Analyze button
        diagnoseBtn.innerHTML = 'Analyze';
        diagnoseBtn.disabled = false;

        // Clear image preview and upload
        previewContainer.style.display = 'none';
        uploadArea.style.display = 'flex';
        imageUpload.value = '';

        // Hide results
        resultsSection.style.display = 'none';

        // Reset symptoms checkboxes
        document.querySelectorAll('.symptom-checkbox input').forEach(cb => cb.checked = false);

        // Optional: Clear GradCAM
        gradcamImage.src = '';
    }

    function resetImageUpload() {
        previewContainer.style.display = 'none';
        uploadArea.style.display = 'flex';
        diagnoseBtn.disabled = true;
        imageUpload.value = '';
    }

    function logoutUser() {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch(error => {
            console.error('Logout error:', error);
        });
    }
});