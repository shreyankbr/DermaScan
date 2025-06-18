import os
import random
import uuid
from PIL import Image
from tqdm import tqdm

# Configuration
input_dir = 'SkinDisease'
output_dir = 'processed_dataset'
image_size = (300, 300)
classes = [
    'Acne',
    'Benign_tumors',
    'Eczema',
    'Infestations_Bites',
    'Lichen',
    'Psoriasis',
    'Seborrh_Keratoses',
    'Vitiligo',
    'Warts'
]

train_ratio = 0.7
val_ratio = 0.15
test_ratio = 0.15
valid_exts = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp')
random.seed(42)

# Create output folders
for split in ['train', 'val', 'test']:
    for cls in classes:
        os.makedirs(os.path.join(output_dir, split, cls), exist_ok=True)

log_file = open('error_log.txt', 'w')

for cls in classes:
    cls_path = os.path.join(input_dir, cls)
    all_images = [f for f in os.listdir(cls_path) if f.lower().endswith(valid_exts)]
    random.shuffle(all_images)

    total = len(all_images)
    train_end = int(train_ratio * total)
    val_end = train_end + int(val_ratio * total)

    split_data = {
        'train': all_images[:train_end],
        'val': all_images[train_end:val_end],
        'test': all_images[val_end:]
    }

    for split in ['train', 'val', 'test']:
        for img_file in tqdm(split_data[split], desc=f"{cls} - {split}"):
            try:
                img_path = os.path.join(cls_path, img_file)
                img = Image.open(img_path).convert('RGB')
                img = img.resize(image_size)

                unique_name = f"{cls}_{uuid.uuid4().hex}.jpg"
                out_path = os.path.join(output_dir, split, cls, unique_name)
                img.save(out_path, quality=95, optimize=True)

            except Exception as e:
                log_file.write(f"Failed to process {img_file} in class {cls}: {e}\n")

log_file.close()
print("✅ Dataset processing completed.")