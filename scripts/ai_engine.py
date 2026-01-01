import sys
import os
import json
import cv2
import numpy as np
from ultralytics import YOLO
from collections import Counter

# Species to Family mapping
species_to_family = {
    "Aphids": "Hemiptera", "Cicadellidae": "Hemiptera", "Bugs": "Hemiptera", "Whitefly": "Hemiptera",
    "Beetle": "Coleoptera", "FleaBeetle": "Coleoptera", "Weevil": "Coleoptera",
    "Cutworm": "Lepidoptera", "Grasshopper": "Orthoptera", "FieldCricket": "Orthoptera",
    "Thrips": "Thysanoptera", "Mites": "Acari", "RedSpider": "Acari",
    "Earwig": "Other", "Snail": "Other", "Slug": "Other",
    "FruitFlies": "Diptera", "FliesGeneral": "Diptera", "MedFruitFly": "Diptera", "Psychodidae": "Diptera",
    "Ants": "Hymenoptera", "Bees": "Hymenoptera",
}

def process_analysis(img_path, model_path):
    try:
        model = YOLO(model_path)
        img = cv2.imread(img_path)
        if img is None:
            return {"error": "Image not found"}

        # Basic processing (Colab logic simplified for Local)
        # 1. Yellow board detect & crop
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, np.array([15, 70, 70]), np.array([40, 255, 255]))
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            cnt = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(cnt)
            img = img[y:y+h, x:x+w]

        # 2. YOLO Predict (Classification)
        results = model.predict(source=img, imgsz=224, verbose=False)
        
        species_counts = Counter()
        family_counts = Counter()

        for res in results:
            if hasattr(res, 'probs') and res.probs is not None:
                top1_id = int(res.probs.top1)
                conf = float(res.probs.top1conf)
                if conf > 0.25:
                    name = model.names[top1_id]
                    species_counts[name] += 1
                    fam = species_to_family.get(name, "Unknown")
                    family_counts[fam] += 1

        return {
            "total_insects": sum(species_counts.values()),
            "top5_species": [{"name": s, "count": c} for s, c in species_counts.most_common(5)],
            "families": [{"name": f, "count": c} for f, c in family_counts.items()]
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Args: python ai_engine.py <image_path> <model_path>
    result = process_analysis(sys.argv[1], sys.argv[2])
    print(json.dumps(result))