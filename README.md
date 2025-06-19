# DermaScan - AI Skin Disease Classification System

DermaScan is a web-based application that uses deep learning to classify skin diseases from images with symptom-weighted predictions. The system provides visual explanations of its diagnoses using GradCAM and generates PDF reports with medical recommendations.

## Key Features

- 🩺 **Multi-class Classification**: Identifies 9 skin conditions (Acne, Eczema, Psoriasis, etc.)
- 🔍 **Symptom-Weighted Predictions**: Combines image analysis with patient-reported symptoms
- 📸 **Multiple Input Methods**: Upload images or capture directly from camera
- 🎨 **Visual Explanations**: GradCAM heatmaps highlight affected areas
- 📄 **PDF Reports**: Automatic report generation with diagnosis details
- 🔐 **User Accounts**: Secure authentication and diagnosis history tracking

## Technology Stack

### Frontend
- HTML, CSS, JavaScript
- Firebase Authentication
- Firebase Firestore (NoSQL database)
- jsPDF (Report generation)
- Chart.js (Visualizations)

### Backend & AI
- Python 3.12+
- Flask
- PyTorch (Deep Learning)
- EfficientNet-B3 (CNN Architecture)
- OpenCV (Image Processing)
- Timm (PyTorch Image Models)

### Deployment
- Visual Studio Code

## Dataset

The model was trained on a curated dataset from Kaggle containing 5,835 images across 9 skin disease categories:

1. Acne
2. Benign tumors
3. Eczema
4. Infestations Bites
5. Lichen
6. Psoriasis
7. Seborrheic Keratoses
8. Vitiligo
9. Warts

The dataset I used is no longer available on Kaggle. Any dataset from kaggle can be taken, but be sure to make the necessary name changes in all of the files.

For those who only want the project, I have uploaded my trained model, you may use that model and skip preprocessing and model training

## Installation

### Prerequisites
- Python 3.12+
- Firebase account
- Visual Studio Code Preferred

### Local Setup

1. Download the repository and keep the structure the same

2. Virtual Environment:

    - Set up a virtual environment in the repo folder 

    - Run pip install -r requirements.txt in cmd after changing into the repo folder

3. **Firebase Configuration**:

    - Create a new Firebase project
     
    - Enable Email/Password authentication in Firebase Console
     
    - Update firebaseConfig in js/diagnosis.js, js/auth.js and js/history.js
      ```javascript
      const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        databaseURL: "YOUR_DATABASE_URL",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
      };

    - Apply the rules given in Firestore rules.txt to firestore rules

4. Dataset Preprocessing:
  
    - Download any kaggle dataset and make necessary changes in all files regardiing names

    - Run preprocess.py if the dataset is not split into train, test, validation

5. Model training:

    - Run model_train.py and train the model and select the best ones from the many epochs

6. Run:

    - Run server.py preferable in visual studio code in dedicated terminal and open the localhost link with the 5000 port
   
## Usuage

- Registration/Login: Create an account or login
- Upload Image: Either upload an image or use camera capture
- Select Symptoms: Check relevant symptoms
- Analyze: Click "Diagnose" button
- View Results: See predictions with confidence scores
- Generate Report: Download PDF with diagnosis details

## Limitations

⚠️ Important: This is a demonstration project only. The system has several limitations:
- Model was trained on a dataset containing watermarks hence it is not very accurate when using other images
- Not medically validated
- Hyperparameter tuning is not done
- Accuracy affected by image quality
- Should not be used for actual medical diagnosis

## Areas of Improvement

- Feel free to use any better CNN models
- Add more skin conditions
- Add multi-language support
- Improve model accuracy with more data
- Dark theme

# License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
