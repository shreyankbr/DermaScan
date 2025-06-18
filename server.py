import torch
from torchvision import transforms
from flask import Flask, request, jsonify, send_from_directory
from PIL import Image
import io
import numpy as np
import timm
from flask_cors import CORS
import os

# === Model setup ===
classes = [
    'Acne', 'Benign_tumors', 'Eczema', 'Infestations_Bites', 'Lichen',
    'Psoriasis', 'Seborrh_Keratoses', 'Vitiligo', 'Warts'
]

symptom_weights = {
    "itching": np.array([0.1, 0.0, 0.3, 0.2, 0.3, 0.1, 0.0, 0.0, 0.0]),
    "bleeding": np.array([0.0, 0.2, 0.0, 0.2, 0.1, 0.3, 0.2, 0.0, 0.0]),
    "scaly_skin": np.array([0.0, 0.0, 0.2, 0.0, 0.2, 0.4, 0.1, 0.0, 0.0]),
    "white_patches": np.array([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0]),
    "sudden_onset": np.array([0.1, 0.2, 0.0, 0.3, 0.1, 0.1, 0.0, 0.0, 0.2]),
}

# === Device setup ===
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model_path = r"efficientnet_b3.pth"  # Specify the path to your model file here
if not os.path.exists(model_path):
    raise FileNotFoundError(f"Model not found at {model_path}. Train the model first or provide a valid path.")

# === Load model architecture + weights ===
model = timm.create_model("efficientnet_b3", pretrained=False, num_classes=len(classes))
model.load_state_dict(torch.load(model_path, map_location=device))
model = model.to(device)
model.eval()

# === Image transforms ===
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# === Flask setup ===
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

@app.route('/')
def serve_home():
    return send_from_directory('.', 'home.html')

@app.route("/predict", methods=["POST"])
def predict():
    try:
        file = request.files["image"]
        image = Image.open(io.BytesIO(file.read())).convert("RGB")
        img_tensor = transform(image).unsqueeze(0).to(device)

        symptoms = request.form
        symptom_vector = (
            symptom_weights["itching"] * int(symptoms.get("itching", 0)) +
            symptom_weights["bleeding"] * int(symptoms.get("bleeding", 0)) +
            symptom_weights["scaly_skin"] * int(symptoms.get("scaly_skin", 0)) +
            symptom_weights["white_patches"] * int(symptoms.get("white_patches", 0)) +
            symptom_weights["sudden_onset"] * int(symptoms.get("sudden_onset", 0))
        )

        with torch.no_grad():
            outputs = model(img_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1).cpu().numpy()[0]

        adjusted_probs = probs + 0.2 * symptom_vector
        adjusted_probs /= adjusted_probs.sum()

        predictions = [
            {"name": classes[i], "prob": round(float(adjusted_probs[i]), 4)}
            for i in range(len(classes))
        ]

        sorted_preds = sorted(predictions, key=lambda x: x["prob"], reverse=True)
        return jsonify({"success": True, "predictions": sorted_preds[:5]})

    except Exception as e:
        print("Error:", e)
        return jsonify({"success": False, "error": str(e)})
    
@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(path):
        return send_from_directory('.', path)
    else:
        return send_from_directory('.', 'home.html')  # Fallback for client-side routing

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)