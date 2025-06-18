import os
import random
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
from sklearn.metrics import classification_report
from tqdm import tqdm
import timm
import csv

# Log file path
log_path = "training_log.csv"
with open(log_path, mode='w', newline='') as file:
    writer = csv.writer(file)
    writer.writerow(["Epoch", "Train_Acc", "Val_Acc"])

# Set seed for reproducibility
def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

set_seed()

# Configuration
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BATCH_SIZE = 32
NUM_CLASSES = 9
NUM_EPOCHS = 30        #Can change epoch to any number, it takes about 15-20 minutes per epoch (depends on your system config)
IMG_SIZE = 300
DATA_DIR = "processed_dataset"
MODEL_NAME = "efficientnet_b3"
MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

# Class names
class_names = sorted(os.listdir(os.path.join(DATA_DIR, "train")))

# Transforms
train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

val_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

# Datasets and loaders
train_dataset = datasets.ImageFolder(os.path.join(DATA_DIR, "train"), transform=train_transform)
val_dataset = datasets.ImageFolder(os.path.join(DATA_DIR, "val"), transform=val_transform)
train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

# Class weights to handle imbalance
train_targets = [label for _, label in train_dataset.imgs]
class_counts = np.bincount(train_targets, minlength=NUM_CLASSES)
weights = 1. / class_counts
class_weights = torch.tensor(weights, dtype=torch.float).to(DEVICE)

# Model setup
model = timm.create_model(MODEL_NAME, pretrained=True, num_classes=NUM_CLASSES)
model.to(DEVICE)

# Loss, optimizer, scheduler
criterion = nn.CrossEntropyLoss(weight=class_weights)
optimizer = optim.AdamW(model.parameters(), lr=1e-4)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=NUM_EPOCHS)

# Training loop
for epoch in range(NUM_EPOCHS):
    print(f"\nEpoch [{epoch + 1}/{NUM_EPOCHS}]")
    model.train()
    train_loss, correct = 0.0, 0

    for images, labels in tqdm(train_loader, desc="Training"):
        images, labels = images.to(DEVICE), labels.to(DEVICE)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        train_loss += loss.item() * images.size(0)
        correct += (outputs.argmax(1) == labels).sum().item()

    train_acc = correct / len(train_loader.dataset)
    print(f"Train Acc: {train_acc * 100:.2f}%")

    # Validation
    model.eval()
    val_correct, val_preds, val_targets = 0, [], []
    with torch.no_grad():
        for images, labels in tqdm(val_loader, desc="Validation"):
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            outputs = model(images)
            preds = outputs.argmax(1)
            val_correct += (preds == labels).sum().item()
            val_preds.extend(preds.cpu().numpy())
            val_targets.extend(labels.cpu().numpy())

    val_acc = val_correct / len(val_loader.dataset)
    print(f"Val Acc: {val_acc * 100:.2f}%")

    # Log to CSV
    with open(log_path, mode='a', newline='') as file:
        writer = csv.writer(file)
        writer.writerow([epoch + 1, f"{train_acc:.4f}", f"{val_acc:.4f}"])

    # Save model for this epoch
    epoch_filename = os.path.join(MODEL_DIR, f"{MODEL_NAME}_epoch_{epoch + 1:02d}.pth")
    torch.save(model.state_dict(), epoch_filename)
    print(f"💾 Model saved: {epoch_filename}")

    scheduler.step()

# Final classification report
print("\n=== Final Evaluation ===")
print(classification_report(val_targets, val_preds, target_names=class_names))