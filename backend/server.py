import os
import io
import logging
from flask import Flask, request, jsonify, send_from_directory
from PIL import Image
import torch
import torchvision.transforms as transforms
import numpy as np
import timm
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__, static_folder='.', static_url_path='')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure CORS for dermascan.me domain
ALLOWED_ORIGINS = [
    "https://dermascan.me",
    "https://www.dermascan.me",
    "https://api.dermascan.me",
    "https://dermasca.netlify.app"
    "http://localhost:5000",
    "http://localhost:3000"
]

CORS(app, resources={
    r"/predict": {"origins": ALLOWED_ORIGINS},
    r"/warmup": {"origins": "*"},
    r"/health": {"origins": "*"}
})

# App configuration
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB limit
app.config['UPLOAD_EXTENSIONS'] = ['.jpg', '.jpeg', '.png']

# Model configuration
CLASSES = [
    'Acne', 'Benign_tumors', 'Eczema', 'Infestations_Bites', 'Lichen',
    'Psoriasis', 'Seborrh_Keratoses', 'Vitiligo', 'Warts'
]

SYMPTOM_WEIGHTS = {
    "itching": np.array([0.1, 0.0, 0.3, 0.2, 0.3, 0.1, 0.0, 0.0, 0.0]),
    "bleeding": np.array([0.0, 0.2, 0.0, 0.2, 0.1, 0.3, 0.2, 0.0, 0.0]),
    "scaly_skin": np.array([0.0, 0.0, 0.2, 0.0, 0.2, 0.4, 0.1, 0.0, 0.0]),
    "white_patches": np.array([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0]),
    "sudden_onset": np.array([0.1, 0.2, 0.0, 0.3, 0.1, 0.1, 0.0, 0.0, 0.2]),
}

# Initialize model
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_model():
    logger.info("Loading model...")
    model = timm.create_model("efficientnet_b3", pretrained=False, num_classes=len(CLASSES))
    model_path = os.path.join(os.path.dirname(__file__), "models", "efficientnet_b3_epoch_10.pth")
    
    try:
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.eval()
        logger.info("Model loaded successfully")
        return model.to(device)
    except Exception as e:
        logger.error(f"Model loading failed: {str(e)}")
        raise

try:
    model = load_model()
except Exception as e:
    logger.critical(f"Failed to initialize model: {str(e)}")
    exit(1)

# Image transforms
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Validate request
        if 'image' not in request.files:
            logger.warning("No image in request")
            return jsonify({
                "success": False,
                "error": "Please upload an image file",
                "allowed_extensions": app.config['UPLOAD_EXTENSIONS']
            }), 400
        
        file = request.files['image']
        if file.filename == '':
            logger.warning("Empty filename")
            return jsonify({"success": False, "error": "No file selected"}), 400

        # Validate image
        try:
            image = Image.open(io.BytesIO(file.read()))
            if image.format not in ['JPEG', 'PNG']:
                raise ValueError("Invalid image format")
        except Exception as e:
            logger.error(f"Image validation failed: {str(e)}")
            return jsonify({
                "success": False,
                "error": "Invalid image file",
                "details": str(e),
                "allowed_formats": ["JPEG", "PNG"]
            }), 400

        # Process symptoms
        symptoms = {k: int(request.form.get(k, 0)) for k in SYMPTOM_WEIGHTS.keys()}
        symptom_vector = sum(SYMPTOM_WEIGHTS[k] * v for k, v in symptoms.items())

        # Make prediction
        torch.set_num_threads(1)
        with torch.no_grad():
            img_tensor = transform(image).unsqueeze(0).to(device)
            outputs = model(img_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1).cpu().numpy()[0]

        # Adjust probabilities with symptoms
        adjusted_probs = probs + 0.2 * symptom_vector
        adjusted_probs /= adjusted_probs.sum()  # Re-normalize

        # Format results
        predictions = [
            {"name": CLASSES[i], "prob": round(float(adjusted_probs[i]), 4)}
            for i in range(len(CLASSES))
        ]

        logger.info(f"Prediction successful: {predictions[:3]}")
        return jsonify({
            "success": True,
            "predictions": sorted(predictions, key=lambda x: x["prob"], reverse=True)[:5],
            "model_version": "efficientnet_b3_v1"
        })

    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Diagnosis failed",
            "details": str(e)
        }), 500

@app.route('/warmup', methods=['GET'])
def warmup():
    try:
        # Warm up the model with a dummy prediction
        dummy_input = torch.randn(1, 3, 224, 224).to(device)
        _ = model(dummy_input)
        logger.info("Warmup completed successfully")
        return jsonify({
            "status": "ready",
            "device": str(device),
            "model": "efficientnet_b3"
        }), 200
    except Exception as e:
        logger.error(f"Warmup failed: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Check model availability
        dummy_input = torch.randn(1, 3, 224, 224).to(device)
        _ = model(dummy_input)
        
        return jsonify({
            "status": "healthy",
            "model_loaded": True,
            "device": str(device),
            "python_version": os.environ.get('PYTHON_VERSION', '3.9+'),
            "torch_threads": torch.get_num_threads(),
            "ready_for_predictions": True
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "ready_for_predictions": False
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    logger.info(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port)